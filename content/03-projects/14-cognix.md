---
title: "Cognix"
subtitle: "Self-Hosted Productivity Suite"
period: "2024"
tools: ["Next.js", "React", "TypeScript", "PostgreSQL", "Prisma", "NextAuth", "Docker"]
link: "https://github.com/kaush4l/Cognix"
---

A self-hosted, privacy-first productivity suite built to replace fragmented SaaS tools with a single, owned application — notes, tasks, and knowledge management in one place.

- **Full-Stack Architecture:** Next.js App Router with server components for data fetching, server actions for mutations, and **Prisma ORM** over **PostgreSQL** for type-safe database access.
- **Authentication:** Implemented credential and OAuth flows via **NextAuth v5**, with JWT session management and role-based access control protecting user data.
- **Rich Text & Markdown Editor:** Integrated a Tiptap-based WYSIWYG editor with slash commands, code blocks, and real-time preview, supporting markdown shortcuts for power users.
- **Docker Deployment:** Single `docker-compose up` deployment bundling Next.js, PostgreSQL, and a reverse proxy — enabling one-click self-hosting on any VPS or home server.
