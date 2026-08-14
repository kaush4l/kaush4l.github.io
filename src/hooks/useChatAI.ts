'use client';

/**
 * useChatAI — the conversation with the on-device model.
 *
 * Three things happen here that did not before:
 *
 * 1. RETRIEVAL. The system message is assembled per question by
 *    `src/lib/resumeContext.ts`, not shipped whole on every turn. Prefill is
 *    linear in prompt length and it is the visitor's GPU paying for it.
 *
 * 2. REASONING. The model is asked to think in the open, inside
 *    `[[think]]…[[/think]]`, before answering synthesis questions. The stream is
 *    split here so the reasoning never renders as the answer; it is exposed
 *    separately (`streamingReasoning`, `message.reasoning`) for the widget to
 *    disclose.
 *
 * 3. STATE. The transcript survives a reload, and a long conversation is
 *    windowed — recent turns verbatim, older turns compacted — instead of
 *    growing until it silently overruns the model's context.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModelContext } from '@/context/ModelContext';
import {
    AUDIO_DIRECTIVE,
    buildSystemPrompt,
    classifyQuestion,
    modeDirective,
    REASONING_CLOSE,
    REASONING_OPEN,
    selectContext,
    type QuestionMode,
    type RetrievalStats,
} from '@/lib/resumeContext';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    /**
     * The model's private deliberation for this answer, already separated from
     * `content`. Present only on assistant turns that reasoned. The widget may
     * disclose it; it is never part of the answer body.
     */
    reasoning?: string;
}

function makeRequestId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * sessionStorage, not localStorage, and that is a deliberate choice for *this*
 * product. A résumé conversation belongs to one visit: a hiring manager who
 * comes back next week should meet a clean page, not a stale half-finished
 * interrogation of a candidate they have since interviewed. sessionStorage is
 * also per-tab, so two open tabs do not overwrite each other's transcript, and
 * it evaporates when the tab closes — the questions a recruiter types are their
 * own business and do not deserve to persist on disk. What it does buy is the
 * case that actually happens: a reload, an accidental back-navigation, or a
 * theme toggle mid-conversation no longer throws the conversation away.
 */
const STORAGE_KEY = 'kk:chat:v1';
/** Hard cap on what we write back, so storage can never grow without bound. */
const MAX_PERSISTED_MESSAGES = 40;

function isChatMessage(value: unknown): value is ChatMessage {
    if (!value || typeof value !== 'object') return false;
    const m = value as Record<string, unknown>;
    return (
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
        typeof m.content === 'string' &&
        (m.reasoning === undefined || typeof m.reasoning === 'string')
    );
}

function readPersisted(): ChatMessage[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isChatMessage).slice(-MAX_PERSISTED_MESSAGES);
    } catch {
        /* private mode, quota, or a corrupted payload — start the visit clean */
        return [];
    }
}

function writePersisted(messages: ChatMessage[]) {
    try {
        if (messages.length === 0) sessionStorage.removeItem(STORAGE_KEY);
        else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED_MESSAGES)));
    } catch {
        /* private mode */
    }
}

// ─── Conversation window ────────────────────────────────────────────────────

/** Turns kept word-for-word. Six questions and their answers is a real interview. */
const VERBATIM_MESSAGES = 12;
/** Ceiling on the compacted recap of everything older. */
const RECAP_CHAR_BUDGET = 900;

function clip(text: string, max: number): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Keep the recent turns exactly as they were said and compact everything older
 * into one recap line per exchange. Dropping old turns outright is what makes a
 * long conversation start contradicting itself — "and before that?" stops
 * resolving — so nothing is dropped until the recap itself overflows, and then
 * the oldest exchanges go first.
 */
function windowConversation(messages: ChatMessage[]): { recap: string; recent: ChatMessage[] } {
    if (messages.length <= VERBATIM_MESSAGES) return { recap: '', recent: messages };

    const older = messages.slice(0, messages.length - VERBATIM_MESSAGES);
    const recent = messages.slice(messages.length - VERBATIM_MESSAGES);

    const lines: string[] = [];
    for (let i = 0; i < older.length; i++) {
        const msg = older[i];
        if (msg.role === 'user') {
            const answer = older[i + 1]?.role === 'assistant' ? older[i + 1].content : '';
            lines.push(
                answer
                    ? `They asked: "${clip(msg.content, 110)}" — you answered: ${clip(answer, 150)}`
                    : `They asked: "${clip(msg.content, 110)}"`,
            );
        }
    }

    // Overflow drops the oldest exchanges, never the newest.
    while (lines.length > 1 && lines.join('\n').length > RECAP_CHAR_BUDGET) lines.shift();

    return {
        recap: lines.length
            ? `EARLIER IN THIS CONVERSATION (compacted — the exact wording is gone, the substance is not):\n${lines.join('\n')}`
            : '',
        recent,
    };
}

// ─── Reasoning stream parsing ───────────────────────────────────────────────

export interface ParsedStream {
    reasoning: string;
    answer: string;
    /** True while a reasoning block is open and unclosed. */
    thinking: boolean;
}

/**
 * How many trailing characters of `s` could be the beginning of `delim`. This is
 * what keeps a delimiter that arrives split across token boundaries — `[[th`
 * then `ink]]` — from flashing into the visible answer for one 75ms frame.
 */
function danglingPrefix(s: string, delim: string): number {
    const max = Math.min(s.length, delim.length - 1);
    for (let n = max; n > 0; n--) {
        if (delim.startsWith(s.slice(s.length - n))) return n;
    }
    return 0;
}

/**
 * Split raw model output into private reasoning and the visible answer.
 *
 * Cheap enough (the strings are a few kB) to re-run from scratch on every flush,
 * which is what makes it correct: there is no incremental parser state to get
 * out of sync with an interrupt, a retry, or a request-id mismatch.
 *
 * Handles, in order: a block that never opens (everything is the answer), a
 * delimiter split across tokens (held back until it resolves), a block that
 * never closes (everything is reasoning, answer stays empty), and stray prose
 * emitted before the opening delimiter (kept, as answer text).
 */
export function parseStream(raw: string): ParsedStream {
    const openIdx = raw.indexOf(REASONING_OPEN);

    if (openIdx === -1) {
        const held = danglingPrefix(raw, REASONING_OPEN);
        return { reasoning: '', answer: raw.slice(0, raw.length - held), thinking: false };
    }

    const before = raw.slice(0, openIdx);
    const rest = raw.slice(openIdx + REASONING_OPEN.length);
    const closeIdx = rest.indexOf(REASONING_CLOSE);

    if (closeIdx === -1) {
        const held = danglingPrefix(rest, REASONING_CLOSE);
        return { reasoning: rest.slice(0, rest.length - held), answer: before, thinking: true };
    }

    return {
        reasoning: rest.slice(0, closeIdx),
        answer: before + rest.slice(closeIdx + REASONING_CLOSE.length),
        thinking: false,
    };
}

/**
 * Turn whatever the model produced into a message that is never an empty
 * bubble. If the model spent its whole budget reasoning and never emitted an
 * answer, the reasoning is promoted — the reader gets the substance rather than
 * a blank turn, which is the failure mode this exists to prevent.
 */
function finalizeMessage(raw: string): ChatMessage | null {
    const { reasoning, answer } = parseStream(raw);
    let content = answer.trim();
    let think = reasoning.trim();

    if (!content && think) {
        content = think;
        think = '';
    }
    // Belt and braces: a delimiter the model mangled must never reach the bubble.
    content = content
        .split(REASONING_OPEN).join('')
        .split(REASONING_CLOSE).join('')
        .trim();

    if (!content) return null;
    return think ? { role: 'assistant', content, reasoning: think } : { role: 'assistant', content };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseChatAIOptions {
    /** Automatically start loading models as soon as the hook mounts (default: false) */
    autoLoad?: boolean;
}

export interface UseChatAIReturn {
    // State
    messages: ChatMessage[];
    streamingContent: string;
    /** The reasoning tokens of the in-flight turn, live. Never the answer body. */
    streamingReasoning: string;
    /** True while the model is inside an unclosed reasoning block. */
    thinking: boolean;
    busy: boolean;
    input: string;
    /** Retrieval diagnostics for the most recent question (dev/debug affordance). */
    lastRetrieval: (RetrievalStats & { mode: QuestionMode }) | null;

    // Setters
    setInput: (v: string) => void;

    // Actions
    sendText: (text: string) => Promise<void>;
    sendAudio: (audio: Float32Array) => Promise<void>;
    /** Abort the in-flight generation and re-enable the composer (D6). */
    stopGeneration: () => void;
    clearChat: () => void;

    // Scroll refs
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    shouldAutoScrollRef: React.RefObject<boolean>;
}

export function useChatAI(opts: UseChatAIOptions = {}): UseChatAIReturn {
    const { autoLoad = false } = opts;
    const { llm, llmWorker, autoLoadAll, resumeCorpus } = useModelContext();

    // ── Core State ────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingReasoning, setStreamingReasoning] = useState('');
    const [thinking, setThinking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [lastRetrieval, setLastRetrieval] = useState<(RetrievalStats & { mode: QuestionMode }) | null>(null);

    // ── Internal Refs ─────────────────────────────────────────────────────────
    const streamingBufferRef = useRef('');
    const streamingFlushTimerRef = useRef<number | null>(null);
    const activeLlmRequestIdRef = useRef<string | null>(null);

    // Scroll
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);

    // ── Restore the transcript ────────────────────────────────────────────────
    //
    // Deliberately in an effect rather than a lazy `useState` initialiser: this
    // is a static export, so the server-rendered HTML has an empty transcript.
    // Reading storage during the first render would make the client's first
    // render disagree with it and blow up hydration. The restore lands on the
    // commit after, which is a frame the reader never sees.
    const [restored, setRestored] = useState(false);
    useEffect(() => {
        const saved = readPersisted();
        if (saved.length) setMessages(saved);
        setRestored(true);
    }, []);

    // ── Persist the transcript ────────────────────────────────────────────────
    // Gated on `restored` so the empty initial state can never overwrite a saved
    // conversation before the restore has landed.
    useEffect(() => {
        if (!restored) return;
        writePersisted(messages);
    }, [messages, restored]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (streamingFlushTimerRef.current) clearTimeout(streamingFlushTimerRef.current);
        };
    }, []);

    // ── Auto-load ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoLoad) return;
        if (!llm.ready && !(llm.loading)) {
            void autoLoadAll().catch(() => {});
        }
    }, [autoLoad]); // intentionally stable list

    // ── LLM Worker Handler ────────────────────────────────────────────────────
    useEffect(() => {
        if (!llmWorker) return;

        const scheduleFlush = () => {
            if (streamingFlushTimerRef.current) return;
            streamingFlushTimerRef.current = window.setTimeout(() => {
                streamingFlushTimerRef.current = null;
                // One parse per flush, not per token: the 75ms cadence is what
                // keeps the main thread free while the worker decodes.
                const parsed = parseStream(streamingBufferRef.current);
                setStreamingContent(parsed.answer);
                setStreamingReasoning(parsed.reasoning);
                setThinking(parsed.thinking);
                if (shouldAutoScrollRef.current) {
                    const el = scrollContainerRef.current;
                    el?.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
                }
            }, 75);
        };

        const resetStream = () => {
            streamingBufferRef.current = '';
            setStreamingContent('');
            setStreamingReasoning('');
            setThinking(false);
        };

        const handler = (e: MessageEvent) => {
            const { type, data } = e.data ?? {};

            if (type === 'progress' && data?.status === 'stream') {
                if (data?.requestId && data.requestId !== activeLlmRequestIdRef.current) return;
                const token = data?.output ?? '';
                streamingBufferRef.current += token;
                scheduleFlush();
                return;
            }

            if (type === 'complete') {
                const payload = typeof data === 'string' ? { output: data } : data;
                if (payload?.requestId && payload.requestId !== activeLlmRequestIdRef.current) return;

                if (streamingFlushTimerRef.current) {
                    clearTimeout(streamingFlushTimerRef.current);
                    streamingFlushTimerRef.current = null;
                }
                const finalRaw =
                    (typeof payload?.output === 'string' ? payload.output : '') ||
                    streamingBufferRef.current;

                const message = finalizeMessage(finalRaw);
                if (message) setMessages((prev) => [...prev, message]);
                resetStream();
                setBusy(false);
                activeLlmRequestIdRef.current = null;
                return;
            }

            if (type === 'error') {
                const payload = typeof data === 'string' ? { message: data } : data;
                if (payload?.requestId && payload.requestId !== activeLlmRequestIdRef.current) return;
                const msg = payload?.message ?? 'Unknown error';
                setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
                resetStream();
                setBusy(false);
                activeLlmRequestIdRef.current = null;
            }
        };

        llmWorker.addEventListener('message', handler);
        return () => {
            llmWorker.removeEventListener('message', handler);
            if (streamingFlushTimerRef.current) clearTimeout(streamingFlushTimerRef.current);
        };
    }, [llmWorker]);

    // ── Auto-scroll when messages change ─────────────────────────────────────
    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        const el = scrollContainerRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, [messages.length]);

    /**
     * Assemble the wire messages for one turn: retrieved résumé context, the
     * compacted recap of anything older than the window, the recent turns
     * verbatim, and the question itself carrying its per-turn mode directive.
     *
     * The directive rides on the *wire* copy of the user turn only — the stored
     * message, and therefore the bubble the reader sees, stays clean.
     *
     * Note on the worker: `foldSystem` merges every system message into the
     * first user turn, because Gemma's template has no system role. That fold is
     * plain string concatenation, so the `[[think]]` delimiters survive it
     * untouched, and because the context is rebuilt per question rather than
     * accumulated in the history, a long conversation never re-folds a second
     * copy of the résumé into itself.
     */
    const buildTurn = useCallback((
        question: string,
        mode: QuestionMode,
        directive: string,
        priorMessages: ChatMessage[],
        turnOpts: { assumeMatched?: boolean } = {},
    ) => {
        const { recap, recent } = windowConversation(priorMessages);

        // The mode picks the budget as well as the reasoning behaviour: a
        // lookup gets a slice of the résumé, a synthesis question gets all of it.
        const retrieval = resumeCorpus
            ? selectContext(resumeCorpus, question, { mode, history: recent })
            : null;

        const system = retrieval
            ? buildSystemPrompt(retrieval.text, {
                owner: resumeCorpus?.owner,
                matched: turnOpts.assumeMatched ? true : retrieval.stats.matched,
            })
            // No corpus (a misconfigured build) — say nothing rather than invent.
            : 'You are an on-device résumé assistant. The résumé material failed to load, so answer every question with: "I can\'t reach this résumé\'s content right now."';

        const wire: ChatMessage[] = [{ role: 'system', content: system }];
        if (recap) wire.push({ role: 'system', content: recap });
        // Reasoning is stripped from history: past deliberation is noise in the
        // next turn's prefill, and re-showing it teaches the model to pad.
        for (const m of recent) wire.push({ role: m.role, content: m.content });
        wire.push({ role: 'user', content: directive ? `${question}\n\n${directive}` : question });

        return { wire, retrieval };
    }, [resumeCorpus]);

    // ── Send Text ─────────────────────────────────────────────────────────────
    const sendText = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        if (!llm.ready || !llmWorker) {
            await autoLoadAll().catch(() => {});
            if (!llmWorker) return;
        }

        const llmRequestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = llmRequestId;

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setBusy(true);
        setStreamingContent('');
        setStreamingReasoning('');
        setThinking(false);
        streamingBufferRef.current = '';

        const mode = classifyQuestion(trimmed);
        const { wire, retrieval } = buildTurn(trimmed, mode, modeDirective(mode), messages);
        if (retrieval) setLastRetrieval({ ...retrieval.stats, mode });

        llmWorker.postMessage({ type: 'generate', data: { messages: wire, requestId: llmRequestId } });
    }, [autoLoadAll, buildTurn, busy, llm.ready, llmWorker, messages]);

    // ── Send Audio (multimodal voice input) ─────────────────────────────────
    const sendAudio = useCallback(async (audio: Float32Array) => {
        if (busy || audio.length === 0) return;
        if (!llm.ready || !llmWorker) {
            await autoLoadAll().catch(() => {});
            if (!llmWorker) return;
        }

        const llmRequestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = llmRequestId;

        // The bubble is a placeholder; the model receives the raw audio and is
        // instructed (worker-side) to transcribe and answer it.
        setMessages((prev) => [...prev, { role: 'user', content: '🎤 Voice message' }]);
        setBusy(true);
        setStreamingContent('');
        setStreamingReasoning('');
        setThinking(false);
        streamingBufferRef.current = '';

        // The question is in the audio, so there is nothing to score against.
        // Retrieval falls back to the conversation so far, which is the right
        // answer for a follow-up and a harmless one for a first question — at
        // the default budget the whole résumé ships regardless.
        // `assumeMatched`: there is no text to have failed to match, so the
        // "nothing matched your wording" note would be a lie on a voice turn.
        const { wire, retrieval } = buildTurn('', 'synthesis', AUDIO_DIRECTIVE, messages, { assumeMatched: true });
        if (retrieval) setLastRetrieval({ ...retrieval.stats, mode: 'synthesis' });

        llmWorker.postMessage({
            type: 'generate',
            data: { messages: wire, audio, requestId: llmRequestId },
        });
    }, [autoLoadAll, buildTurn, busy, llm.ready, llmWorker, messages]);

    // ── Stop ──────────────────────────────────────────────────────────────────
    /**
     * Two independent halves, because the worker may be mid-token:
     * 1. tell the worker to interrupt its decode loop, and
     * 2. drop the active request id, so any token or `complete` that still
     *    arrives is discarded by the guards above and the UI recovers even if
     *    the worker never honours the interrupt.
     *
     * Interrupting mid-reasoning is the interesting case: `finalizeMessage`
     * promotes the partial reasoning into the bubble, so stopping a long
     * deliberation leaves the reader with what the model had worked out rather
     * than with nothing at all.
     */
    const stopGeneration = useCallback(() => {
        try {
            llmWorker?.postMessage({ type: 'interrupt' });
        } catch {
            /* worker already gone — the guard below is what actually recovers the UI */
        }
        activeLlmRequestIdRef.current = null;
        if (streamingFlushTimerRef.current) {
            clearTimeout(streamingFlushTimerRef.current);
            streamingFlushTimerRef.current = null;
        }
        const partial = finalizeMessage(streamingBufferRef.current);
        streamingBufferRef.current = '';
        if (partial) setMessages((prev) => [...prev, partial]);
        setStreamingContent('');
        setStreamingReasoning('');
        setThinking(false);
        setBusy(false);
    }, [llmWorker]);

    // ── Clear ─────────────────────────────────────────────────────────────────
    const clearChat = useCallback(() => {
        setMessages([]);
        setStreamingContent('');
        setStreamingReasoning('');
        setThinking(false);
        setInput('');
        setLastRetrieval(null);
        streamingBufferRef.current = '';
        activeLlmRequestIdRef.current = null;
        // Clearing must clear the saved copy too, or a reload resurrects a
        // conversation the reader explicitly threw away.
        writePersisted([]);
    }, []);

    return {
        messages,
        streamingContent,
        streamingReasoning,
        thinking,
        busy,
        input,
        lastRetrieval,
        setInput,
        sendText,
        sendAudio,
        stopGeneration,
        clearChat,
        scrollContainerRef,
        messagesEndRef,
        shouldAutoScrollRef,
    };
}
