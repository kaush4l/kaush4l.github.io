# Content standard

The site renders **entirely from this folder**. There is no hardcoded list of
sections or entries anywhere in the app — the home page maps over whatever it
finds here. Adding, removing, reordering, or restyling a section is a content
change, not a code change.

## Sections are folders

A section is a folder named `NN-id`:

- `NN` (numeric prefix) sets the **order** sections appear on the page.
- `id` becomes the section's slug and anchor (e.g. `02-experience` → `#experience`).

```
content/
  01-about/
  02-experience/
  03-projects/
  04-education/
  05-skills/
  06-contact/
```

## Section metadata: `_section.md`

Each folder may contain a `_section.md` whose frontmatter describes how the
section is presented. It is metadata, not an entry (files starting with `_` and
`README.md` are never rendered as content).

```yaml
---
title: Experience      # display heading
layout: timeline       # timeline | grid | skills | about | contact
icon: work             # icon registry key (src/components/icons.tsx)
sort: desc             # entry order within the section: asc | desc (by filename)
---
```

If `_section.md` is absent, the title is derived from the folder name, the
layout defaults to `timeline`, and entries sort ascending.

### Layouts

| layout | renders as |
|--------|------------|
| `timeline` | vertical timeline of cards (experience, education) |
| `grid`     | responsive card grid (projects) |
| `skills`   | category cards with skill chips (reads `tags`) |
| `about`    | bio panel with avatar |
| `contact`  | contact link tiles (reads `url` + `icon`) |

### Icons

`icon` values map to MUI icons in `src/components/icons.tsx`
(`school`, `work`, `code`, `person`, `build`, `contact`, `home`, `folder`).

## Entries

Each `NN-name.md` inside a section is an entry. Common frontmatter:

```yaml
---
title: "Software Engineer"
subtitle: "Fidelity"
period: "2023 - Present"
location: "Durham, NC"
tools: ["Java", "React", "AWS"]   # alias: tags
url: "https://..."                # contact/project link
icon: "github"                    # contact tile icon
featured: true
---

Markdown body — rendered as the entry's description.
```

For **skills**, put the skills in the `tags` array; the section groups entries by
`category` and renders each `tags` list as chips:

```yaml
---
title: "Languages"
category: "Languages"
tags: ["Java", "TypeScript", "Python"]
---
```

## Navigation

The sidebar is generated from these sections too (`getNav()` in
`src/lib/content.ts`), so it always matches what's on the page.
