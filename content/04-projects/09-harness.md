---
title: "HARNESS"
subtitle: "Browser-Native Agent Runtime"
period: "2026"
tools: ["Rust", "WebAssembly", "htmx", "Capability Security", "Event Sourcing", "ADRs"]
link: "https://github.com/kaush4l/ASKK"
description: "A hosted, browser-only environment an AI agent lives inside and can extend — Rust core compiled to WebAssembly, with self-authored modules and no install step."
featured: true
---

A hosted, browser-only environment that an agent lives inside and can extend. The Rust core compiles to **WebAssembly**, the frontend is **htmx**, and modules are authored by the agent itself. Nothing installs, ever.

The design metaphor is a person carrying a phone: the phone has no task of its own — it has a screen, storage, a network, a clock, apps, and a coherent story about what it can do. HARNESS is the phone; the agent is the person.

- **Static and local by invariant:** builds to static assets with no server runtime required to function, and all user data lives in browser storage — outbound traffic only ever reaches explicitly configured endpoints.
- **Pure, deterministic core:** the core crates test on the host with no browser, no Wasm and no network, and `step()` is pure — time, randomness, IDs and network are injected rather than reached for.
- **One seam:** every UI interaction goes through a single `handle(Request) -> Response` boundary, and the frontend carries no application logic — a behaviour that needs JavaScript needs a written reason.
- **Capability-gated, default deny:** modules receive nothing they were not explicitly granted, and secrets never enter a module's environment.
- **Observable by construction:** every state transition emits an event and every view is a projection of the log, so the agent's history is replayable rather than reconstructed.
- **Specified before built:** fifteen hard invariants plus a set of ADRs govern the work, and every module spec references the invariants it must uphold by ID.
