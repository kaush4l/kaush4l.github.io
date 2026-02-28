/**
 * TTS Web Worker — Supertone/supertonic-2
 *
 * Custom 4-ONNX-model pipeline:
 *   duration_predictor → text_encoder → vector_estimator (flow-matching loop) → vocoder
 *
 * Ported from the official Supertone web SDK:
 *   https://github.com/supertone-inc/supertonic/tree/main/web
 *
 * Memory safety:
 *   - All ORT output tensors are disposed immediately after reading their data.
 *   - Voice-style tensors are JS Float32Array-backed (no WASM heap ownership) and
 *     cached per speaker; they do NOT need disposal.
 *   - Input tensors are disposed in the finally block of runSynthesis.
 */
import * as ort from 'onnxruntime-web';

// ─── ORT WASM bootstrap (must run before any InferenceSession.create) ─────────
(function configureOrt() {
    try {
        const wp  = self.location?.pathname ?? '';
        const idx = wp.indexOf('/_next/');
        const base = idx > 0 ? wp.slice(0, idx) : '';
        ort.env.wasm.wasmPaths  = `${base}/onnxruntime/`;
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy      = false;
    } catch { /* best-effort */ }
})();

// ─── Speaker aliases ──────────────────────────────────────────────────────────
const SPEAKER_MAP = {
    Lily: 'F1',                                        // legacy alias
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5',
    M1: 'M1', M2: 'M2', M3: 'M3', M4: 'M4', M5: 'M5',
};
const DEFAULT_SPEAKER = 'M1';
const DEFAULT_LANG    = 'en';
const DEFAULT_STEPS   = 2;      // 2-step flow matching: ultra-fast + high quality
const DEFAULT_SPEED   = 1.05;

// ─── Model state ──────────────────────────────────────────────────────────────
let dpSession      = null;
let textEncSession = null;
let vecEstSession  = null;
let vocoderSession = null;
let unicodeIndexer = null;  // 65536-entry integer array
let cfgs           = null;  // tts.json
let modelBase      = null;

/** Per-speaker JS-backed style tensors. Cached; no disposal needed. */
const styleCache = new Map();

// ─── Text preprocessing ───────────────────────────────────────────────────────
function preprocessText(text, lang) {
    text = text.normalize('NFKD');
    text = text.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu,
        ''
    );
    const SUBS = {
        '\u2013': '-', '\u2011': '-', '\u2014': '-', '_': ' ',
        '\u201C': '"', '\u201D': '"', '\u2018': "'", '\u2019': "'",
        '\u00B4': "'", '\u0060': "'",
        '[': ' ', ']': ' ', '|': ' ', '/': ' ', '#': ' ',
        '\u2192': ' ', '\u2190': ' ',
    };
    for (const [k, v] of Object.entries(SUBS)) text = text.replaceAll(k, v);
    text = text.replace(/[♥☆♡©\\]/g, '');
    text = text.replaceAll('@', ' at ')
               .replaceAll('e.g.,', 'for example, ')
               .replaceAll('i.e.,', 'that is, ');
    for (const p of [',', '.', '!', '?', ';', ':']) {
        text = text.replace(new RegExp(` \\${p}`, 'g'), p);
    }
    text = text.replace(/ '/g, "'");
    while (text.includes('""')) text = text.replace('""', '"');
    while (text.includes("''")) text = text.replace("''", "'");
    text = text.replace(/\s+/g, ' ').trim();
    if (!/[.!?;:,'"\u2019)\]\}\u2026\u3002\u300D\u300F\u3011\u3009\u300B\u203A\u00BB]$/.test(text)) text += '.';
    return `<${lang}>${text}</${lang}>`;
}

function textToInputTensors(text, lang) {
    const processed = preprocessText(text, lang);
    const seqLen    = processed.length;
    const ids       = new BigInt64Array(seqLen);
    for (let j = 0; j < seqLen; j++) {
        const cp = processed.codePointAt(j);
        ids[j] = BigInt((cp < unicodeIndexer.length) ? unicodeIndexer[cp] : -1);
    }
    return {
        textIdsTensor:  new ort.Tensor('int64',   ids,                                 [1, seqLen]),
        textMaskTensor: new ort.Tensor('float32', new Float32Array(seqLen).fill(1.0), [1, 1, seqLen]),
    };
}

// ─── Noisy latent sampler (Box-Muller) ────────────────────────────────────────
function sampleNoisyLatent(durationSecs) {
    const { ae: { sample_rate: sr, base_chunk_size: bcs },
            ttl: { latent_dim: ld, chunk_compress_factor: ccf } } = cfgs;
    const chunkSize = bcs * ccf;                // 512 × 6 = 3072
    const latentDim = ld  * ccf;                //  24 × 6 = 144
    const wavLen    = Math.floor(durationSecs * sr);
    const latentLen = Math.ceil(wavLen / chunkSize);

    const xt = new Float32Array(latentDim * latentLen);
    for (let d = 0; d < latentDim; d++) {
        for (let t = 0; t < latentLen; t++) {
            const u1 = Math.max(1e-4, Math.random());
            const u2 = Math.random();
            xt[d * latentLen + t] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
    }
    // latent_mask: all 1s (single item, no padding)
    const latentMaskTensor = new ort.Tensor('float32', new Float32Array(latentLen).fill(1.0), [1, 1, latentLen]);
    return { xt, latentDim, latentLen, latentMaskTensor, wavLen };
}

// ─── Voice style loader ───────────────────────────────────────────────────────
async function loadVoiceStyle(speakerKey) {
    const resolved = SPEAKER_MAP[speakerKey] ?? DEFAULT_SPEAKER;
    if (styleCache.has(resolved)) return styleCache.get(resolved);

    const url = `${modelBase}/voice_styles/${resolved}.json`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} fetching voice style: ${url}`);
    const json = await r.json();

    const style = {
        ttl: new ort.Tensor('float32', new Float32Array(json.style_ttl.data.flat(Infinity)), json.style_ttl.dims),
        dp:  new ort.Tensor('float32', new Float32Array(json.style_dp.data.flat(Infinity)),  json.style_dp.dims),
    };
    styleCache.set(resolved, style);
    return style;
}

// ─── Core synthesis ───────────────────────────────────────────────────────────
async function runSynthesis(text, lang, speaker, steps, speed) {
    const { textIdsTensor, textMaskTensor } = textToInputTensors(text, lang);
    const style = await loadVoiceStyle(speaker);

    try {
        // 1. Duration predictor
        const dpOut = await dpSession.run({
            text_ids:  textIdsTensor,
            style_dp:  style.dp,
            text_mask: textMaskTensor,
        });
        const duration = dpOut.duration.data[0] / speed;
        dpOut.duration.dispose?.();

        // 2. Text encoder
        const textEncOut = await textEncSession.run({
            text_ids:  textIdsTensor,
            style_ttl: style.ttl,
            text_mask: textMaskTensor,
        });
        const textEmb = textEncOut.text_emb; // held across denoising loop

        // 3. Sample noisy latent
        const { xt: xtData, latentDim, latentLen, latentMaskTensor, wavLen } = sampleNoisyLatent(duration);
        const totalStepTensor = new ort.Tensor('float32', new Float32Array([steps]), [1]);
        let xtCurrent = xtData;

        // 4. Flow-matching denoising loop
        for (let step = 0; step < steps; step++) {
            const vestOut = await vecEstSession.run({
                noisy_latent: new ort.Tensor('float32', xtCurrent,               [1, latentDim, latentLen]),
                text_emb:     textEmb,
                style_ttl:    style.ttl,
                latent_mask:  latentMaskTensor,
                text_mask:    textMaskTensor,
                current_step: new ort.Tensor('float32', new Float32Array([step]), [1]),
                total_step:   totalStepTensor,
            });
            // Copy out of ORT/WASM memory immediately
            xtCurrent = new Float32Array(vestOut.denoised_latent.data);
            vestOut.denoised_latent.dispose?.();
        }

        // Free loop-invariant ORT tensors
        textEmb.dispose?.();
        latentMaskTensor.dispose?.();
        totalStepTensor.dispose?.();

        // 5. Vocoder → waveform at 44100 Hz
        const vocOut = await vocoderSession.run({
            latent: new ort.Tensor('float32', xtCurrent, [1, latentDim, latentLen]),
        });
        const rawWav = vocOut.wav_tts.data;
        const audio  = new Float32Array(rawWav.buffer, rawWav.byteOffset,
                                        Math.min(wavLen, rawWav.length)).slice();
        vocOut.wav_tts.dispose?.();

        return { audio, sampleRate: cfgs.ae.sample_rate };

    } finally {
        textIdsTensor.dispose?.();
        textMaskTensor.dispose?.();
    }
}

// ─── Message handler ─────────────────────────────────────────────────────────
self.addEventListener('message', async (event) => {
    const { type, data } = event.data ?? {};

    if (type === 'load') {
        try {
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 0 } });

            const wp  = self.location?.pathname ?? '';
            const idx = wp.indexOf('/_next/');
            const base = idx > 0 ? wp.slice(0, idx) : '';
            modelBase = `${base}/models/${data?.model ?? 'Supertone/supertonic-2'}`;
            const onnxBase = `${modelBase}/onnx`;

            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 5 } });
            [cfgs, unicodeIndexer] = await Promise.all([
                fetch(`${onnxBase}/tts.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
                fetch(`${onnxBase}/unicode_indexer.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
            ]);

            // Prefer WebGPU, fall back to WASM
            let provider = 'wasm';
            try {
                if ('gpu' in navigator) {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) provider = 'webgpu';
                }
            } catch { /* keep wasm */ }

            const sessionOpts = { executionProviders: [provider], graphOptimizationLevel: 'all' };

            // Load models sequentially to avoid memory spike
            const MODELS = ['duration_predictor', 'text_encoder', 'vector_estimator', 'vocoder'];
            const sessions = [];
            for (let i = 0; i < MODELS.length; i++) {
                self.postMessage({ type: 'progress', data: { status: 'loading', progress: 10 + i * 22 } });
                sessions.push(await ort.InferenceSession.create(`${onnxBase}/${MODELS[i]}.onnx`, sessionOpts));
            }
            [dpSession, textEncSession, vecEstSession, vocoderSession] = sessions;

            // Pre-warm default voice style
            self.postMessage({ type: 'progress', data: { status: 'loading', progress: 95 } });
            styleCache.clear();
            await loadVoiceStyle(DEFAULT_SPEAKER);

            self.postMessage({ type: 'ready' });
        } catch (err) {
            self.postMessage({ type: 'error', data: `Failed to load Supertone TTS: ${err?.message || String(err)}` });
        }

    } else if (type === 'synthesize') {
        const requestId = data?.requestId;
        try {
            if (!dpSession || !unicodeIndexer || !cfgs) throw new Error('TTS not loaded.');

            const text = (data?.text ?? '').trim();
            if (!text) return;

            const { audio, sampleRate } = await runSynthesis(
                text,
                data?.language ?? DEFAULT_LANG,
                data?.speaker  ?? DEFAULT_SPEAKER,
                data?.steps    ?? DEFAULT_STEPS,
                data?.speed    ?? DEFAULT_SPEED,
            );

            // Transfer ArrayBuffer — zero-copy, prevents double memory usage
            self.postMessage(
                { type: 'complete', data: { audio, sampling_rate: sampleRate, model: 'Supertone/supertonic-2', ...(requestId ? { requestId } : {}) } },
                [audio.buffer]
            );
        } catch (err) {
            const message = err?.message || String(err);
            self.postMessage({ type: 'error', data: requestId ? { message, requestId } : message });
        }
    }
});
