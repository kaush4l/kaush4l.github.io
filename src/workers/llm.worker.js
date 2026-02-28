/**
 * LLM Web Worker — Qwen3-0.6B-ONNX (text-only, plug-in upgradeable)
 * Model ID is passed in the 'load' message — swap any text-gen model without rebuilding.
 */
import {
    AutoTokenizer,
    TextStreamer,
    AutoModelForCausalLM,
} from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let tokenizer = null;
let model = null;
let currentModelId = null;

async function detectDevice() {
    if (navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) return 'webgpu';
        } catch {
            // fall through
        }
    }
    return 'wasm';
}

async function loadModel(modelId, progressCallback) {
    const device = await detectDevice();
    console.log(`[LLM Worker] Loading ${modelId} on ${device}`);

    const progressMap = new Map();
    const wrappedProgressCallback = (progress) => {
        if (progress.file) {
            progressMap.set(progress.file, { loaded: progress.loaded ?? 0, total: progress.total ?? 0 });
            if (progress.status === 'progress') {
                let tL = 0, tS = 0;
                for (const p of progressMap.values()) { tL += p.loaded; tS += p.total; }
                if (tS > 0) progressCallback({ status: 'progress', progress: (tL / tS) * 100 });
            }
        } else {
            progressCallback(progress);
        }
    };

    tokenizer = await AutoTokenizer.from_pretrained(modelId, {
        progress_callback: wrappedProgressCallback,
    });

    // q4f16: 4-bit weights with fp16 activations — correct dtype for WebGPU (~200 MB).
    // q8: 8-bit fallback for WASM when WebGPU is unavailable (~400 MB, no int4 WASM kernels).
    const dtype = device === 'webgpu' ? 'q4f16' : 'q8';
    model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype,
        device,
        progress_callback: wrappedProgressCallback,
    });

    currentModelId = modelId;
    console.log(`[LLM Worker] Loaded ${modelId}`);
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });
            const modelId = data.model;
            await loadModel(modelId, (x) => {
                self.postMessage({ type: 'progress', data: x });
            });
            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err?.message || String(err);
            self.postMessage({
                type: 'error',
                data: `Failed to load LLM model from ${localModelPath}. Ensure model files exist under public/models. Details: ${message}`,
            });
        }
    } else if (type === 'generate') {
        try {
            if (!tokenizer || !model) throw new Error('Model not loaded');

            const { messages, requestId } = data || {};

            // Qwen3 chat template; enable_thinking=false for voice-first latency
            const prompt = tokenizer.apply_chat_template(messages, {
                add_generation_prompt: true,
                tokenize: false,
                enable_thinking: false,
            });

            const inputs = await tokenizer(prompt, { add_special_tokens: false });

            const streamer = new TextStreamer(tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (text) => {
                    self.postMessage({
                        type: 'progress',
                        data: requestId
                            ? { status: 'stream', output: text, requestId }
                            : { status: 'stream', output: text },
                    });
                },
            });

            const outputs = await model.generate({
                ...inputs,
                max_new_tokens: 384,
                do_sample: false,
                repetition_penalty: 1.2,
                streamer,
            });

            const decoded = tokenizer.batch_decode(
                outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
                { skip_special_tokens: true }
            );

            const outputText = decoded[0]?.trim() || '';
            self.postMessage({
                type: 'complete',
                data: requestId ? { output: outputText, requestId } : outputText,
            });
        } catch (err) {
            console.error('[LLM Worker] Generation error:', err);
            const message = err?.message || String(err);
            const requestId = data?.requestId;
            self.postMessage({
                type: 'error',
                data: requestId ? { message, requestId } : message,
            });
        }
    }
});
