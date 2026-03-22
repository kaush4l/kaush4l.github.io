/**
 * STT Web Worker — Whisper tiny (plug-in upgradeable)
 * Uses WebGPU when available, falls back to WASM for broad compatibility.
 * Model ID is passed in the 'load' message — swap any ASR model without rebuilding.
 */
import { pipeline } from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let sttPipeline = null;

async function detectDevice() {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) return 'webgpu';
        } catch { /* fall through */ }
    }
    return 'wasm';
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            const modelId = data?.model ?? 'onnx-community/whisper-tiny';
            const device = await detectDevice();
            // fp16 on WebGPU for speed; fp32 on WASM for broad hardware compatibility.
            const dtype = device === 'webgpu'
                ? { encoder_model: 'fp16', decoder_model_merged: 'fp16' }
                : { encoder_model: 'fp32', decoder_model_merged: 'fp32' };

            console.log(`[STT Worker] Loading ${modelId} on ${device}`);
            sttPipeline = await pipeline('automatic-speech-recognition', modelId, {
                device,
                dtype,
                progress_callback: (progress) => {
                    self.postMessage({ type: 'progress', data: progress });
                },
            });

            console.log(`[STT Worker] Loaded ${modelId}`);
            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err?.message || String(err);
            self.postMessage({
                type: 'error',
                data: `Failed to load STT model from ${localModelPath}. Ensure model files exist under public/models. Details: ${message}`,
            });
        }
    } else if (type === 'transcribe') {
        try {
            if (!sttPipeline) {
                throw new Error('Model not loaded. Please load the model first.');
            }

            const requestId = data?.requestId;

            const result = await sttPipeline(data.audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false,
            });

            const text = result.text;
            self.postMessage({
                type: 'transcription',
                data: requestId ? { text, requestId } : text,
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
