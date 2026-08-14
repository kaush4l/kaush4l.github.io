---
title: "Document Q&A"
subtitle: "AI-Firefighters · Multi-Format RAG"
period: "2024"
tools: ["LangChain", "GPT-4 Turbo", "Anthropic", "Python", "Docker", "RAG"]
link: "https://github.com/AI-Firefighters/Document_Q-A"
description: "Conversational question-answering over whatever a team already has: XLSX, PPTX, DOCX, PDF, CSV and TXT, in one retrieval pipeline."
---

Conversational question-answering over the document types a team actually has lying around — **XLSX, PPTX, DOCX, PDF, CSV and TXT** — built with **LangChain** on **GPT-4 Turbo**, with Anthropic models configurable as an alternative backend.

- **Format-agnostic ingestion:** one loader layer normalises spreadsheets, slide decks, Word documents and flat text into a single chunked representation, so the retrieval and answering stages never learn what a file originally was.
- **Retrieval-augmented answers:** questions are answered against retrieved passages rather than model memory, which is what makes an answer traceable back to a source document.
- **Bring-your-own key:** API credentials live in a local `.env` and never ship with the code, so a team can run it against its own account without routing documents through anyone else's infrastructure.
- **Containerised:** ships with a Dockerfile so the pipeline runs the same way on a laptop and on a shared box.
