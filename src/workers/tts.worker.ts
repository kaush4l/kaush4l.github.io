import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let synthesizer: any = null;

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            const modelId = data.model || 'Xenova/mms-tts-eng';

            // Determine device (WASM is safer for this model currently)
            let device: 'webgpu' | 'wasm' = 'wasm';

            // WebGPU is disabled by default for this model due to 'GatherND' data type issues
            /*
            try {
                if ('gpu' in navigator) {
                    const adapter = await (navigator as any).gpu.requestAdapter();
                    if (adapter) device = 'webgpu';
                }
            } catch (e) {
                console.warn('WebGPU check failed, defaulting to wasm', e);
            }
            */

            synthesizer = await pipeline('text-to-speech', modelId, {
                device,
                progress_callback: (p: any) => {
                    self.postMessage({ type: 'progress', data: p });
                },
            });

            self.postMessage({ type: 'ready' });
        } catch (err: any) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } else if (type === 'synthesize') {
        try {
            if (!synthesizer) {
                throw new Error('Pipeline not loaded');
            }

            const output = await synthesizer(data.text);

            // Convert to audio buffer
            // MMS-TTS output via pipeline is usually { audio: Float32Array, sampling_rate: number }
            const audioData = output.audio;

            self.postMessage({ type: 'complete', data: audioData });
        } catch (err: any) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
});
