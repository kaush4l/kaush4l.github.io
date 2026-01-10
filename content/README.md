# Resume content standard

This app loads resume content from markdown files under `content/`.

Modules are **folders** with a numeric prefix. They are loaded in ascending order:

- `content/01-education/`
- `content/02-experience/`
- `content/03-projects/`

The module display name is derived from the folder name (e.g., `01-education` → `Education`).

## Entries (ordered)

Each `.md` file inside a module is an **entry**. Entries are also ordered by numeric prefix:

- `01-... .md`
- `02-... .md`

Example:

- `content/02-experience/01-cerner.md`
- `content/02-experience/02-esystems-inc.md`

If you provide `order:` in frontmatter, it overrides the filename prefix.

## Frontmatter (recommended)

```yaml
---
title: "Software developer"
subtitle: "Cerner"
period: "August 2018 - Present"
---
```

The body below the frontmatter is rendered as markdown.
