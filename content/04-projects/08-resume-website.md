---
title: "Resume Website"
subtitle: "Personal Project"
period: "2024 - Present"
tools: ["WebGPU", "Transformers.js", "ONNX Runtime Web", "Next.js", "TypeScript", "React", "MUI", "Framer Motion"]
link: "https://kaush4l.github.io"
description: "A configuration-driven static portfolio site whose assistant runs a multimodal LLM entirely in the visitor's browser — no backend, no API keys."
featured: true
---

A configuration-driven static portfolio site with fully on-device AI — no backend, no API keys, all inference runs in the browser via WebGPU.

- **Architecture:** Static export with Next.js App Router; all content driven from markdown files — zero hardcoded HTML, making updates a single-file edit.
- **On-Device AI:** A single multimodal model — **Gemma-4-E2B-it**, q4f16 **ONNX** on **WebGPU** (q4 on the wasm fallback) — answers typed and spoken questions about this résumé with no server round-trip.
- **Web Workers:** The model runs in a dedicated Web Worker with a structured message protocol and request-id guards, keeping the main thread unblocked during token streaming.
- **Progressive Enhancement:** Detects WebGPU and fp16 support up front, falls back to the wasm execution provider, and shows explicit load status rather than failing silently.
- **Caching:** Static assets served from the GitHub Pages CDN; model weights cached in the browser after first load so subsequent sessions skip the download.
