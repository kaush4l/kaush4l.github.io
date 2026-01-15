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
    if (selector.has('tts') && (mid.includes('tts') || mid.includes('supertonic') || mid.includes('supertone'))) return true;
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
  const { env, pipeline, AutoProcessor, AutoTokenizer, AutoModelForCausalLM, AutoModelForImageTextToText } = transformers;

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
      } else if (lower.includes('supertonic') || lower.includes('supertone')) {
        // TTS
        await pipeline('text-to-speech', modelId, {
          ...common,
          device: 'cpu',
        });
      } else {
        // LLM (matches llm.worker.js)
        await AutoProcessor.from_pretrained(modelId, common);
        await AutoTokenizer.from_pretrained(modelId, common);

        try {
          await AutoModelForImageTextToText.from_pretrained(modelId, {
            ...common,
            device: 'cpu',
          });
        } catch {
          await AutoModelForCausalLM.from_pretrained(modelId, {
            ...common,
            device: 'cpu',
          });
        }
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
