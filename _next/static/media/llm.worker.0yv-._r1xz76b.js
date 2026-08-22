/**
 * LLM Web Worker — on-device multimodal inference (Gemma-4-E2B by default).
 *
 * Protocol (see workerTypes.ts):
 *   in  { type: 'load',      data: { model } }
 *   in  { type: 'generate',  data: { messages, audio?, requestId } }
 *   in  { type: 'interrupt' }  — halts the in-flight generation
 *   out { type: 'progress' | 'ready' | 'complete' | 'error', data }
 *
 * `messages` is the chat history. `audio`, when present, is a mono 16 kHz
 * Float32Array attached to the latest user turn so the model can transcribe and
 * answer it in a single pass.
 *
 * SECURITY: retrieved/transcribed content is DATA, never instructions — it is
 * only ever fed back to the model as user content, never executed.
 */
import {
    AutoProcessor,
    Gemma4ForConditionalGeneration,
    InterruptableStoppingCriteria,
    TextStreamer,
} from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

/**
 * Headroom for a reasoning pass plus the answer it feeds. Synthesis turns emit
 * a `[[think]]…[[/think]]` block the reader never sees (parsed out in
 * `useChatAI`), so the visible answer starts a few hundred tokens in; at 512 a
 * deliberated answer was being truncated before it began. Lookup turns skip the
 * block entirely and never approach this ceiling.
 */
const MAX_NEW_TOKENS = 768;

let model = null;
let processor = null;
let device = null;
/** Stopping criteria of the in-flight generation, so it can be interrupted. */
let activeStopper = null;

// ─── Loading ──────────────────────────────────────────────────────────────

/** Choose the best execution device once. WebGPU when usable, else wasm. */
async function pickDevice() {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) return 'webgpu';
        } catch {
            /* WebGPU present but unusable — fall through to wasm */
        }
    }
    return 'wasm';
}

/** Collapse per-file download progress into one 0-100 percentage. */
function progressAggregator(report) {
    const files = new Map();
    return (p) => {
        if (!p) return;
        if (p.file && (p.status === 'progress' || p.status === 'done')) {
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
            let loaded = 0;
            let total = 0;
            for (const f of files.values()) {
                loaded += f.loaded;
                total += f.total;
            }
            if (total > 0) report({ status: 'progress', progress: (loaded / total) * 100 });
        } else {
            report(p);
        }
    };
}

async function load(modelId, report) {
    device = await pickDevice();
    console.log(`[LLM Worker] Loading ${modelId} on ${device}`);
    const onProgress = progressAggregator(report);

    processor = await AutoProcessor.from_pretrained(modelId, { progress_callback: onProgress });

    // q4f16 is the smallest fast path on WebGPU; q4 for the wasm fallback.
    const dtype = device === 'webgpu' ? 'q4f16' : 'q4';
    model = await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
        dtype,
        device,
        progress_callback: onProgress,
    });

    console.log(`[LLM Worker] Ready: ${modelId}`);
}

// ─── Message shaping ────────────────────────────────────────────────────────

/**
 * Fold any system messages into the first user turn. The Gemma chat template
 * has no dedicated system role, so we prepend the system text instead.
 */
function foldSystem(messages) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ ...m }));

    if (!system) return rest;
    const firstUser = rest.find((m) => m.role === 'user');
    if (firstUser) {
        firstUser.content = `${system}\n\n${firstUser.content}`;
    } else {
        rest.unshift({ role: 'user', content: system });
    }
    return rest;
}

/**
 * Attach an audio block to the final user turn (transformers.js multimodal
 * content format). Other turns keep their plain-string content.
 */
function attachAudio(messages) {
    const out = messages.slice();
    for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].role === 'user') {
            out[i] = {
                role: 'user',
                content: [
                    { type: 'audio' },
                    { type: 'text', text: out[i].content || 'Transcribe what I said, then answer it.' },
                ],
            };
            break;
        }
    }
    return out;
}

// ─── Generation ─────────────────────────────────────────────────────────────

async function generate({ messages, audio, requestId }, report) {
    if (!model || !processor) throw new Error('Model not loaded');

    const hasAudio = audio instanceof Float32Array && audio.length > 0;
    const folded = foldSystem(messages);
    const chat = hasAudio ? attachAudio(folded) : folded;

    const prompt = processor.apply_chat_template(chat, { add_generation_prompt: true });

    // processor(text, images, audio, options). Text-only turns can tokenize
    // directly; audio turns must go through the full multimodal processor.
    const inputs = hasAudio
        ? await processor(prompt, null, audio, { add_special_tokens: false })
        : processor.tokenizer(prompt, { add_special_tokens: false });

    const streamer = new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text) => report({ status: 'stream', output: text, requestId }),
    });

    const stopper = new InterruptableStoppingCriteria();
    activeStopper = stopper;

    let outputs;
    try {
        outputs = await model.generate({
            ...inputs,
            max_new_tokens: MAX_NEW_TOKENS,
            do_sample: false,
            repetition_penalty: 1.2,
            stopping_criteria: stopper,
            streamer,
        });
    } finally {
        if (activeStopper === stopper) activeStopper = null;
    }

    const decoded = processor.batch_decode(
        outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
        { skip_special_tokens: true },
    );
    return (decoded[0] ?? '').trim();
}

// ─── Message pump ─────────────────────────────────────────────────────────

self.addEventListener('message', async (event) => {
    const { type, data } = event.data ?? {};
    const post = (t, d) => self.postMessage({ type: t, data: d });

    if (type === 'load') {
        try {
            post('progress', { status: 'loading', progress: 0 });
            await load(data.model, (p) => post('progress', p));
            post('ready');
        } catch (err) {
            const message = err?.message || String(err);
            post('error', `Failed to load ${data?.model} from ${localModelPath} or the HF Hub. ${message}`);
        }
        return;
    }

    if (type === 'interrupt') {
        // Cooperative abort: the criteria stops the decode loop at the next
        // token, `generate` returns its partial output, and the main thread's
        // request-id guard discards the resulting `complete` (D6).
        activeStopper?.interrupt();
        return;
    }

    if (type === 'generate') {
        const requestId = data?.requestId;
        try {
            const output = await generate(data, (p) => post('progress', p));
            post('complete', requestId ? { output, requestId } : output);
        } catch (err) {
            console.error('[LLM Worker] generate failed:', err);
            const message = err?.message || String(err);
            post('error', requestId ? { message, requestId } : message);
        }
    }
});
