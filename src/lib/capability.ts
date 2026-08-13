import manifest from '../../scripts/models.manifest.json';

export type SystemTier = 'Low' | 'Medium' | 'High' | 'Ultra';

export interface CapabilityResult {
    tier: SystemTier;
    details: {
        renderer?: string;
        cores: number;
        memory: number | 'Unknown';
        webgpu: boolean;
        fp16: boolean;
    };
    recommended: {
        llm: string;
    };
}

/**
 * The model record is the manifest record — id and download size travel
 * together, so the number the UI shows can never drift from the model it
 * describes (F3). `bytes` is written by `scripts/download-models.mjs`, which
 * sums the exact files the runtime fetches at the declared dtype from the
 * Hugging Face tree API.
 */
const LLM_MODEL = manifest.models.find((m) => m.role === 'llm') ?? manifest.models[0];

export const MODELS = {
    llm: {
        // Gemma-4-E2B-it — multimodal (text + audio + vision) instruction-tuned
        // model, q4-quantized ONNX. q4f16 on WebGPU, q4 on the wasm fallback.
        default: LLM_MODEL.id,
        /** On-the-wire bytes for a first load, or `null` when unsourced. */
        bytes: (LLM_MODEL.bytes as number | undefined) ?? null,
    },
};

/**
 * Human-readable transfer size. Decimal GB/MB, because that is the unit a
 * data plan is sold in. Returns `null` when there is no sourced number —
 * callers must render nothing rather than a guess.
 */
export function formatBytes(bytes: number | null | undefined): string | null {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
    return `${Math.round(bytes / 1e3)} KB`;
}

export async function checkCapability(): Promise<CapabilityResult> {
    let tier: SystemTier = 'Low';
    let webgpu = false;
    let fp16 = false;
    let renderer = '';

    // Check WebGPU
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
            const gpu = (navigator as any).gpu;
            const adapter = await gpu.requestAdapter();
            if (adapter) {
                webgpu = true;
                // `adapter.info` is the current API; fall back to the legacy
                // async `requestAdapterInfo()` on older browsers.
                const info = (adapter as any).info || (await (adapter as any).requestAdapterInfo?.()) || {};
                renderer = (info as any).description || (info as any).vendor || 'Generic WebGPU';

                // Check FP16 support
                if (adapter.features.has('shader-f16')) {
                    fp16 = true;
                }
            }
        } catch (e) {
            console.warn('WebGPU check failed', e);
        }
    }

    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const memory = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 8 : 8;

    // Determine tier
    if (webgpu) {
        if (memory >= 16 && cores >= 8) tier = 'Ultra';
        else if (memory >= 8 && cores >= 6) tier = 'High';
        else if (memory >= 4) tier = 'Medium';
        else tier = 'Low';
    }

    return {
        tier,
        details: {
            renderer,
            cores,
            memory: typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? memory : 'Unknown',
            webgpu,
            fp16,
        },
        recommended: {
            llm: MODELS.llm.default,
        },
    };
}
