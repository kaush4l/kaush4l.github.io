// @ts-nocheck
import { pipeline } from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let correctionPipeline = null;

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            let device = 'wasm';
            if ('gpu' in navigator) {
                try {
                    const adapter = await navigator.gpu?.requestAdapter();
                    if (adapter) device = 'webgpu';
                } catch {
                    // ignore
                }
            }

            correctionPipeline = await pipeline('text2text-generation', data.model || 'onnx-community/flan-t5-small', {
                device,
                dtype: 'q8',
                progress_callback: (progress) => {
                    self.postMessage({ type: 'progress', data: progress });
                },
            });

            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err?.message || String(err);
            self.postMessage({
                type: 'error',
                data: `Failed to load correction model from ${localModelPath}. Ensure model files exist under public/models. Details: ${message}`,
            });
        }
    } else if (type === 'correct') {
        try {
            if (!correctionPipeline) {
                throw new Error('Pipeline not loaded');
            }

            const prompt = `Correct any grammar or spelling errors in this text: "${data.text}"`;
            const result = await correctionPipeline(prompt, {
                max_new_tokens: 128,
            });

            self.postMessage({ type: 'complete', data: result[0].generated_text });
        } catch (err) {
            self.postMessage({ type: 'error', data: err?.message || String(err) });
        }
    }
});
