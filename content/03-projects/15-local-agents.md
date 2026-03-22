---
title: "LocalAgents"
subtitle: "On-Device AI Automation"
period: "2024"
tools: ["Python", "Whisper", "Ollama", "MLX", "AppleScript", "macOS APIs"]
link: "https://github.com/kaush4l/LocalAgents"
---

A privacy-first AI automation framework for macOS that orchestrates voice commands, local LLMs, and system APIs — completely offline, no cloud calls.

- **Voice-Driven Automation:** Captures audio with a hotkey, transcribes via **OpenAI Whisper** running locally, and routes intents to appropriate automation handlers (file operations, app control, web search).
- **Local LLM Orchestration:** Uses **Ollama** with quantised open-source models (Llama, Mistral) and **Apple MLX** for M-chip accelerated inference — sub-2s end-to-end response on Apple Silicon.
- **Agentic Tool Use:** Implements a lightweight ReAct loop where the LLM decides which tool to invoke (AppleScript, shell commands, Python modules) and interprets tool outputs to formulate next steps.
- **Privacy by Design:** Zero telemetry, no internet required once models are downloaded — all processing happens on-device inside a sandboxed Python environment.
