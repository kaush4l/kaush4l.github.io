// @ts-nocheck
import {
    AutoTokenizer,
    TextStreamer,
    AutoModelForCausalLM,
    AutoModelForImageTextToText,
} from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let tokenizer = null;
let model = null;
let currentModelId = null;
let currentModelKind = 'text-only';

async function requireWebGPU() {
    if (!navigator.gpu) {
        throw new Error('WebGPU is required (navigator.gpu not available).');
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('WebGPU is required (no adapter available).');
    }
}

async function loadModel(modelId, progressCallback) {
    await requireWebGPU();
    const device = 'webgpu';

    console.log(`[LLM Worker] Loading ${modelId} on ${device}`);

    const progressMap = new Map();
    const wrappedProgressCallback = (progress) => {
        if (progress.file) {
            progressMap.set(progress.file, progress);
            if (progress.status === 'progress') {
                let totalLoaded = 0;
                let totalSize = 0;
                for (const p of progressMap.values()) {
                    if (p.loaded && p.total) {
                        totalLoaded += p.loaded;
                        totalSize += p.total;
                    }
                }
                if (totalSize > 0) {
                    progressCallback({ status: 'progress', progress: (totalLoaded / totalSize) * 100 });
                }
            }
        } else {
            progressCallback(progress);
        }
    };

    try {
        // Text-only: AMA is a chat experience and the shipped model is a text LLM.
        // Loading it as a vision-language model can succeed but then fail at generation time.
        tokenizer = await AutoTokenizer.from_pretrained(modelId, {
            progress_callback: wrappedProgressCallback,
        });

        try {
            model = await AutoModelForCausalLM.from_pretrained(modelId, {
                dtype: {
                    embed_tokens: 'fp16',
                    decoder_model_merged: 'q4f16',
                },
                device,
                progress_callback: wrappedProgressCallback,
            });
            currentModelKind = 'text-only';
        } catch (e) {
            // e.g. mistralai/Ministral-3-3B-Instruct-2512-ONNX reports `model_type: mistral3`
            // which is implemented as conditional generation in transformers.js.
            if (e?.message?.includes('Unsupported model type')) {
                model = await AutoModelForImageTextToText.from_pretrained(modelId, {
                    dtype: {
                        embed_tokens: 'fp16',
                        vision_encoder: 'q4',
                        decoder_model_merged: 'q4',
                    },
                    device,
                    progress_callback: wrappedProgressCallback,
                });
                currentModelKind = 'conditional';
            } else {
                throw e;
            }
        }

        currentModelId = modelId;
        console.log(`[LLM Worker] Successfully loaded ${modelId}`);
    } catch (err) {
        console.error(`[LLM Worker] Failed to load model ${modelId}:`, err);
        throw err;
    }
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
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

            const prompt = tokenizer.apply_chat_template(messages, {
                add_generation_prompt: true,
                tokenize: false,
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
