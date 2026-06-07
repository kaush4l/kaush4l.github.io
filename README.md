# kaush4l.github.io

A configuration-driven personal site (Next.js App Router, static export) with an
**on-device, multimodal AI assistant** that runs entirely in the browser via
WebGPU — no server, no API keys.

## Principles

- **Content is data, not markup.** No section is hardcoded to HTML. Every entry
  is a markdown file, and a section's identity/ordering/layout is encoded in the
  folder structure and a per-folder `_section.md`. Adding, reordering, or
  restyling a section is a content change — see [content/README.md](content/README.md).
- **AI on-device.** The chat assistant loads a quantized
  [Gemma-4 E2B](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX)
  (q4 / q4f16) ONNX model with [transformers.js](https://github.com/huggingface/transformers.js)
  and runs it in a Web Worker on WebGPU (wasm fallback). It is multimodal:
  type a question **or speak one** — audio is transcribed and answered by the
  same model in a single pass.

## Develop (uses Bun)

```bash
bun install        # installs deps + copies onnxruntime-web assets to public/
bun run dev        # http://localhost:3000  (next dev --webpack)
bun run lint       # eslint
bun run build      # static export to out/
```

> This project uses **Bun**, not npm. CI installs/builds with Bun too.

## On-device model

At runtime the worker prefers model files served from `/models` and falls back
to the Hugging Face Hub, caching into the browser (IndexedDB). To bundle the
model for fully-offline serving:

```bash
bun run models:download
```

This downloads the Gemma-4 E2B q4 ONNX files (processor + decoder + audio/vision
encoders) into `public/models/`. Note these are large (multi-GB) and are
**git-ignored** — for GitHub Pages we rely on the Hub fallback + browser cache by
default rather than committing the weights.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with Bun
and publishes the static `out/` to the `master` branch (GitHub Pages).

## Architecture

| Area | Where |
|------|-------|
| Content + section metadata | `content/**` (`_section.md` per folder) |
| Content loader / section + nav resolution | `src/lib/content.ts` |
| Dynamic page (maps over sections) | `src/app/page.tsx`, `src/components/Resume/SectionRenderer.tsx` |
| On-device model worker (text + audio) | `src/workers/llm.worker.js` |
| WebGPU/runtime config | `src/workers/transformersEnv.ts`, `src/lib/capability.ts` |
| Chat UI + voice capture | `src/components/Chat/ChatWidget.tsx`, `src/hooks/useChatAI.ts`, `src/hooks/useAudioRecorder.ts` |
| Theme + header-anchored theme switcher | `src/theme/ThemeProvider.tsx`, `src/components/Layout/Header.tsx` |
