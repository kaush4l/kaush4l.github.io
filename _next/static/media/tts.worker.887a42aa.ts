import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = false;
env.useBrowserCache = true;
let synthesizer = null;
self.addEventListener('message', async (event)=>{
    const { type, data } = event.data;
    if (type === 'load') {
        try {
            self.postMessage({
                type: 'progress',
                data: {
                    status: 'loading',
                    progress: 0
                }
            });
            const modelId = data.model || 'Xenova/mms-tts-eng';
            // Determine device (WASM is safer for this model currently)
            let device = 'wasm';
            synthesizer = await pipeline('text-to-speech', modelId, {
                device,
                progress_callback: (p)=>{
                    self.postMessage({
                        type: 'progress',
                        data: p
                    });
                }
            });
            self.postMessage({
                type: 'ready'
            });
        } catch (err) {
            self.postMessage({
                type: 'error',
                data: err.message
            });
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
            self.postMessage({
                type: 'complete',
                data: audioData
            });
        } catch (err) {
            self.postMessage({
                type: 'error',
                data: err.message
            });
        }
    }
});
