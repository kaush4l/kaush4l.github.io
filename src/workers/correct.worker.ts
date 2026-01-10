import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let correctionPipeline: any = null;

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            // Determine device
            let device: 'webgpu' | 'wasm' = 'wasm';
            if ('gpu' in navigator) {
                try {
                    const adapter = await (navigator as any).gpu.requestAdapter();
                    if (adapter) device = 'webgpu';
                } catch (e) {
                    console.warn('WebGPU not available');
                }
            }

            // Use a small model for text correction
            correctionPipeline = await pipeline('text2text-generation', data.model || 'onnx-community/flan-t5-small', {
                device,
                dtype: 'q8',
                progress_callback: (progress: any) => {
                    self.postMessage({ type: 'progress', data: progress });
                },
            });

            self.postMessage({ type: 'ready' });
        } catch (err: any) {
            self.postMessage({ type: 'error', data: err.message });
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
        } catch (err: any) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
});
