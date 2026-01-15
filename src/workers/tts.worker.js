// @ts-nocheck
import { AutoTokenizer, VitsModel } from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let tokenizer = null;
let model = null;
let currentModelId = null;

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_SPEAKER = 'Lily';

async function requireWebGPU() {
    if (!navigator.gpu) {
        throw new Error('WebGPU is required (navigator.gpu not available).');
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('WebGPU is required (no adapter available).');
    }
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            await requireWebGPU();

            const modelId = data?.model || 'Xenova/mms-tts-eng';

            // Even in WebGPU-capable browsers, some VITS ONNX graphs currently hit
            // unsupported WebGPU kernel dtypes (e.g. GatherND + int64). The WASM
            // backend is more broadly compatible.
            const device = 'wasm';

            // NOTE: We intentionally avoid `pipeline('text-to-speech', ...)` here.
            // Some TTS models (including certain VITS exports) may not ship a
            // `preprocessor_config.json`, and the pipeline tries to load a processor.
            // Loading VITS directly only requires tokenizer + model assets.
            tokenizer = await AutoTokenizer.from_pretrained(modelId, {
                progress_callback: (p) => self.postMessage({ type: 'progress', data: p }),
            });

            model = await VitsModel.from_pretrained(modelId, {
                device,
                progress_callback: (p) => self.postMessage({ type: 'progress', data: p }),
            });

            currentModelId = modelId;

            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err?.message || String(err);
            self.postMessage({
                type: 'error',
                data: `Failed to load TTS model from ${localModelPath}. Ensure model files exist under public/models. Details: ${message}`,
            });
        }
    } else if (type === 'synthesize') {
        try {
            if (!tokenizer || !model) {
                throw new Error('TTS model not loaded');
            }

            const requestId = data?.requestId;

            const language = data?.language || DEFAULT_LANGUAGE;
            const speaker = data?.speaker || DEFAULT_SPEAKER;

            const inputs = tokenizer(data.text);
            const output = await model(inputs);
            const audioData = output?.waveform?.data ?? output?.waveform ?? output;
            const samplingRate = model?.config?.sampling_rate ?? 16000;

            self.postMessage({
                type: 'complete',
                data: {
                    audio: audioData,
                    sampling_rate: samplingRate,
                    model: currentModelId,
                    language,
                    speaker,
                    ...(requestId ? { requestId } : {}),
                },
            });
        } catch (err) {
            const message = err?.message || String(err);
            const requestId = data?.requestId;
            self.postMessage({
                type: 'error',
                data: requestId ? { message, requestId } : message,
            });
        }
    }
});
