import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = false;
env.useBrowserCache = true;
let sttPipeline = null;
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
            // Determine device - prefer WebGPU for faster inference
            let device = 'wasm';
            if ('gpu' in navigator) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) device = 'webgpu';
                } catch (e) {
                    console.warn('WebGPU not available, using WASM');
                }
            }
            // Use the exact Xenova/whisper-tiny.en model as specified
            sttPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                device,
                dtype: device === 'webgpu' ? 'fp32' : 'q8',
                progress_callback: (progress)=>{
                    self.postMessage({
                        type: 'progress',
                        data: progress
                    });
                }
            });
            self.postMessage({
                type: 'ready'
            });
        } catch (err) {
            console.error('STT load error:', err);
            self.postMessage({
                type: 'error',
                data: err.message
            });
        }
    } else if (type === 'transcribe') {
        try {
            if (!sttPipeline) {
                throw new Error('Model not loaded. Please load the model first.');
            }
            // Transcribe the audio data
            const result = await sttPipeline(data.audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false
            });
            self.postMessage({
                type: 'transcription',
                data: result.text
            });
        } catch (err) {
            console.error('Transcription error:', err);
            self.postMessage({
                type: 'error',
                data: err.message
            });
        }
    }
});
