---
title: "Resume Website"
subtitle: "Personal Project"
period: "2024 - Present"
tools: ["Next.js", "React", "TypeScript", "MUI", "Transformers.js", "ONNX Runtime Web", "WebGPU", "Framer Motion"]
link: "https://kaush4l.github.io"
---

A configuration-driven static portfolio site with fully on-device AI — no backend, no API keys, all inference runs in the browser via WebGPU.

- **Architecture:** Static export with Next.js App Router; all content driven from markdown files — zero hardcoded HTML, making updates a single-file edit.
- **On-Device AI Pipeline:** ASR (Whisper f16 via WebGPU) → LLM (Granite 4.0 350M ONNX q4f16) → TTS (KittenTTS-Nano ONNX) runs entirely client-side, processing voice questions and speaking responses without any server round-trip.
- **Web Workers:** Each model runs in a dedicated Web Worker with structured message protocols, keeping the main thread unblocked and UI at 60fps during inference.
- **Progressive Enhancement:** Gracefully degrades on browsers without WebGPU — shows clear status indicators and falls back to text-only interaction.
- **Performance:** Static assets served from GitHub Pages CDN; LCP under 1.5s; models cached in IndexedDB after first load for instant subsequent sessions.
