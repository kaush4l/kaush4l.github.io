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
  02-skills/
  03-experience/
  04-projects/
  05-education/
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
accent: primary        # palette role for the heading + chrome: primary | secondary
sort: desc             # entry order within the section: asc | desc (by filename)
---
```

Three further keys are optional passthroughs — authored copy the layouts read
straight off the section:

| key | type | declared on | renders as |
|-----|------|-------------|------------|
| `prompts` | string[] | `01-about/_section.md` | the chat's suggested questions |
| `intro` | string | `06-contact/_section.md` | one sentence above the contact tiles |
| `statement` | string | `06-contact/_section.md` | the page's closing line in the footer |

If `_section.md` is absent, the title is derived from the folder name, the
layout defaults to `timeline`, the icon to `folder`, the accent to `primary`,
and entries sort ascending. No section name is hardcoded anywhere in `src/lib/`.

Folders whose name does not start with `NN-` are ignored entirely, which is how
`content/_archive/` holds retired entries without rendering them.

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
(`school`, `work`, `code`, `person`, `build`, `contact`, `home`, `folder`,
`terminal`, `layers`, `cloud`, `psychology`, `handyman`).

## Entries

Each `NN-name.md` inside a section is an entry. The frontmatter keys below are
the complete set the parser reads (`parseMarkdownFile` in `src/lib/content.ts`);
anything else is ignored. Every key is optional except `title`.

| key | type | used by | meaning |
|-----|------|---------|---------|
| `title` | string | all | the entry's name; falls back to the filename slug |
| `subtitle` | string | all | the dominant secondary line — for Experience this is the **client**, not the staffing agency |
| `via` | string | experience | the agency an engagement was staffed through; rendered in the meta caption as `{period} · {location} · via {via}` |
| `period` | string | experience, education, projects | e.g. `"April 2025 - Present"` |
| `location` | string | experience, education | e.g. `"Durham, NC"` |
| `description` | string | projects | one sentence rendered as the card body, unclamped. Without it the card falls back to clamping the markdown body |
| `tools` / `tags` | string[] | experience, projects, skills | technology chips. Order matters: the first four render, the rest collapse into a `+N` chip, so put the distinctive ones first |
| `coursework` | string[] | education | classes taken. Rendered as running text, never as chips |
| `quote` | string | education | optional pull-quote, rendered **below** the body |
| `link` | string | projects | outbound project URL; makes the whole card a link |
| `url` | string | contact | the tile's destination (`https://…` or `mailto:…`) |
| `icon` | string | contact, skills | icon registry key (`src/components/icons.tsx`) |
| `featured` | boolean | projects | pin ahead of the section's `sort` |
| `category` | string | skills | overrides the grouping key, which defaults to `title`. No file declares it today |
| `headline` | string | about | the role line under the name in the hero |
| `proof` | string | about | the hero's proof line: years · employers · one number |
| `highlights` | string[] | about | the technology chips shown above the fold |

```yaml
---
title: "Full Stack Software Engineer"
subtitle: "Fidelity Charitable"
via: "DataForce Inc"
period: "April 2025 - Present"
location: "Remote / Durham, NC"
tools: ["Java", "Spring Boot", "Angular"]
---

Markdown body — rendered as the entry's description.
```

`featured: true` pins an entry ahead of everything else in its section, before
the section's `sort` is applied. Use it sparingly — two or three featured project
cards is the point; eight is the same as none.

**Every bullet in `content/03-experience/` must carry a number, a named system,
or a named standard.** Bold is a fixed salience budget: use `**` for technologies
and quantities only, never for the leading label of a bullet.

For **skills**, put the skills in the `tags` array and declare an `icon:` for the
category glyph. Panels group by `category` when an entry declares one, otherwise
by `title`:

```yaml
---
title: "Languages"
icon: terminal
tags: ["Java", "TypeScript", "Python"]
---
```

The hero, the chat's suggested prompts, and the footer's closing line are all
authored here — nothing about the résumé is written in `src/`.

## Navigation
The sidebar is generated from these sections too (`getNav()` in
`src/lib/content.ts`), so it always matches what's on the page.
