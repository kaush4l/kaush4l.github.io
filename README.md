# bravo-resume

Next.js (App Router) resume/portfolio site.

## Dev

```bash
npm ci
npm run dev
```

## WebGPU + on-device models

The AMA/chat functionality runs fully in-browser using WebGPU workers.

Models are expected to be available locally under:

- `public/models/` (see `public/models/README.md`)

Remote model downloads are disabled in the workers.

## Static build

```bash
npm run build
```

Build output is exported to `out/` (see `next.config.ts`).
