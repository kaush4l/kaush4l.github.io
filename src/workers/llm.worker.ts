/**
 * LLM Web Worker — Qwen3-0.6B-ONNX (text-only, plug-in upgradeable)
 *
 * Protocol: receives LoadMessage / GenerateMessage, posts ProgressMessage /
 * ReadyMessage / CompleteMessage / ErrorMessage back to main thread.
 *
 * Model ID is passed in the 'load' message so callers can swap the model
 * without rebuilding this worker.
 */
import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
} from '@huggingface/transformers';
import { configureTransformersEnv } from './transformersEnv';

const { localModelPath } = configureTransformersEnv();

let tokenizer: any = null;
let model: any = null;
let currentModelId: string | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireWebGPU(): Promise<void> {
    if (!('gpu' in navigator)) {
        throw new Error('WebGPU is required (navigator.gpu not available).');
    }
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
        throw new Error('WebGPU adapter not found. Use Chrome/Edge 113+.');
    }
}

function postProgress(payload: Record<string, unknown>): void {
    self.postMessage({ type: 'progress', data: payload });
}

function postError(msgOrData: string | { message: string; requestId?: string }): void {
    self.postMessage({ type: 'error', data: msgOrData });
}

// ─── Model loading ────────────────────────────────────────────────────────────

async function loadModel(modelId: string): Promise<void> {
    await requireWebGPU();
    const device = 'webgpu';
    console.log(`[LLM Worker] Loading ${modelId} on ${device}`);

    const progressMap = new Map<string, { loaded: number; total: number }>();

    const progressCallback = (progress: any) => {
        if (progress.file) {
            progressMap.set(progress.file, {
                loaded: progress.loaded ?? 0,
                total: progress.total ?? 0,
            });
            if (progress.status === 'progress') {
                let totalLoaded = 0;
                let totalSize = 0;
                for (const p of progressMap.values()) {
                    totalLoaded += p.loaded;
                    totalSize += p.total;
                }
                if (totalSize > 0) {
                    postProgress({ status: 'progress', progress: (totalLoaded / totalSize) * 100 });
                }
            }
        } else {
            postProgress(progress);
        }
    };

    tokenizer = await AutoTokenizer.from_pretrained(modelId, {
        progress_callback: progressCallback,
    });

    // Qwen3-0.6B is text-only — load directly as CausalLM (no vision fallback)
    model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: {
            embed_tokens: 'fp16',
            decoder_model_merged: 'q4f16',
        },
        device,
        progress_callback: progressCallback,
    });

    currentModelId = modelId;
    console.log(`[LLM Worker] Loaded ${modelId}`);
}

// ─── Generation ───────────────────────────────────────────────────────────────

async function generate(
    messages: Array<{ role: string; content: string }>,
    requestId: string | undefined,
    max_new_tokens = 512,
): Promise<void> {
    if (!tokenizer || !model) throw new Error('Model not loaded');

    // Qwen3 uses standard chat template; enable_thinking=false for voice-first speed
    const prompt: string = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        tokenize: false,
        enable_thinking: false,
    }) as string;

    const inputs = await tokenizer(prompt, { add_special_tokens: false });

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
            self.postMessage({
                type: 'progress',
                data: { status: 'stream', output: text, requestId },
            });
        },
    });

    const outputs = await model.generate({
        ...inputs,
        max_new_tokens,
        do_sample: false,
        repetition_penalty: 1.2,
        streamer,
    });

    const decoded: string[] = tokenizer.batch_decode(
        (outputs as any).slice(null, [inputs.input_ids.dims.at(-1), null]),
        { skip_special_tokens: true }
    );

    const outputText = decoded[0]?.trim() ?? '';
    self.postMessage({
        type: 'complete',
        data: { output: outputText, requestId },
    });
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener('message', async (event: MessageEvent) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            postProgress({ status: 'loading', progress: 0 });
            await loadModel(data.model);
            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            postError(
                `Failed to load LLM model from ${localModelPath}. ` +
                `Ensure model files exist under public/models. Details: ${message}`
            );
        }
    } else if (type === 'generate') {
        try {
            const { messages, requestId, max_new_tokens } = data;
            await generate(messages, requestId, max_new_tokens);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const { requestId } = data;
            postError(requestId ? { message, requestId } : message);
        }
    }
});
