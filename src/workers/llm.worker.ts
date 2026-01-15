// @ts-nocheck
import { AutoProcessor, AutoTokenizer, TextStreamer, load_image, AutoModelForCausalLM, AutoModelForImageTextToText } from '@huggingface/transformers';
import { configureTransformersEnv, TRANSPARENT_1PX_PNG_DATA_URL } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let processor = null;
let tokenizer = null;
let model = null;
let currentModelId = null;
let currentModelType = 'vision-language';

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
            if (!processor || !model) throw new Error('Model not loaded');

            const { messages, images = [], requestId } = data || {};
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
                const formattedMessages = messages.map((msg) => {
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
                    // Only use placeholder for vision-language models; keep it fully offline.
                    const image = await load_image(TRANSPARENT_1PX_PNG_DATA_URL);
                    inputs = await processor(image, prompt, { add_special_tokens: false });
                }
            }


            console.log('[LLM Worker] Inputs ready, starting generation...');

            const pt = tokenizer || (processor?.tokenizer) || processor;
            const streamer = new TextStreamer(pt, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (text) => {
                    self.postMessage({
                        type: 'progress',
                        data: requestId ? { status: 'stream', output: text, requestId } : { status: 'stream', output: text },
                    });
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
