import { Space_Grotesk } from 'next/font/google';
import type { Experience } from '../types';
import { TRUNK_BRANCHES } from './branches';
import TrunkStage from './Stage';

/**
 * TRUNK — nine years as one repository, and a 2017 commit cherry-picked onto
 * 2025's HEAD.
 *
 * A git DAG drawn the way a very good terminal client would draw it if someone
 * spent a year on it. No room, no landscape — a graph on a ground, in hairlines.
 * The camera pans along the trunk; it never rotates and never scales past 1.06.
 * Scroll advances in commit order, OLDEST FIRST, because this is a `--reverse`
 * log and the header says so.
 *
 * ── The craft signal is that the DAG is real ────────────────────────────────
 * Merges land on the parents the config declares, hashes are the first seven
 * characters of a stable build-time hash of the content slug, and branch names
 * are the content slugs. Every node's label is the REAL role title and date
 * range from `content/03-experience` and nothing else. No invented commit
 * messages, no ASCII art, no fake prompt, no typing animation, no
 * `git commit -m "got promoted"`. An engineer spots a fake DAG instantly and the
 * respect inverts — which is why this world is either exact or it is not shipped.
 *
 * ── WHAT IS CODE HERE, AND WHY IT IS ONLY THIS ─────────────────────────────
 * Three files and one delimited CSS block. `branches.ts` is nine integers and
 * nine slugs; `dag.ts` turns those plus the resolved spine into coordinates;
 * `Graph.tsx` is a `.map` over those coordinates; `Stage.tsx` is a two-column
 * grid that composes the SHARED `Stage` rather than forking it. Everything else
 * this world is — the palette, the ramp, the near-flat display ladder, the nine
 * narrations, the three tellings, the motion budget — is the object below.
 *
 * The one thing that could not be config is the second PLANE. Two-plane law
 * (§2.1) is geometry: a full-height sticky graph beside a flow is not a number,
 * so it is not a token. Everything downstream of that decision is.
 *
 * ── Measured contrast, on `--xp-bg` / `--xp-surface-alt` ────────────────────
 *   text     #E6EFE9  16.63 / 13.82      muted    #8E9C93   6.81 / 5.66
 *   accent   #7CE0A0  12.11 / 10.07      link     = accent
 *   counter  #4C6BF0   4.34 (non-text, floor 3.0)
 *   peak     #E8B44A  10.28 /  8.54      focus ink on accent fill 12.11
 *   ramp     6.35 → 12.13 on bg · 5.28 → 10.08 on surface-alt, monotonic
 *
 * That ramp is a CORRECTION. The values that arrived from research (`#43584C`,
 * `#4E6A5A`, `#5A7D68`) measured 2.12 / 2.73 / 3.53 on `#1B221E` against a
 * claimed "≥ 4.9:1" and would have shipped three unreadable stops. Do not
 * restore them.
 */

// ─── The face ───────────────────────────────────────────────────────────────

/**
 * The one new family this world buys: ~28KB of latin woff2.
 *
 * The call is here, at module scope, with literal options, because
 * `next/font/google` is a BUILD-TIME MACRO — the bundler has to see the family,
 * the weights and the subsets to emit the `@font-face` rules, and
 * `Google_Font(someConfigObject)` does not compile. Only the `.variable` string
 * crosses into the schema, via `fontVariables`; `registry.ts` joins every
 * world's strings and `layout.tsx` prints the join.
 *
 * `preload: false` is the line that makes nine extra families across five worlds
 * affordable at all: a browser fetches a face when a rule selects it, and no
 * rule selects this one until a visitor is inside Trunk. `display: 'swap'` so a
 * cold cache shows the fallback rather than a blank title card.
 *
 * Two weights, not four. A near-flat 1.125 display ladder (44/50/56px) needs a
 * 500 for chapter headings and a 700 for the one display line, and a face with
 * more weights than a design uses is bytes nobody reads.
 */
const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '700'],
    display: 'swap',
    preload: false,
    variable: '--font-trunk-display',
});

const trunk = {
    id: 'trunk',
    label: 'Trunk',
    hint: 'The career as one repository. Branch, merge, one cherry-pick eight years long.',
    premise:
        'A git DAG of nine years, walked oldest first. Every employer is a branch that forks, runs '
        + 'its commits and merges back; every project is a commit on the branch that earned it. In '
        + '2025 an amber arc reaches back to a 2017 commit tagged curam and lands it on HEAD — the '
        + 'same eligibility system, cherry-picked eight years later by the engineer who wrote it.',

    /** The one lit hue over the near-black it is drawn on. */
    swatch: ['#7CE0A0', '#0A0D0C'],

    /**
     * The card's art: the DAG itself, at a glance.
     *
     * A trunk running left to right, branches that fork and merge back onto it,
     * one quiet branch below, the `scale` fan, the lit branch, HEAD as a ring —
     * and the amber cherry-pick arc reaching from the 2017 commit to it. No
     * text, no labels, no `titlePath`: the world's argument is a SHAPE, and the
     * shape is the only thing a 320×240 crop can carry honestly.
     *
     * `titlePath` is deliberately absent. Nothing reads it (see `types.ts`), and
     * hand-authoring outline data needs a font pipeline this repo does not have
     * — which was the whole reason this world shipped no poster at all and the
     * shelf showed the same generated nine-bar chart five times.
     */
    poster: { kind: 'svg', src: '/xp/trunk.svg' },

    /**
     * A green-tinted near-black, 18° off the accent. A terminal client's ground
     * is the world's whole premise, so it pins and owns `--xp-bg` below.
     */
    ground: { stamp: 'dark', bg: '#0A0D0C' },

    /**
     * This world's one new family, and the join `layout.tsx` prints.
     *
     * `preload: false` + latin subset is not optional: nine extra families
     * across five worlds are affordable only because a browser fetches a face
     * when a rule selects it, and no rule selects another world's face. See
     * `spaceGrotesk` at the top of this file for the rest of the argument.
     */
    fontVariables: [spaceGrotesk.variable],

    tokens: ({ ground, tier }) => ({
        '--xp-bg': ground!.bg,
        '--xp-bg-alt': '#101513',
        '--xp-surface': '#161C19',
        '--xp-surface-alt': '#1B221E',
        '--xp-text': '#E6EFE9',
        '--xp-text-muted': '#8E9C93',
        '--xp-border': 'rgba(230, 239, 233, 0.13)',
        '--xp-link': '#7CE0A0',

        '--xp-accent': '#7CE0A0',
        '--xp-accent-soft': 'rgba(124, 224, 160, 0.22)',
        // Non-text. Semantic diff colours (add `#66C08A`, remove `#E06C6C`) are
        // icons and 1px rules only and are NOT tokens: `#E06C6C` never carries
        // text, so it never needs a measured slot.
        '--xp-counter': '#4C6BF0',
        // Spent on exactly one thing: the 32px radial bloom behind the active
        // commit. Only the walked path emits; unwalked graph is a hairline at 34%.
        '--xp-glow-strength': '0.35',

        '--xp-focus-ink': '#0A0D0C',
        '--xp-focus-halo': '#E6EFE9',

        // ── The ramp: SATURATION on the one hue, monochrome.
        '--xp-stage-1': '#7C9A88',
        '--xp-stage-2': '#7BA98E',
        '--xp-stage-3': '#7AB692',
        '--xp-stage-4': '#79C296',
        '--xp-stage-5': '#79CD99',
        '--xp-stage-6': '#7BD79D',
        '--xp-stage-7': '#7DE0A1',

        // The cherry-pick arc, and nothing else in the world is amber.
        '--xp-beat-peak': '#E8B44A',

        // `--xp-atmos-a` / `--xp-atmos-b` are DELIBERATELY ABSENT. This world
        // declares no `Atmosphere`, and the stylesheet default for both is
        // `transparent` — "a world that declares none must paint nothing at
        // all". Declaring two colours nothing reads would be a palette entry
        // nobody could find the rendering of, which is exactly the kind of dead
        // config `Skin.SectionRenderer` is the cautionary tale for. The graph is
        // this world's atmosphere, and it is a plane, not a wash.

        // Space Grotesk at >= 44px ONLY. The handoff law (3 lines / 90
        // characters / 24px) is not negotiable and Inter carries every bullet,
        // every role description and every form control — which is also why
        // `--xp-font-body` below is the already-loaded face and this world costs
        // zero new BODY bytes.
        '--xp-font-display': 'var(--font-trunk-display), var(--font-sans), system-ui, sans-serif',
        '--xp-font-body': 'var(--font-sans), system-ui, -apple-system, sans-serif',
        '--xp-font-label': 'var(--font-mono), ui-monospace, monospace',
        '--xp-font-mono': 'var(--font-mono), ui-monospace, monospace',

        '--xp-beat-distance': tier === 'compact' ? '10px' : '16px',
        '--xp-beat-duration': '560ms',
        '--xp-beat-stagger': '60ms',
        '--xp-beat-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',

        '--xp-rail-width': tier === 'cinema' ? '260px' : tier === 'medium' ? '148px' : '0px',
        // Tight at compact ON PURPOSE. The graph column is a real 44px of the
        // 390px screen, so the flow's own padding is the budget that has to give
        // — 12px + 44px puts the first character of a bullet 56px from the edge,
        // which is where a terminal puts it after the graph column, and leaves
        // the measure at the 36ch this tier declares below.
        '--xp-gutter': tier === 'compact' ? '12px' : tier === 'medium' ? '32px' : '48px',
        '--xp-measure': tier === 'compact' ? '36ch' : tier === 'medium' ? '48ch' : '66ch',
        '--xp-nav-h': tier === 'compact' ? '96px' : '0px',
        // Graph lanes drawn at once. At compact the DAG collapses to a single
        // vertical spine — which is what `git log --graph` looks like in a narrow
        // terminal, and therefore the honest telling rather than a compromise.
        '--xp-density': tier === 'compact' ? '1' : tier === 'medium' ? '3' : '5',
    }),

    /**
     * The nine chapters in this world's voice. Nine `git` verbs, and not one of
     * them is a commit message: a `chapter` is an 11px 0.55-alpha SUBTITLE under
     * the rail's real label (the company name), never the heading and never the
     * rail entry.
     *
     * Every narration is ADDITIVE — it never restates a bullet, because a
     * narration that repeats the evidence beneath it is the fastest way to make
     * a reader stop reading both — and every one is under the 180-character cap.
     * "Curam" appears in `crossing` and in `return` and nowhere else in this
     * file's narrations, which is the whole mechanism by which the rhyme lands.
     */
    copy: {
        origin: {
            chapter: 'init',
            narration:
                'One commit, no parents. Four years of B.Tech at SRM, and the trunk line is the '
                + 'only stroke on screen.',
        },
        crossing: {
            chapter: 'branch',
            narration:
                'Two lines run in parallel: a master\'s at Charlotte and a first job on Curam '
                + 'eligibility. They merge in 2018. That commit carries a tag.',
        },
        trials: {
            chapter: 'checkout',
            narration:
                'Patient data under HIPAA, then the infrastructure underneath it. A short branch, '
                + 'four commits, and deliberately no bloom.',
        },
        depth: {
            chapter: 'rebase',
            narration:
                'Two years spent making one thing fast instead of many things new. The commit card '
                + 'carries the diff: red minus over green plus.',
        },
        scale: {
            chapter: 'partition',
            narration:
                'The branch splits into five parallel lines and merges back inside one screen. '
                + 'That is what the throughput actually looked like.',
        },
        ignition: {
            chapter: 'feat',
            narration:
                'The branch turns from a hairline to two pixels. Three child commits carry the '
                + 'agents, and the model on your own machine starts loading here.',
        },
        return: {
            chapter: 'cherry-pick',
            narration:
                'An amber arc reaches back eight years and lands the 2017 Curam commit on HEAD. '
                + 'Same eligibility system, same engineer, different decade.',
        },
        mastery: {
            chapter: 'HEAD',
            narration:
                'The trunk resolves to a single node, drawn as a ring rather than a fill. '
                + 'Accessibility work, and the site you are reading this in.',
        },
        coda: {
            chapter: 'diff --stat',
            narration:
                'The cumulative stat: nine years, seven employers, five groups of files changed. '
                + 'The Archivist is loaded and has nothing to sell you.',
        },
    },

    /**
     * The nine branch columns, authored as integers. See `branches.ts` — this is
     * the same object the graph reads, published to the schema once rather than
     * declared twice.
     */
    stageProps: TRUNK_BRANCHES,

    /**
     * The two-plane layout. Composes the shared `Stage` rather than forking it;
     * imported statically because this world's timeline is CSS and an `ssr:
     * false` here would export a page whose whole story arrives a paint late.
     */
    Stage: TrunkStage,

    spineCostume: 'graph',
    /** It keeps the history; it does not comment on it. */
    companionAlias: 'the Archivist',
    ramp: 'saturation',
    /**
     * A near-flat ladder — 44/50/56px only. That is what makes a machine read as
     * a machine; a 1.5 ratio here would make the graph look like a marketing page
     * about graphs.
     */
    scaleDisplay: 1.125,
    density: { compact: 1, medium: 3, cinema: 5 },

    /**
     * Three retellings, one story — never one telling with things hidden.
     *
     * The beat count is identical at all three widths and so is the node count
     * in the graph: `TellingSpec.show` cannot express "hide", and the graph
     * collapses its lanes rather than dropping branches. What actually changes:
     *
     *   compact  one commit card at a time, full evidence, on a single 1px
     *            spine — which is exactly what `git log --graph` looks like in a
     *            narrow terminal, and is therefore the honest telling at 390px
     *            rather than a desktop graph with the branches taken out.
     *   medium   two cards side by side, three lanes, and the employer restated
     *            on each card so a pair can be compared without scrolling back
     *            to the chapter heading.
     *   cinema   two cards, five lanes, branch names and hashes drawn on the
     *            graph, location on the card, and the full employer rail.
     *
     * `bullets` is shown at EVERY tier, including compact. The engine permits
     * dropping them, and it would be the wrong economy here: a phone is the most
     * likely place this résumé is read at all, and the evidence is the résumé.
     */
    telling: {
        compact: { flow: 'scroll', beatsInView: 1, show: ['summary', 'bullets', 'tags'], chrome: 'dots' },
        medium: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org'], chrome: 'dots' },
        cinema: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org', 'location'], chrome: 'rail' },
    },

    /**
     * Edge draw is `stroke-dasharray`/`dashoffset` from one registered
     * `@property` on `animation-timeline: scroll()`, consumed by every plane
     * through `calc()`: one timeline, five consumers, zero JS. Node bloom is a
     * pseudo-element opacity ramp and NEVER an animated `box-shadow`. Three
     * planes — future graph 0.16, walked history 0.08, commit card 0.
     */
    motion: { rafLoops: 0, parallax: true, glowStrength: 0.35 },
} as const satisfies Experience;

export default trunk;
