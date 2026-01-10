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
        stt: string;
        tts: string;
        llm: string;
    };
}

export const MODELS = {
    stt: {
        default: 'Xenova/whisper-tiny.en',
    },
    tts: {
        default: 'Xenova/mms-tts-eng',
    },
    llm: {
        default: 'mistralai/Ministral-3-3B-Instruct-2512-ONNX',
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

    const useHighPerf = ['High', 'Ultra'].includes(tier);

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
            stt: MODELS.stt.default,
            tts: MODELS.tts.default,
            llm: MODELS.llm.default,
        },
    };
}
