/**
 * TTS Web Worker — onnx-community/KittenTTS-Nano-v0.8-ONNX (StyleTTS2, 24 kHz)
 *
 * Uses ONNX Runtime directly because KittenTTS is a StyleTTS2 model that requires
 * custom G2P pre-processing and is not supported by the Transformers.js pipeline.
 *
 * Protocol:
 *   IN  { type: 'load',       data: { model: string } }
 *   IN  { type: 'synthesize', data: { text, requestId? } }
 *   OUT { type: 'progress',   data: { status, progress } }
 *   OUT { type: 'ready' }
 *   OUT { type: 'complete',   data: { audio: Float32Array, sampling_rate, requestId? } }
 *   OUT { type: 'error',      data: string | { message, requestId? } }
 */

import * as ort from 'onnxruntime-web';
import { phonemize } from 'phonemizer';
import { tokenize } from './lib/text-cleaner.js';
import { loadVoices } from './lib/npz-reader.js';

// ─── WASM path setup (mirrors transformersEnv.ts) ──────────────────────────
function inferBasePath() {
    try {
        const p = self.location?.pathname || '';
        const idx = p.indexOf('/_next/');
        return idx > 0 ? p.slice(0, idx) : '';
    } catch {
        return '';
    }
}

const _basePath = inferBasePath();
ort.env.wasm.wasmPaths = `${_basePath}/onnxruntime/`;
ort.env.wasm.numThreads = 1;

// ─── State ─────────────────────────────────────────────────────────────────
const SAMPLE_RATE = 24000;
const DEFAULT_VOICE = 'Bella';
const DEFAULT_SPEED = 1.0;

let session = null;   // ort.InferenceSession
let voices = null;    // Record<string, { data: Float32Array, shape: number[] }>

// ─── Helpers ───────────────────────────────────────────────────────────────

function progress(pct) {
    self.postMessage({ type: 'progress', data: { status: 'progress', progress: pct } });
}

function hfUrl(repoId, file) {
    return `https://huggingface.co/${repoId}/resolve/main/${file}`;
}

async function fetchBuf(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
    return resp.arrayBuffer();
}

// ─── Load ──────────────────────────────────────────────────────────────────

async function loadModel(repoId) {
    progress(0);

    // 1. Fetch kitten_config.json for voices_url
    progress(5);
    const configBuf = await fetchBuf(hfUrl(repoId, 'kitten_config.json'));
    const config = JSON.parse(new TextDecoder().decode(configBuf));

    // 2. Fetch ONNX model
    progress(10);
    console.log(`[TTS Worker] Fetching ONNX model for ${repoId}…`);
    const modelBuf = await fetchBuf(hfUrl(repoId, 'onnx/model.onnx'));

    // 3. Create ONNX InferenceSession
    progress(65);
    session = await ort.InferenceSession.create(modelBuf, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
    });

    // 4. Load voice embeddings
    progress(75);
    const voicesUrl = config?.voices_url ?? hfUrl(repoId, 'voices.npz');
    voices = await loadVoices(voicesUrl);

    progress(95);
    console.log(`[TTS Worker] KittenTTS ready. Voices: ${Object.keys(voices).join(', ')}`);
}

// ─── Synthesize ────────────────────────────────────────────────────────────

async function synthesize(text, voiceName = DEFAULT_VOICE, speed = DEFAULT_SPEED) {
    if (!session || !voices) throw new Error('TTS model not loaded.');

    // 1. G2P: text → IPA phoneme string
    const phonemeArr = await phonemize(text, 'en-us');
    const phonemeStr = Array.isArray(phonemeArr) ? phonemeArr.join('') : String(phonemeArr);

    // 2. Tokenise phonemes → int token IDs
    const tokenIds = tokenize(phonemeStr);
    if (tokenIds.length === 0) throw new Error('Tokenization produced no tokens.');

    // 3. Pick voice embedding (fall back to first available voice)
    const voiceEntry = voices[voiceName] ?? voices[Object.keys(voices)[0]];
    if (!voiceEntry) throw new Error('No voice embeddings available.');

    // voiceEntry.shape is [n_styles, style_dim] — pick first style row
    const styleDim = voiceEntry.shape[voiceEntry.shape.length - 1];
    const voiceEmbedding = voiceEntry.data.slice(0, styleDim);

    // 4. Build ONNX input tensors
    const inputTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(tokenIds.map(BigInt)),
        [1, tokenIds.length],
    );
    const styleTensor = new ort.Tensor('float32', voiceEmbedding, [1, styleDim]);
    const speedTensor = new ort.Tensor('float32', new Float32Array([speed]), [1]);

    // 5. Run inference
    const results = await session.run({
        input_ids: inputTensor,
        style: styleTensor,
        speed: speedTensor,
    });

    // Output name may vary across model versions — take the first output
    const outputKey = Object.keys(results)[0];
    const raw = results[outputKey].data;
    return raw instanceof Float32Array ? raw : new Float32Array(raw);
}

// ─── Message handler ───────────────────────────────────────────────────────

self.addEventListener('message', async (event) => {
    const { type, data } = event.data ?? {};

    if (type === 'load') {
        try {
            const repoId = data?.model ?? 'onnx-community/KittenTTS-Nano-v0.8-ONNX';
            await loadModel(repoId);
            self.postMessage({ type: 'ready' });
        } catch (err) {
            const message = err?.message || String(err);
            console.error('[TTS Worker] Load error:', err);
            self.postMessage({ type: 'error', data: `Failed to load TTS model: ${message}` });
        }

    } else if (type === 'synthesize') {
        const requestId = data?.requestId;
        try {
            const text = (data?.text ?? '').trim();
            if (!text) return;

            const audio = await synthesize(text, data?.voice ?? DEFAULT_VOICE, data?.speed ?? DEFAULT_SPEED);

            self.postMessage(
                {
                    type: 'complete',
                    data: {
                        audio,
                        sampling_rate: SAMPLE_RATE,
                        ...(requestId ? { requestId } : {}),
                    },
                },
                [audio.buffer],
            );
        } catch (err) {
            const message = err?.message || String(err);
            console.error('[TTS Worker] Synthesis error:', err);
            self.postMessage({
                type: 'error',
                data: requestId ? { message, requestId } : message,
            });
        }
    }
});

