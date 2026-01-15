// @ts-nocheck
import { env } from '@huggingface/transformers';

function inferBasePathFromWorkerLocation() {
    try {
        const path = self.location?.pathname || '';
        const idx = path.indexOf('/_next/');
        if (idx > 0) return path.slice(0, idx);
        return '';
    } catch {
        return '';
    }
}

// Tiny 1x1 transparent PNG (no external fetch required)
export const TRANSPARENT_1PX_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9x0m0AAAAASUVORK5CYII=';

export function configureTransformersEnv() {
    const basePath = inferBasePathFromWorkerLocation();
    const localModelPath = `${basePath}/models`;
    const onnxruntimeAssetPath = `${basePath}/onnxruntime/`;

    // Static/offline requirement: models must be served from /public/models.
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = localModelPath;

    // Cache into IndexedDB/CacheStorage where supported.
    env.useBrowserCache = true;

    // Ensure ONNX Runtime Web assets are loaded locally (no CDN). This is critical for
    // static hosting (GitHub Pages) and for offline requirements.
    if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.wasmPaths = onnxruntimeAssetPath;
        // Avoid requiring cross-origin isolation on GH Pages.
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
    }

    if (env.backends?.onnx?.webgpu) {
        env.backends.onnx.webgpu.powerPreference = 'high-performance';
    }

    return { basePath, localModelPath, onnxruntimeAssetPath };
}
