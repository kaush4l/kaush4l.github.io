import { AutoProcessor, AutoTokenizer, env, TextStreamer, load_image, AutoModelForCausalLM, AutoModelForImageTextToText } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Define model types to handle different loading/generation logic
type ModelType = 'text-only' | 'vision-language';

let processor: any = null;
let tokenizer: any = null;
let model: any = null;
let currentModelId: string | null = null;
let currentModelType: ModelType = 'vision-language';

async function loadModel(modelId: string, progressCallback: (progress: any) => void) {
    let device: 'webgpu' | 'wasm' = 'wasm';
    if ('gpu' in navigator) {
        try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter) device = 'webgpu';
        } catch (e) {
            console.warn('WebGPU not available, falling back to wasm');
        }
    }

    console.log(`[LLM Worker] Loading ${modelId} on ${device}`);

    const progressMap = new Map();
    const wrappedProgressCallback = (progress: any) => {
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
        // Determine model type - Default to vision-language for all to support camera features
        // The worker will fail back or handle it if specific processing is needed
        currentModelType = 'vision-language';

        processor = await AutoProcessor.from_pretrained(modelId, {
            progress_callback: wrappedProgressCallback,
        });

        // Try loading as Vision model first since user claims both support vision
        try {
            console.log(`[LLM Worker] Attempting to load ${modelId} as AutoModelForImageTextToText`);
            model = await AutoModelForImageTextToText.from_pretrained(modelId, {
                dtype: {
                    embed_tokens: 'fp16',
                    vision_encoder: 'q4',
                    decoder_model_merged: 'q4',
                },
                device,
                progress_callback: wrappedProgressCallback,
            });
            currentModelType = 'vision-language';
        } catch (e) {
            console.warn('[LLM Worker] Failed to load as Vision model, falling back to CausalLM', e);
            // Fallback to text-only
            model = await AutoModelForCausalLM.from_pretrained(modelId, {
                dtype: {
                    embed_tokens: 'fp16',
                    decoder_model_merged: 'q4f16'
                },
                device,
                progress_callback: wrappedProgressCallback,
            });
            currentModelType = 'text-only';

            // Re-load tokenizer/processor appropriately if needed, but AutoProcessor usually handles it.
            // If we are in text-only mode but have a processor, it might be fine.
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
            await loadModel(modelId, (x: any) => {
                self.postMessage({ type: 'progress', data: x });
            });
            self.postMessage({ type: 'ready' });
        } catch (err: any) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } else if (type === 'generate') {
        try {
            if (!processor || !model) throw new Error('Model not loaded');

            const { messages, images = [] } = data;
            let inputs;

            // Handle input processing based on model type
            if (currentModelType === 'text-only') {
                // --- Text Only (Ministral) ---
                console.log('[LLM Worker] Processing text-only generation...');

                const pt = tokenizer || (processor?.tokenizer) || processor;
                // For Ministral/Mistral, system prompt is handled within the chat template
                const prompt = pt.apply_chat_template(messages, {
                    add_generation_prompt: true,
                    tokenize: false,
                });

                console.log('[LLM Worker] Text Prompt:', prompt);
                inputs = await pt(prompt, { add_special_tokens: false });
            } else {
                // --- Vision Language (FastVLM) ---
                const hasImages = images.length > 0;
                const formattedMessages = messages.map((msg: any) => {
                    if (msg.role === 'user' && !msg.content.includes('<image>')) {
                        return { ...msg, content: `<image>${msg.content}` };
                    }
                    return msg;
                });

                const prompt = processor.apply_chat_template(formattedMessages, {
                    add_generation_prompt: true,
                    tokenize: false,
                });

                console.log('[LLM Worker] Vision Prompt:', prompt);

                if (hasImages) {
                    console.log('[LLM Worker] Processing with user image...');
                    const image = await load_image(images[0]);
                    inputs = await processor(image, prompt, { add_special_tokens: false });
                } else {
                    console.log('[LLM Worker] No image provided, using placeholder...');
                    // Only use placeholder for vision-language models
                    const placeholderUrl = 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/bee.jpg';
                    const image = await load_image(placeholderUrl);
                    inputs = await processor(image, prompt, { add_special_tokens: false });
                }
            }


            console.log('[LLM Worker] Inputs ready, starting generation...');

            const pt = tokenizer || (processor?.tokenizer) || processor;
            const streamer = new TextStreamer(pt, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (text: string) => {
                    self.postMessage({ type: 'progress', data: { status: 'stream', output: text } });
                },
            });

            const outputs = await model.generate({
                ...inputs,
                max_new_tokens: 2048,
                do_sample: false,
                repetition_penalty: 1.2,
                streamer,
            });

            const decoded = pt.batch_decode(
                outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
                { skip_special_tokens: true }
            );

            self.postMessage({ type: 'complete', data: decoded[0]?.trim() || '' });
        } catch (err: any) {
            console.error('[LLM Worker] Generation error:', err);
            self.postMessage({ type: 'error', data: err.message });
        }
    }
});
