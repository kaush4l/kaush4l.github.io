import type { Experience } from '../types';
import GhostStage from './Stage';
import { GHOST_DENSITY, GHOST_STAGE_PROPS } from './plate-data';

/**
 * GHOST TRACE — two lines on one axis, and the résumé is the table between them.
 *
 * A blueprint-cold engineering plate in flat side elevation: a 1px cyan hairline
 * track over a faint grid, checkpoint gates as thin vertical rules, and
 * dimension-style annotations calling out dates the way a schematic labels
 * tolerances. Two traces share the axis — the LIVE line and the GHOST, the same
 * line at 0.38 alpha, which is the 2017 engineer plotted on the same axis eight
 * years earlier. At the seventh gate they occupy the same point for the first
 * time since the start, because that is the year he walked back into IBM Curam
 * eligibility work.
 *
 * A ghost trace is an INSTRUMENTATION term, not a racing one: the faded
 * reference line of a previous run. The columns are "Then" and "Now" —
 * chronology, not judgement. There is no clock, no rank, no personal best and no
 * medal anywhere in this world, and the word "speedrun" appears nowhere. The
 * genre is legible to anyone who recognises the form and invisible to anyone who
 * does not, which is the only correct way to make an in-joke.
 *
 * ── STATUS: BUILT ──────────────────────────────────────────────────────────
 * What the pre-registered stub left for this world's author, and what happened
 * to each of those items:
 *
 *   • `copy` — written below. "Curam" appears in chapter `crossing` and chapter
 *     `return` and nowhere else, so the rhyme lands; every narration is ≤180
 *     characters.
 *   • `stageProps` — `./plate-data.ts`, imported by this file, by the geometry
 *     generator AND by the drawing code, so the config a reviewer reads and the
 *     numbers the art is drawn from are one object.
 *   • `Stage` — built, and imported STATICALLY rather than through
 *     `dynamic(…, { ssr: false })`. The reasoning is in `Stage.tsx`'s header and
 *     it is short: this world declares `rafLoops: 0` and has no motion timeline
 *     to defer, and `ssr: false` would empty the exported HTML of the one thing
 *     this world is the featured card for — a complete employment table that
 *     survives with JavaScript disabled, in a crawler, and on paper.
 *   • the `ghost` block in `src/app/experiences.css` — written, and it holds
 *     only what a custom property cannot express: the registered `@property`,
 *     the scroll timeline, the 8px grid, the lane loop and the plate's geometry.
 *   • `poster` — SHIPPED, as `public/xp/ghost.svg`. The interim shelf drew the
 *     same generated nine-bar chart on all five cards, differing only in hue,
 *     which is the one thing a SELECTION surface may not do. So this world draws
 *     its own argument instead: the reference run and the current one on one
 *     axis, with the area between them filled and the gap dimensioned at each
 *     gate. `titlePath` is not supplied — it is optional, nothing reads it, and
 *     hand-authoring outline data needs a font pipeline this project does not
 *     have. Held inside y 46-176 of a 320x240 viewBox, because the card crops
 *     that one drawing to five aspect ratios and only crops vertically.
 *
 * ── Measured contrast, recomputed rather than inherited ─────────────────────
 * Every ratio below was computed from these hexes with the WCAG 2.1 relative
 * luminance formula, not copied from the spec table (§2.4's audit found three
 * ramps whose claimed ratios were wrong by more than 2:1, and a fourth would
 * have been this one if it had been trusted). On `--xp-bg` / `--xp-surface-alt`:
 *
 *   text     #DCE9F0  15.37 / 11.78      muted    #89A2B0   7.12 / 5.46
 *   accent   #4FD1E0  10.45 /  8.01      link     = accent
 *   counter  #FF9E4A   9.28 (non-text, floor 3.0; one appearance, never a word)
 *   peak     #F0C367  11.52 /  8.83      focus ink on accent fill 10.45
 *   ramp     7.47 → 10.46 on bg · 5.72 → 8.01 on surface-alt, strictly
 *            luminance-monotonic (0.3618 → 0.5269), every stop ≥ 5.0 on the
 *            deepest card, and `--xp-beat-peak` is not `--xp-stage-7`.
 */
const ghost = {
    id: 'ghost',
    label: 'Ghost Trace',
    hint: 'The 2017 line drawn faded beside the 2025 one.',
    premise:
        'A blueprint plate seen in flat side elevation, with two traces on one axis: the engineer '
        + 'who first wrote IBM Curam eligibility rules in 2017, and the one who walked back into '
        + 'them in 2025. Every gate posts a row into a table that only ever grows, so a reader who '
        + 'never scrolls past the first screen still has a complete employment history in front of '
        + 'them.',

    /** The one lit hue over the plate it is drawn on. */
    swatch: ['#4FD1E0', '#071119'],

    /** The plate itself, as the shelf's art. See the header. */
    poster: { kind: 'svg', src: '/xp/ghost.svg' },

    /**
     * A blueprint is a specific darkness and the world's whole argument is that
     * it is unlit and flat — which is what earns its accent the right to be the
     * brightest thing on the page. So it pins, and pinning means owning
     * `--xp-bg` in the map below: the segment's pre-paint script and `tokens()`
     * both read `ground.bg`, so the frame that paints first and the frame
     * hydration settles on are one value by construction.
     *
     * The hue is 15–25° off the accent and it is never `#000`: a pure black
     * ground under a cyan hairline reads as a terminal, not as a plate.
     */
    ground: { stamp: 'dark', bg: '#071119' },

    /**
     * Zero new families, which is why this world is the featured card and ships
     * first — it costs a visitor not one additional byte of font.
     *
     * Display is Archivo 700 (`--font-accession-label`), text is Inter
     * (`--font-sans`), label and data are JetBrains Mono (`--font-mono`). All
     * three are already declared at module scope in `layout.tsx` for the skins,
     * and a face a browser has already fetched is free here.
     */
    fontVariables: [],

    tokens: ({ ground, tier }) => ({
        // ── Ground. `ground!.bg` rather than the literal, so the pre-paint
        // script and this map cannot drift.
        '--xp-bg': ground!.bg,
        '--xp-bg-alt': '#0B1922',
        '--xp-surface': '#12212B',
        '--xp-surface-alt': '#182B37',
        '--xp-text': '#DCE9F0',
        '--xp-text-muted': '#89A2B0',
        '--xp-border': 'rgba(220, 233, 240, 0.13)',
        '--xp-link': '#4FD1E0',

        // ── The only lit hue in the world, and its suppressed twin.
        '--xp-accent': '#4FD1E0',
        '--xp-accent-soft': 'rgba(79, 209, 224, 0.22)',
        // Non-text, one appearance: the "you are here" tick at gate 5. It is the
        // only warm mark on a cold plate, which is exactly why it may never
        // carry a word.
        '--xp-counter': '#FF9E4A',
        // A schematic is drawn, not lit. The glow budget is the lowest of the
        // five and is spent entirely on the active gate.
        '--xp-glow-strength': '0.18',

        '--xp-focus-ink': '#071119',
        '--xp-focus-halo': '#DCE9F0',

        // ── The ramp: CHROMA only, so the world stays monochrome. That
        // restraint is what stops a blueprint from becoming an infographic.
        '--xp-stage-1': '#7FA9B4',
        '--xp-stage-2': '#74B1BF',
        '--xp-stage-3': '#62B9C9',
        '--xp-stage-4': '#53C0D2',
        '--xp-stage-5': '#4AC7D8',
        '--xp-stage-6': '#4ACDDC',
        '--xp-stage-7': '#50D1E0',

        // The convergence, and the only warm-bright value the plate ever shows.
        '--xp-beat-peak': '#F0C367',

        '--xp-atmos-a': 'rgba(79, 209, 224, 0.06)',
        '--xp-atmos-b': 'rgba(220, 233, 240, 0.04)',

        // ── Voice. Three families, none of them new.
        '--xp-font-display': 'var(--font-accession-label), var(--font-sans), system-ui, sans-serif',
        '--xp-font-body': 'var(--font-sans), system-ui, -apple-system, sans-serif',
        '--xp-font-label': 'var(--font-mono), ui-monospace, monospace',
        '--xp-font-mono': 'var(--font-mono), ui-monospace, monospace',

        // ── Choreography. A row slides into the table and never leaves.
        '--xp-beat-distance': tier === 'compact' ? '10px' : '16px',
        '--xp-beat-duration': '560ms',
        '--xp-beat-stagger': '60ms',
        '--xp-beat-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',

        // ── Geometry. The table is the rail, so cinema reserves real width for
        // it; compact gives it the page instead and reserves none.
        //
        // 380 / 300 are §4.1's own numbers for this world's dock, and they are
        // wider than the shared rail's 148px on purpose: the shared rail carries
        // one word per row and this one carries four columns, one of which is a
        // date range that must not wrap.
        '--xp-rail-width': tier === 'cinema' ? '380px' : tier === 'medium' ? '300px' : '0px',
        '--xp-gutter': tier === 'compact' ? '16px' : tier === 'medium' ? '32px' : '48px',
        '--xp-measure': tier === 'compact' ? '36ch' : tier === 'medium' ? '48ch' : '66ch',
        '--xp-nav-h': tier === 'compact' ? '96px' : '0px',
        // Annotation columns in the margin: one at compact, three at cinema.
        // Stated once in `plate-data.ts`, published here, and read there by the
        // drawing code — a number is a token, and this is the same number.
        '--xp-density': String(GHOST_DENSITY[tier]),
    }),

    /** The table IS the chapter rail. */
    spineCostume: 'table',
    /** An instrumentation term for an instrumentation world. */
    companionAlias: 'THE REFERENCE RUN',
    /**
     * The one HUD in the set whose mobile mode is `page`: a table is native to a
     * phone, so at compact the table stops being a dock and becomes the
     * document. That is the most defensible failure mode of the five worlds.
     */
    hud: { kind: 'table', dock: 'right', mobileMode: 'page' },
    ramp: 'chroma',
    /**
     * The flattest display ladder of the five. A schematic earns hierarchy from
     * rule weight and position, not from size jumps.
     */
    scaleDisplay: 1.333,
    density: GHOST_DENSITY,

    /**
     * The nine chapter names and narrations, in this world's voice.
     *
     * Instrumentation register throughout: gates, rules, datums, dimensions and
     * a reference run. Three copy rules, all kept and all checkable — "Curam"
     * appears in `crossing` and `return` and nowhere else; every narration is
     * ≤180 characters; and no narration restates a bullet standing under it,
     * because a narration that repeats its own evidence is the fastest way to
     * make a reader stop reading both.
     */
    copy: {
        origin: {
            chapter: 'The cold plate',
            narration:
                'Two degrees and no run yet. The whole track is drawn ahead of the first gate, so '
                + 'every stop on this plate is legible before anything moves.',
        },
        crossing: {
            chapter: 'The datum',
            narration:
                'New Jersey benefits eligibility, written in Curam SPM. Every altitude on this '
                + 'plate is measured from this gate, and the reference run starts here.',
        },
        trials: {
            chapter: 'Flat section',
            narration:
                'A year and a half where the hard part is other people’s compliance. The gap does '
                + 'not change here, and a flat section is still track.',
        },
        depth: {
            chapter: 'The split opens',
            narration:
                'Cold start measured, then removed. This is the gate where the two traces stop '
                + 'being the same line and the plate has to widen to hold them both.',
        },
        scale: {
            chapter: 'Multi-lane',
            narration:
                'Forty lanes for one gate. The first work whose failure mode is counted in events '
                + 'per hour rather than in tickets per sprint.',
        },
        ignition: {
            chapter: 'You are here',
            narration:
                'The furthest this line ever gets from the gate it started at: agents, retrieval, '
                + 'and models small enough to run with the network unplugged.',
        },
        return: {
            chapter: 'The convergence',
            narration:
                'Eight years on, the same Curam eligibility rules, in another state’s benefits '
                + 'system — and a COBOL batch bridge underneath them.',
        },
        mastery: {
            chapter: 'Past the finish rule',
            narration:
                'Grant software for nonprofits, remediated to AA. The reference run stands at the '
                + 'finish: it was never behind, it was earlier.',
        },
        coda: {
            chapter: 'The plate, complete',
            narration:
                'Seven employers, two degrees, six projects, five skill groups. The table is the '
                + 'whole run and it prints on one sheet.',
        },
    },

    /** The per-chapter plate data. See `plate-data.ts` for what `spread` means. */
    stageProps: GHOST_STAGE_PROPS,

    /**
     * Built, and imported statically. See the header and `Stage.tsx`: this world
     * has no motion timeline to defer and everything to lose by deferring, since
     * its degraded form — the exported HTML with nothing running — is the
     * employment table that is its whole argument.
     */
    Stage: GhostStage,

    telling: {
        compact: { flow: 'scroll', beatsInView: 1, show: ['summary', 'tags'], chrome: 'dots' },
        medium: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org'], chrome: 'dots' },
        cinema: { flow: 'scroll', beatsInView: 3, show: ['summary', 'bullets', 'tags', 'org', 'location'], chrome: 'rail' },
    },

    /**
     * Both traces are positioned by one registered `@property` on
     * `animation-timeline: scroll()`, so the gap between them is pure data and
     * there is no frame loop to budget for. The single plane at ratio 0.16 is
     * the track and grid together; a schematic has no depth, and a five-plane
     * parallax here would be the world's most obvious lie.
     */
    motion: { rafLoops: 0, parallax: true, glowStrength: 0.18 },
} as const satisfies Experience;

export default ghost;
