---
title: "take2"
subtitle: "LangGraph Multi-Agent Framework"
period: "2024"
tools: ["Python", "LangGraph", "LangChain", "OpenAI", "Anthropic", "Pydantic"]
link: "https://github.com/kaush4l/take2"
---

A production-ready LangGraph multi-agent implementation showcasing stateful, supervisor-based orchestration patterns for complex AI workflows.

- **Supervisor Architecture:** Implements a supervisor–worker multi-agent pattern where a coordinator agent dynamically routes sub-tasks to specialised worker agents (researcher, coder, critic) based on task type.
- **Stateful Graph Execution:** Uses LangGraph's StateGraph with TypedDict-annotated shared state, enabling agents to build on each other's outputs across multi-turn reasoning chains.
- **Tool & Retrieval Integration:** Includes web search, code execution, and RAG-retrieval tools with structured Pydantic output schemas, ensuring type-safe agent communication.
- **Streaming & Observability:** Streams intermediate agent steps via server-sent events, with LangSmith trace integration for visual debugging of agent decision paths.
