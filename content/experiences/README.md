# Experience Center

Each `.md` file here (except `_center.md` and this README) is one page at
`/experience/<file-name>/`. Add a file, run `bun run build`, and the page plus
its card on `/experience/` appear. Nothing else to register.

## Frontmatter

| key | required | meaning |
|---|---|---|
| `theme` | yes | renderer: `google`, `linkedin`, `github`, `youtube` (see `src/xp/registry.ts`) |
| `id` | no | URL slug; defaults to the file name |
| `order` | no | position on the center page |
| `title` | yes | card + tab title |
| `card.tagline`, `card.blurb` | no | center-page card copy |
| `tokens` | no | sizes etc., emitted as `--xp-<key>` |
| `palette.light`, `palette.dark` | yes | colours, emitted as `--xp-<key>`; dark inherits missing keys from light and applies when the site is in dark mode. `brand-*` keys show as dots on the card |
| `labels` | yes | every visible string; copy an existing file of the same theme as the template |

The markdown body is the intro text. Résumé data itself comes from the
numbered `content/0*-*` folders, mapped in `_center.md` → `sources`.

A second page reusing a renderer (e.g. a light-only Google variant) is just a
copy of `google.md` with a new file name and different labels/palette.
