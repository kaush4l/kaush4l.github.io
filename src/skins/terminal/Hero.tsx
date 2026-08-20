'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { openChat } from '@/lib/chatBridge';
import { useModelContext } from '@/context/ModelContext';
import {
    onReducedMotionChange,
    prefersReducedMotion,
    runWhileVisible,
} from '@/lib/motion';
import type { HeroProps } from '@/components/Hero';

/**
 * TERMINAL — the fold.
 *
 * ── The premise ─────────────────────────────────────────────────────────────
 * This is the least metaphorical of the four skins, because the subject is
 * genuinely an engineer who ships production systems and this page genuinely
 * runs a multimodal model on the visitor's own GPU. So the fold is not a
 * *drawing* of a terminal — it is an instrument panel, and every number on it
 * is measured from the machine the visitor is holding:
 *
 *   THREADS   navigator.hardwareConcurrency
 *   MEMORY    navigator.deviceMemory (Chromium only; "n/a" elsewhere — never a
 *             guess)
 *   BACKEND   webgpu / wasm, from the presence of `navigator.gpu`
 *   ADAPTER   the real GPUAdapter vendor + architecture, when the browser
 *             exposes `adapter.info`
 *   FCP       the visitor's own first-contentful-paint, from PerformanceObserver
 *   CORPUS    the actual résumé corpus this page hands the model — doc count
 *             and byte count, straight off `ModelContext`
 *   MODEL     the real load/ready/generate state of that model
 *   FRAME     a live trace of the visitor's own frame time
 *
 * Nothing here is simulated, and where a value is not available the readout
 * says so rather than inventing one. A fabricated counter is the single mistake
 * this audience catches instantly, and it would invalidate everything else on
 * the page.
 *
 * ── The frame-time trace is the thesis ──────────────────────────────────────
 * It is drawn to Tufte's sparkline spec — word-sized, a grey reference band for
 * the normal range (the 16.7ms 60fps budget), a coloured endpoint dot and the
 * current value at the right end, low line/ground contrast so it does not shout.
 * And it is the one element that makes the skin's argument literally: press
 * "Ask the assistant", four gigabytes of weights start streaming into the tab,
 * and the trace rises. The page is a system under load, and the reader is
 * watching their own machine take it.
 *   source: https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/
 *
 * ── The performance contract ────────────────────────────────────────────────
 * ONE rAF loop, owned by `runWhileVisible`, and it is the sole writer of every
 * live value. It samples frame time each frame, and only every 250ms does it
 * touch the DOM (eight `textContent` writes into fixed-width `ch` boxes, plus
 * one canvas redraw). React never re-renders the live fields: they are rendered
 * as ref'd spans whose children React does not own, so a context update from
 * the model cannot fight the loop for them.
 *
 * Entrance is CSS-only — `opacity`/`transform` with a per-element `--i` stagger
 * capped so the whole fold has landed inside ~600ms. There is no JS timeline,
 * so JS-off and reduced-motion both land on a complete, readable hero.
 */

/** Blank/whitespace-only frontmatter is absent, not an empty line. */
function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/** The glyphs the name resolves out of. Deliberately punctuation, not katakana. */
const SCRAMBLE = '#$%&/\\<>[]{}=+*?!01_—|';

/** Samples held in the trace: 64 at 4Hz ≈ a 16-second window. */
const TRACE_LEN = 64;
/** The 60fps budget, in ms. The reference band's ceiling. */
const BUDGET_MS = 1000 / 60;

/** Just enough of the WebGPU surface to read an adapter's identity. */
interface MinimalGPU {
    requestAdapter(): Promise<{
        info?: { vendor?: string; architecture?: string };
    } | null>;
}

interface Readout {
    key: string;
    label: string;
    /** Static values resolve once; `live` ones are written by the loop. */
    value?: string;
    live?: boolean;
}

/**
 * Split the proof line on its own separator and light the numerals.
 *
 * `proof` is authored as `10 years · Salesforce · … · Kafka pipelines at 10M+
 * events/hour`. Nothing is reworded or reordered here — the tokens are laid out
 * as a manifest and any numeric run inside one is promoted to the accent, which
 * is typographic emphasis rather than a claim.
 */
function proofTokens(proof: string | undefined): string[] {
    if (!proof) return [];
    return proof
        .split('·')
        .map((t) => t.trim())
        .filter(Boolean);
}

/**
 * `String.split` with a CAPTURING pattern interleaves the captures into the
 * result, so the odd indices are exactly the numeric runs. That is why this is
 * an index test rather than a second `RegExp.test` — a `/g` regex carries
 * `lastIndex` between calls and would light every other number.
 */
const NUMERIC = /(\d[\d.,]*\s?[KMBkmb]?\+?)/;

function litNumerals(token: string, keyPrefix: string) {
    return token.split(NUMERIC).map((part, i) =>
        i % 2 === 1 ? (
            <b className="tm-num" key={`${keyPrefix}-${i}`}>
                {part}
            </b>
        ) : (
            <span key={`${keyPrefix}-${i}`}>{part}</span>
        ),
    );
}

/** `title` → the two lines the wordmark sets. The last space is the split. */
function splitName(title: string | undefined): [string, string] {
    const t = text(title);
    if (!t) return ['', ''];
    const at = t.lastIndexOf(' ');
    return at === -1 ? [t, ''] : [t.slice(0, at), t.slice(at + 1)];
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export default function TerminalHero({ about }: HeroProps) {
    const rootRef = useRef<HTMLElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const { llm, modelName, resumeCorpus, llmWorker } = useModelContext();

    const title = text(about?.title);
    const [given, family] = splitName(about?.title);
    const headline = text((about as { headline?: string } | undefined)?.headline);
    const proof = proofTokens(text((about as { proof?: string } | undefined)?.proof));
    const highlights = (((about as { highlights?: string[] } | undefined)?.highlights ?? [])
        .map(text)
        .filter((t): t is string => Boolean(t)));

    /**
     * Host facts, resolved ONCE in an effect.
     *
     * Never in a `useState` initializer: React keeps the server attributes while
     * hydrating and Emotion's inlined classes freeze against them. (This hero is
     * `ssr: false`, so it would survive — but the rule is the rule, and the
     * WebGPU probe is async regardless.)
     */
    const [host, setHost] = useState<Record<string, string>>({});

    useEffect(() => {
        let alive = true;
        const nav = navigator as Navigator & { deviceMemory?: number };

        const next: Record<string, string> = {
            threads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical` : 'n/a',
            memory: nav.deviceMemory ? `${nav.deviceMemory} GB+` : 'not exposed',
            backend: 'gpu' in navigator ? 'webgpu' : 'wasm',
            adapter: 'gpu' in navigator ? 'probing…' : 'cpu only',
            viewport: `${window.innerWidth}×${window.innerHeight} @${
                Math.round((window.devicePixelRatio || 1) * 10) / 10
            }x`,
            fcp: '—',
        };

        // The visitor's own first contentful paint. Real, and already recorded
        // by the time this mounts, so the buffered entry is what we want.
        const fcp = performance
            .getEntriesByType('paint')
            .find((e) => e.name === 'first-contentful-paint');
        if (fcp) next.fcp = `${Math.round(fcp.startTime)} ms`;

        setHost(next);

        // `adapter.info` is Chromium-only and may be empty; anything absent
        // stays honest rather than becoming a plausible-looking string. The
        // shape is declared structurally rather than through `@webgpu/types`,
        // which this project does not depend on.
        const gpu = (navigator as unknown as { gpu?: MinimalGPU }).gpu;
        if (gpu) {
            gpu.requestAdapter()
                .then((adapter) => {
                    if (!alive) return;
                    const info = adapter?.info;
                    const parts = [info?.vendor, info?.architecture].filter(Boolean);
                    setHost((h) => ({
                        ...h,
                        adapter: adapter
                            ? parts.length
                                ? parts.join(' · ')
                                : 'available'
                            : 'unavailable',
                    }));
                })
                .catch(() => {
                    if (alive) setHost((h) => ({ ...h, adapter: 'unavailable' }));
                });
        }

        return () => {
            alive = false;
        };
    }, []);

    /**
     * ── The decode rate. The strongest number available on this page. ───────
     *
     * `ModelContext` already exposes the raw worker (`llmWorker`, "exposed for
     * consumption by Chat Widget"), and `llm.worker.js` builds its `TextStreamer`
     * with `callback_function: (text) => report({ status: 'stream', … })`. So
     * every decoded chunk the model produces posts exactly one message to this
     * tab, as it is produced. Counting those messages against wall time is a
     * genuine measurement of real work — the same standard every other readout
     * on this panel is held to — and it needs no file outside this one.
     *
     * (One `TextStreamer` chunk is one decoded token for this model, which is
     * why the unit is honest as tok/s rather than "chunks/s".)
     *
     * Four properties this deliberately has:
     *
     *   · It is UNAVAILABLE until the first stream message ever arrives. A `0.0`
     *     placeholder is not an absent value, it is a claim that the machine
     *     decoded nothing — and it would be a false one.
     *   · It measures a ~2s ROLLING WINDOW, so it reports what the machine is
     *     doing now rather than an average dragged down by the prefill pause at
     *     the start of the turn.
     *   · It LATCHES when the stream stops. The interesting number is what this
     *     machine does under load; a rate decaying toward zero while the model
     *     sits idle would be misleading in the opposite direction. The tag next
     *     to it says which of the two it is showing.
     *   · It costs NOTHING at rest: there is no timer. The only code that runs
     *     is a message handler, and it only runs because the model is producing
     *     tokens. The listener detaches on unmount and whenever the worker is
     *     replaced.
     *
     * It writes straight to the DOM rather than through state for the same
     * reason the frame readout does — a `setState` per token would re-render the
     * fold dozens of times a second — and it is deliberately NOT gated on
     * reduced motion. A number is information; only the trace beside it is
     * animation, and stillness never subtracts content.
     */
    useEffect(() => {
        if (!llmWorker) return;

        const root = rootRef.current;
        if (!root) return;
        const valueEl = root.querySelector<HTMLElement>('[data-live="tokrate"]');
        const tagEl = root.querySelector<HTMLElement>('[data-live="tokrate-tag"]');

        /** Timestamps of the stream messages inside the rolling window. */
        let stamps: number[] = [];
        const WINDOW_MS = 2000;
        /** Rate changes faster than the eye resolves; write at most ~8Hz. */
        let lastPaint = 0;
        let everMeasured = false;

        const paint = (rate: number, live: boolean) => {
            if (valueEl) valueEl.textContent = rate.toFixed(1);
            if (tagEl) tagEl.textContent = live ? 'live' : 'last run';
        };

        const latch = () => {
            stamps = [];
            if (everMeasured && tagEl) tagEl.textContent = 'last run';
        };

        const onMessage = (event: MessageEvent) => {
            const { type, data } = event.data ?? {};

            if (type === 'complete' || type === 'error') {
                latch();
                return;
            }
            if (type !== 'progress' || data?.status !== 'stream') return;

            const now = performance.now();
            stamps.push(now);
            const cutoff = now - WINDOW_MS;
            while (stamps.length && stamps[0] < cutoff) stamps.shift();

            // n timestamps bound n-1 intervals. Dividing by n would inflate the
            // rate by a whole token on a short window.
            if (stamps.length < 2) return;
            const span = (stamps[stamps.length - 1] - stamps[0]) / 1000;
            if (span <= 0) return;

            everMeasured = true;
            if (now - lastPaint < 120) return;
            lastPaint = now;
            paint((stamps.length - 1) / span, true);
        };

        llmWorker.addEventListener('message', onMessage);
        return () => {
            llmWorker.removeEventListener('message', onMessage);
            latch();
        };
    }, [llmWorker]);

    /**
     * The model readout, derived from the SAME state the FAB's halo is bound to
     * (`coder.css` reads `data-model-state`). Two channels, one source of truth.
     *
     * `state` also drives the amber: it is the only non-accent hue on the page
     * and it appears only when the model is doing something other than sitting
     * ready — which is a machine state, not a decoration.
     */
    const model = useMemo(() => {
        if (llm.error) return { state: 'error', line: 'load failed', tone: 'warn' };
        if (llm.loading) return { state: 'loading', line: `streaming ${llm.progress}%`, tone: 'warn' };
        if (llm.ready) return { state: 'ready', line: 'resident · on-device', tone: 'ok' };
        return { state: 'idle', line: 'not loaded', tone: 'idle' };
    }, [llm.error, llm.loading, llm.progress, llm.ready]);

    const readouts: Readout[] = [
        { key: 'session', label: 'session', live: true },
        { key: 'threads', label: 'threads', value: host.threads },
        { key: 'memory', label: 'memory', value: host.memory },
        { key: 'backend', label: 'backend', value: host.backend },
        { key: 'adapter', label: 'adapter', value: host.adapter },
        { key: 'fcp', label: 'first paint', value: host.fcp },
        {
            key: 'corpus',
            label: 'corpus',
            value: resumeCorpus
                ? `${resumeCorpus.docs.length} docs · ${(resumeCorpus.totalChars / 1024).toFixed(1)} KiB`
                : 'not mounted',
        },
        { key: 'weights', label: 'weights', value: modelName },
    ];

    // ── The one loop ────────────────────────────────────────────────────────
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let stop: (() => void) | null = null;

        const sessionEl = () => root.querySelector<HTMLElement>('[data-live="session"]');
        const frameEl = () => root.querySelector<HTMLElement>('[data-live="frame"]');
        const chars = Array.from(root.querySelectorAll<HTMLElement>('.tm-char'));

        const start = () => {
            if (stop) return;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d') ?? null;
            const trace: number[] = [];
            let ema = BUDGET_MS;
            let sinceSample = 0;
            let cssW = 0;
            let cssH = 0;

            const sizeCanvas = () => {
                if (!canvas || !ctx) return;
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                cssW = rect.width;
                cssH = rect.height;
                canvas.width = Math.round(cssW * dpr);
                canvas.height = Math.round(cssH * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            };
            sizeCanvas();
            const ro = canvas ? new ResizeObserver(sizeCanvas) : null;
            if (canvas && ro) ro.observe(canvas);

            const styles = getComputedStyle(root);
            const accent = styles.getPropertyValue('--skin-accent').trim() || '#5EBDAB';
            const rule = styles.getPropertyValue('--skin-rule').trim() || 'rgba(230,230,230,0.08)';

            /**
             * Tufte's sparkline, not a decorative squiggle: a grey band for the
             * normal range, a low-contrast line, and the current value carried
             * as a coloured dot at the right end.
             */
            const drawTrace = () => {
                if (!ctx || !cssW || !cssH || trace.length < 2) return;
                ctx.clearRect(0, 0, cssW, cssH);

                const peak = Math.max(BUDGET_MS * 1.6, ...trace);
                const y = (ms: number) => cssH - (ms / peak) * (cssH - 3) - 1.5;
                const x = (i: number) => (i / (TRACE_LEN - 1)) * cssW;

                // Reference band: everything inside the 60fps budget.
                ctx.fillStyle = rule;
                ctx.fillRect(0, y(BUDGET_MS), cssW, cssH - y(BUDGET_MS));

                const offset = TRACE_LEN - trace.length;
                ctx.beginPath();
                trace.forEach((ms, i) => {
                    const px = x(i + offset);
                    const py = y(ms);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;

                // The endpoint. The only lit pixel in the panel.
                const lastX = x(trace.length - 1 + offset);
                const lastY = y(trace[trace.length - 1]);
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
                ctx.fill();
            };

            /**
             * ── Decode: each character resolves out of punctuation, once ────
             *
             * Driven by `performance.now()`, NOT by the loop's delta.
             * `runWhileVisible` clamps its tick to 1/30s so that a restored
             * background tab cannot teleport an integrator — correct for the
             * dust field it was written for, and catastrophic here. Accumulating
             * the clamped delta makes the decode advance in FRAMES: ~0.8s at
             * 60fps, 1.6s at 30, 3.2s at 15. And this page runs ONNX inference
             * on the main thread, so the frame rate collapses exactly while the
             * model is loading — i.e. the name would be longest unreadable at
             * the moment the fold matters most.
             *
             * Two guarantees close it off, because the ONE string on this page
             * that must never be ambiguous is the candidate's name:
             *
             *   · a WALL-CLOCK ceiling at 1.2× the intended duration, checked
             *     inside the tick; and
             *   · a `setTimeout` at the same ceiling, which does not depend on
             *     the loop running at all. `runWhileVisible` is
             *     IntersectionObserver-gated, so scrolling away mid-decode used
             *     to freeze the name mid-scramble until the reader came back.
             *
             * The finished name is the state this fails INTO, from every path.
             */
            const decodeStart = chars.map((_, i) => i * 22);
            const DECODE_MS = 420;
            const DECODE_CEILING = chars.length
                ? (decodeStart[chars.length - 1] + DECODE_MS) * 1.2
                : 0;
            const decodeT0 = performance.now();
            let decodeDone = chars.length === 0;
            let lastSwap = 0;

            const resolveName = () => {
                chars.forEach((el) => {
                    el.textContent = el.dataset.ch ?? '';
                    el.dataset.resolved = '1';
                });
                decodeDone = true;
            };

            // The net that does not need the rAF loop to be running.
            const decodeTimer = window.setTimeout(resolveName, DECODE_CEILING);

            stop = (() => {
                const dispose = runWhileVisible(root, (dt, elapsed) => {
                    // ── frame time ──────────────────────────────────────────
                    const ms = dt * 1000;
                    ema += (ms - ema) * 0.12;

                    // ── decode ──────────────────────────────────────────────
                    if (!decodeDone) {
                        const decodeT = performance.now() - decodeT0;
                        if (decodeT >= DECODE_CEILING) {
                            resolveName();
                        } else {
                            const swap = decodeT - lastSwap > 45;
                            if (swap) lastSwap = decodeT;
                            let remaining = false;
                            chars.forEach((el, i) => {
                                const local = decodeT - decodeStart[i];
                                if (local >= DECODE_MS) {
                                    if (el.dataset.resolved !== '1') {
                                        el.textContent = el.dataset.ch ?? '';
                                        el.dataset.resolved = '1';
                                    }
                                    return;
                                }
                                remaining = true;
                                if (local < 0) {
                                    // A non-breaking space, not a plain one: a
                                    // leading space in an inline-block collapses
                                    // to zero width, and the line would then
                                    // jitter sideways as each character resolved.
                                    el.textContent = '\u00A0';
                                    return;
                                }
                                if (swap) {
                                    el.textContent =
                                        SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
                                }
                            });
                            decodeDone = !remaining;
                        }
                    }

                    // ── DOM, at 4Hz. Not every frame. ───────────────────────
                    sinceSample += ms;
                    if (sinceSample < 250) return;
                    sinceSample = 0;

                    trace.push(ema);
                    if (trace.length > TRACE_LEN) trace.shift();

                    const s = sessionEl();
                    if (s) {
                        const total = Math.floor(elapsed);
                        s.textContent = `t+${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
                    }
                    const f = frameEl();
                    if (f) f.textContent = ema.toFixed(1);

                    drawTrace();
                });
                return () => {
                    dispose();
                    ro?.disconnect();
                    window.clearTimeout(decodeTimer);
                    // Leave the wordmark resolved, never mid-scramble.
                    resolveName();
                };
            })();
        };

        const halt = () => {
            stop?.();
            stop = null;
        };

        /**
         * Reduced motion stills the trace and resolves the name instantly —
         * nothing is HIDDEN, only stopped. The static readouts are unaffected,
         * because they are information rather than animation.
         */
        const apply = (reduced: boolean) => {
            if (reduced) {
                halt();
                chars.forEach((el) => {
                    el.textContent = el.dataset.ch ?? '';
                });
                const s = sessionEl();
                if (s) s.textContent = 'still';
                const f = frameEl();
                if (f) f.textContent = '—';
            } else {
                start();
            }
        };

        apply(prefersReducedMotion());
        const unsubscribe = onReducedMotionChange(apply);

        // `cinema.css` hides `.hc-char` / `[data-hc-rise]` while `data-motion`
        // is stamped, and this hero uses neither — but the attribute is the
        // cinematic hero's to clear, and it is not mounted. Dropping it here
        // keeps the document from carrying a stale pre-paint flag.
        delete document.documentElement.dataset.motion;

        return () => {
            unsubscribe();
            halt();
        };
    }, []);

    /**
     * The wordmark's characters. The FINAL glyph is the rendered child, so a
     * visitor whose loop never runs (reduced motion, JS error, print) reads the
     * name; the loop only ever overwrites it temporarily.
     */
    const nameChars = (line: string, prefix: string) =>
        Array.from(line).map((ch, i) => (
            <span className="tm-char" data-ch={ch} key={`${prefix}-${i}`}>
                {ch}
            </span>
        ));

    let riseIndex = 0;
    const rise = () => ({ '--i': riseIndex++ } as React.CSSProperties);

    return (
        <section ref={rootRef} className="tm-hero hero-section" data-model-state={model.state}>
            <div className="tm-console">
                {/* ── The rail. Chrome about the page, not a résumé claim. ── */}
                <div className="tm-rail no-print" style={rise()}>
                    <span className="tm-rail-path">
                        <span className="tm-rail-host">resume</span>
                        <span className="tm-rail-sep">/</span>
                        <span>layer-00</span>
                        <span className="tm-rail-sep">/</span>
                        <span>identity</span>
                    </span>
                    <span className="tm-rail-spacer" aria-hidden />
                    <span className="tm-rail-state" data-tone={model.tone}>
                        <span className="tm-dot" aria-hidden />
                        model · {model.line}
                    </span>
                </div>

                <div className="tm-body">
                    {/* ── Left: the subject ── */}
                    <div className="tm-main">
                        <h1 className="tm-name" aria-label={title} style={rise()}>
                            <span className="tm-name-line" aria-hidden>
                                {nameChars(given, 'g')}
                            </span>
                            <span className="tm-name-line tm-name-line--2" aria-hidden>
                                {nameChars(family, 'f')}
                            </span>
                        </h1>

                        {headline && (
                            <p className="tm-headline" style={rise()}>
                                {headline}
                            </p>
                        )}

                        {proof.length > 0 && (
                            <ul className="tm-proof" style={rise()}>
                                {proof.map((token, i) => (
                                    <li className="tm-proof-item" key={token}>
                                        <span className="tm-proof-idx" aria-hidden>
                                            {pad2(i)}
                                        </span>
                                        <span className="tm-proof-text">
                                            {litNumerals(token, `p${i}`)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {highlights.length > 0 && (
                            <div className="tm-modules" style={rise()}>
                                <span className="tm-modules-label" aria-hidden>
                                    loaded
                                </span>
                                <ul className="tm-modules-list">
                                    {highlights.map((tag) => (
                                        <li className="tm-module" key={tag}>
                                            {tag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="tm-actions" style={rise()}>
                            <p className="tm-assistant" id="tm-assistant-line">
                                The assistant in the corner answers from a model that loads into
                                this tab and runs on your own GPU. The panel to the right is that
                                machine, reporting itself.
                            </p>
                            <div className="tm-buttons no-print">
                                <button
                                    type="button"
                                    className="tm-btn tm-btn--primary"
                                    onClick={openChat}
                                    aria-describedby="tm-assistant-line"
                                >
                                    <span className="tm-btn-mark" aria-hidden>
                                        ▸
                                    </span>
                                    Ask the assistant
                                </button>
                                <button
                                    type="button"
                                    className="tm-btn"
                                    onClick={() => scrollTo('experience')}
                                >
                                    View experience
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: the instrument panel. Decoration to a reader
                        of the printed résumé, so it does not print. ── */}
                    <aside className="tm-instruments no-print" style={rise()}>
                        <div className="tm-stat">
                            {/* Two numbers, one instrument: how fast this machine
                                DRAWS, and how fast it THINKS. */}
                            <div className="tm-stat-row">
                                <div className="tm-stat-cell">
                                    <div className="tm-stat-head">
                                        <span className="tm-label">frame time</span>
                                        <span className="tm-stat-unit">ms</span>
                                    </div>
                                    <span data-live="frame" className="tm-stat-num">
                                        —
                                    </span>
                                </div>
                                <div className="tm-stat-cell">
                                    <div className="tm-stat-head">
                                        <span className="tm-label">decode</span>
                                        <span className="tm-stat-unit">tok/s</span>
                                    </div>
                                    <span data-live="tokrate" className="tm-stat-num">
                                        —
                                    </span>
                                    {/* Empty until the first token is counted:
                                        an absent measurement says nothing, and
                                        that is the correct thing for it to say. */}
                                    <span className="tm-stat-tag" data-live="tokrate-tag" />
                                </div>
                            </div>
                            <canvas ref={canvasRef} className="tm-trace" aria-hidden />
                            <p className="tm-stat-note">
                                frame time is your machine, sampled 4× a second; the band is
                                the 60fps budget. decode is counted off the model worker as it
                                produces tokens, over a two-second window, and holds the last
                                run&rsquo;s rate between answers.
                            </p>
                        </div>

                        <dl className="tm-readouts">
                            {readouts.map((r) => (
                                <div className="tm-readout" key={r.key}>
                                    <dt className="tm-label">{r.label}</dt>
                                    <dd className="tm-readout-value">
                                        {r.live ? (
                                            <span data-live={r.key}>—</span>
                                        ) : (
                                            r.value ?? '—'
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </aside>
                </div>

                <div className="tm-foot no-print" style={rise()} aria-hidden>
                    <span className="tm-foot-rule" />
                    <span className="tm-label">scroll · layer 01 — experience</span>
                </div>
            </div>
        </section>
    );
}
