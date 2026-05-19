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

export const MODELS = {
    llm: {
        // Gemma-4-E2B-it — 2B parameter instruction-tuned LLM, ONNX-q4f16 for WebGPU
        default: 'onnx-community/gemma-4-E2B-it-ONNX',
    },
};

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
                const info = await adapter.requestAdapterInfo?.() || {};
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
