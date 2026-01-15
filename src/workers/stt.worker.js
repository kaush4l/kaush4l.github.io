// @ts-nocheck
import { pipeline } from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let sttPipeline = null;

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
            const device = 'webgpu';

            const modelId = data?.model || 'Xenova/whisper-tiny.en';

            sttPipeline = await pipeline('automatic-speech-recognition', modelId, {
                device,
                dtype: 'fp32',
                progress_callback: (progress) => {
                    self.postMessage({ type: 'progress', data: progress });
                },
            });

            self.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('STT load error:', err);
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
            console.error('Transcription error:', err);
            const message = err?.message || String(err);
            const requestId = data?.requestId;
            self.postMessage({
                type: 'error',
                data: requestId ? { message, requestId } : message,
            });
        }
    }
});
