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
  const args = { models: 'all', force: false, manifest: 'scripts/models.manifest.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--models' && argv[i + 1]) {
      args.models = argv[++i];
    } else if (a === '--force') {
      args.force = true;
    } else if (a === '--manifest' && argv[i + 1]) {
      args.manifest = argv[++i];
    }
  }
  return args;
}

function selectorFn(selectorCsv) {
  const selector = new Set(String(selectorCsv || 'all').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  if (selector.size === 0) selector.add('all');

  return (modelId) => {
    if (selector.has('all')) return true;
    const mid = String(modelId).toLowerCase();
    if (selector.has('stt') && mid.includes('whisper')) return true;
    if (selector.has('tts') && (mid.includes('tts') || mid.includes('mms') || mid.includes('supertonic') || mid.includes('supertone'))) return true;
    if (selector.has('llm') && (mid.includes('onnx') || mid.includes('mistral') || mid.includes('ministral'))) return true;
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
  const { models, force, manifest } = parseArgs(process.argv.slice(2));
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

  const cacheDir = path.resolve(repoRoot, 'public/models');

  // Lazy import so the script remains a simple Node entrypoint.
  const transformers = await import('@huggingface/transformers');
  const { env, pipeline, AutoTokenizer, AutoModelForCausalLM } = transformers;

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
        // STT
        await pipeline('automatic-speech-recognition', modelId, {
          ...common,
          device: 'cpu',
        });
      } else if (lower.includes('tts') || lower.includes('mms') || lower.includes('supertonic') || lower.includes('supertone')) {
        // ── Supertone/supertonic-2 — custom 4-ONNX pipeline ─────────────────
        // This model does NOT follow the standard HF tokenizer layout.
        // Files live under onnx/ and voice_styles/ subdirectories.
        if (lower.includes('supertonic') || lower.includes('supertone')) {
          const baseUrl = `https://huggingface.co/${modelId}/resolve/main`;
          const destRoot = path.join(cacheDir, modelId);

          const files = [
            'onnx/tts.json',
            'onnx/unicode_indexer.json',
            'onnx/duration_predictor.onnx',
            'onnx/text_encoder.onnx',
            'onnx/vector_estimator.onnx',
            'onnx/vocoder.onnx',
            'voice_styles/F1.json', 'voice_styles/F2.json', 'voice_styles/F3.json',
            'voice_styles/F4.json', 'voice_styles/F5.json',
            'voice_styles/M1.json', 'voice_styles/M2.json', 'voice_styles/M3.json',
            'voice_styles/M4.json', 'voice_styles/M5.json',
          ];

          for (let i = 0; i < files.length; i++) {
            const relPath = files[i];
            const dest    = path.join(destRoot, relPath);
            process.stdout.write(`\r[models] ${modelId} ${relPath} (${i + 1}/${files.length})  `);

            if (!force && await exists(dest)) continue;

            await fs.mkdir(path.dirname(dest), { recursive: true });
            const res = await fetch(`${baseUrl}/${relPath}`);
            if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${relPath}`);
            await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
          }
          process.stdout.write('\n');

        } else {
          // Generic MMS/other TTS via transformers.js pipeline
          await pipeline('text-to-speech', modelId, { ...common, device: 'cpu' });

          // Stub preprocessor_config.json — Transformers.js 3.x requires it locally
          // even for VITS/MMS models that have no feature extractor in their HF repo.
          const preprocessorPath = path.join(cacheDir, modelId, 'preprocessor_config.json');
          if (!await exists(preprocessorPath)) {
            await fs.writeFile(
              preprocessorPath,
              JSON.stringify({ processor_class: 'VitsTokenizer', tokenizer_class: 'VitsTokenizer' }, null, 2) + '\n',
              'utf-8'
            );
          }
        }
      } else {
        // LLM — text-only causal model (e.g. Qwen3-0.6B-ONNX)
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
