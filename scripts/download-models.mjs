#!/usr/bin/env node
/**
 * Download Hugging Face model repos into `public/models/...` using Transformers.js' own
 * filesystem cache mechanism.
 *
 * Why this exists:
 * - The app is a static export.
 * - At runtime we run with `env.allowRemoteModels = false`, so every file must already be
 *   available under `public/models` and served from `/models`.
 * - Transformers.js already knows which artifacts it needs; by setting `cache_dir` to
 *   `public/models`, the downloaded files end up in the exact on-disk layout the web
 *   workers expect.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = { models: 'all', force: false, manifest: 'scripts/models.manifest.json', sizesOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--models' && argv[i + 1]) {
      args.models = argv[++i];
    } else if (a === '--force') {
      args.force = true;
    } else if (a === '--sizes-only') {
      args.sizesOnly = true;
    } else if (a === '--manifest' && argv[i + 1]) {
      args.manifest = argv[++i];
    }
  }
  return args;
}

// ─── Download size, sourced rather than guessed (F3) ─────────────────────────
//
// The UI tells the visitor how much it is about to spend of their bandwidth, so
// that number has to come from the same record as the model id. The Hub's tree
// API knows the byte size of every file; we sum exactly the files the *runtime*
// loads for the declared dtype, and write the total back into the manifest next
// to the id it describes. `src/lib/capability.ts` imports that manifest, so the
// id and the size can never drift apart silently.

/** ONNX graph components the web worker instantiates for Gemma-4. */
const RUNTIME_ONNX_COMPONENTS = ['decoder_model_merged', 'embed_tokens', 'audio_encoder', 'vision_encoder'];
/** Non-ONNX repo assets transformers.js fetches (tokenizer, processor, configs). */
const RUNTIME_ASSET_EXTENSIONS = ['.json', '.jinja', '.txt', '.model'];
const ONNX_FILE_RE = /^(.+?)(?:_(fp16|q4f16|q4|quantized|int8|uint8|bnb4|q8))?\.onnx(?:_data(?:_\d+)?)?$/;

/**
 * Total on-the-wire bytes a browser downloads for `modelId` at `dtype`.
 * Returns `null` when the Hub cannot be reached — never a guess.
 */
async function fetchRuntimeBytes(modelId, dtype) {
  let tree;
  try {
    const r = await fetch(`https://huggingface.co/api/models/${modelId}/tree/main?recursive=1`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    tree = await r.json();
  } catch (e) {
    console.warn(`[models] size: could not reach the Hub for ${modelId} (${e?.message || e}) — keeping the manifest value.`);
    return null;
  }
  if (!Array.isArray(tree)) return null;

  let total = 0;
  for (const f of tree) {
    if (f?.type !== 'file' || typeof f.size !== 'number') continue;
    const p = String(f.path);
    if (p.startsWith('onnx/')) {
      const m = ONNX_FILE_RE.exec(p.slice('onnx/'.length));
      if (!m) continue;
      if (RUNTIME_ONNX_COMPONENTS.includes(m[1]) && m[2] === dtype) total += f.size;
    } else if (RUNTIME_ASSET_EXTENSIONS.some(ext => p.endsWith(ext))) {
      total += f.size;
    }
  }
  return total > 0 ? total : null;
}

/** Refresh `bytes` on every selected manifest entry, in place. */
async function refreshManifestSizes(manifestPath, data, selectedIds) {
  let changed = false;
  for (const entry of data?.models ?? []) {
    if (!entry?.id || !selectedIds.has(entry.id)) continue;
    const dtype = entry.runtimeDtype || 'q4f16';
    const bytes = await fetchRuntimeBytes(entry.id, dtype);
    if (bytes == null) continue;
    if (entry.bytes !== bytes) {
      console.log(`[models] size ${entry.id} (${dtype}): ${entry.bytes ?? 'unset'} → ${bytes}`);
      entry.bytes = bytes;
      changed = true;
    } else {
      console.log(`[models] size ${entry.id} (${dtype}): ${bytes} (unchanged)`);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (entry.bytesMeasuredAt !== today && changed) entry.bytesMeasuredAt = today;
  }
  if (changed) {
    await fs.writeFile(manifestPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    console.log(`[models] wrote ${manifestPath}`);
  }
}

function selectorFn(selectorCsv) {
  const selector = new Set(String(selectorCsv || 'all').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  if (selector.size === 0) selector.add('all');

  return (modelId) => {
    if (selector.has('all')) return true;
    const mid = String(modelId).toLowerCase();
    if (selector.has('stt') && mid.includes('whisper')) return true;
    if (selector.has('tts') && (mid.includes('kokoro') || mid.includes('tts'))) return true;
    if (selector.has('llm') && (mid.includes('gemma') || mid.includes('granite') || mid.includes('llama') || mid.includes('onnx') || mid.includes('mistral'))) return true;
    return Array.from(selector).some(tok => mid.includes(tok));
  };
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { models, force, manifest, sizesOnly } = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const manifestPath = path.resolve(repoRoot, manifest);

  const data = await readJson(manifestPath);
  const entries = Array.isArray(data?.models) ? data.models : [];

  const include = selectorFn(models);
  const selected = entries
    .map(m => ({ id: m?.id, localDir: m?.localDir }))
    .filter(m => m.id && include(m.id));

  if (selected.length === 0) {
    console.log('[models] No models selected.');
    return;
  }

  // Keep the advertised download size sourced from the Hub, not hand-measured.
  await refreshManifestSizes(manifestPath, data, new Set(selected.map(s => s.id)));
  if (sizesOnly) return;

  const cacheDir = path.resolve(repoRoot, 'public/models');

  // Lazy import so the script remains a simple Node entrypoint.
  const transformers = await import('@huggingface/transformers');
  const { env, pipeline, AutoTokenizer, AutoModelForCausalLM, AutoProcessor, Gemma4ForConditionalGeneration } = transformers;

  // Configure Transformers.js to download into the static site's hosted path.
  env.allowRemoteModels = true;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.useFSCache = true;
  env.cacheDir = cacheDir;

  // This mainly affects the "local" lookup path; caching is controlled by cacheDir.
  env.localModelPath = cacheDir;

  console.log(`[models] cache_dir: ${cacheDir}`);
  console.log(`[models] selected: ${selected.map(s => s.id).join(', ')}`);

  for (const { id: modelId } of selected) {
    const marker = path.join(cacheDir, modelId, '.downloaded');

    if (!force && await exists(marker)) {
      console.log(`[models] SKIP ${modelId} (marker present)`);
      continue;
    }

    console.log(`[models] Downloading ${modelId} ...`);

    const progress_callback = (p) => {
      if (!p) return;
      if (p.status === 'progress' && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100);
        process.stdout.write(`\r[models] ${modelId} ${p.file || ''} ${pct}%   `);
      }
    };

    // Important: pass cache_dir so the files land in public/models/<modelId>/...
    const common = { cache_dir: cacheDir, progress_callback, local_files_only: false };

    try {
      // Heuristics matching our runtime workers.
      const lower = modelId.toLowerCase();

      if (lower.includes('whisper')) {
        // STT — onnx-community/whisper-tiny uses fp16 ONNX files
        await pipeline('automatic-speech-recognition', modelId, {
          ...common,
          device: 'cpu',
          dtype: { encoder_model: 'fp16', decoder_model_merged: 'fp16' },
        });
      } else if (lower.includes('kokoro')) {
        // TTS — Kokoro-82M: download tokenizer + ONNX model
        const destDir = path.join(cacheDir, modelId);
        await fs.mkdir(destDir, { recursive: true });

        // Download tokenizer files
        const tokenizerFiles = ['tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.json', 'merges.txt'];
        for (const file of tokenizerFiles) {
          const destPath = path.join(destDir, file);
          if (!force && await exists(destPath)) continue;
          console.log(`[models]   Downloading tokenizer/${file}…`);
          const r = await fetch(`https://huggingface.co/${modelId}/resolve/main/${file}`);
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`);
          const buf = await r.arrayBuffer();
          await fs.writeFile(destPath, Buffer.from(buf));
        }

        // Download ONNX model files (may be in ./onnx/ subfolder)
        const onnxFiles = ['model.onnx', 'model.onnx_data'];
        for (const file of onnxFiles) {
          const destPath = path.join(destDir, file);
          if (!force && await exists(destPath)) continue;
          console.log(`[models]   Downloading ${file}…`);
          const r = await fetch(`https://huggingface.co/${modelId}/resolve/main/${file}`);
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`);
          const buf = await r.arrayBuffer();
          await fs.writeFile(destPath, Buffer.from(buf));
        }

        // Also try the onnx/ subfolder
        for (const file of onnxFiles) {
          const destPath = path.join(destDir, 'onnx', file);
          if (!force && await exists(destPath)) continue;
          try {
            const r = await fetch(`https://huggingface.co/${modelId}/resolve/main/onnx/${file}`);
            if (r.ok) {
              const buf = await r.arrayBuffer();
              await fs.mkdir(path.join(destDir, 'onnx'), { recursive: true });
              await fs.writeFile(destPath, Buffer.from(buf));
              console.log(`[models]   Downloaded onnx/${file}`);
            }
          } catch { /* not present in onnx/ subfolder */ }
        }
      } else if (lower.includes('gemma')) {
        // Gemma-4 is multimodal (text + audio + vision). Use the processor and
        // the conditional-generation class so ALL required q4 ONNX files
        // (decoder, embed_tokens, audio_encoder, vision_encoder) get cached.
        await AutoProcessor.from_pretrained(modelId, common);
        await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
          ...common,
          device: 'cpu',
          dtype: 'q4',
        });
      } else if (lower.includes('granite') || lower.includes('mistral') || lower.includes('llama')) {
        // Text-only causal LM models.
        await AutoTokenizer.from_pretrained(modelId, common);
        await AutoModelForCausalLM.from_pretrained(modelId, {
          ...common,
          device: 'cpu',
        });
      } else {
        // Fallback — try AutoTokenizer + AutoModelForCausalLM
        await AutoTokenizer.from_pretrained(modelId, common);
        await AutoModelForCausalLM.from_pretrained(modelId, {
          ...common,
          device: 'cpu',
        });
      }

      // Ensure marker directory exists.
      await fs.mkdir(path.join(cacheDir, modelId), { recursive: true });
      await fs.writeFile(marker, `downloaded: ${modelId}\n`, 'utf-8');
      process.stdout.write('\n');
      console.log(`[models] DONE ${modelId}`);
    } catch (e) {
      process.stdout.write('\n');
      console.error(`[models] FAILED ${modelId}: ${e?.message || String(e)}`);
      console.error('[models] Note: partial files may still have been downloaded into public/models.');
      process.exitCode = 1;
    }
  }
}

await main();
