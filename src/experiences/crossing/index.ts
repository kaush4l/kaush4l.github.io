import { Fraunces, Source_Serif_4 } from 'next/font/google';
import type { Experience } from '../types';
import CrossingStage from './Stage';
import { CHAPTER_ALTITUDE } from './geometry';

/**
 * The two faces, and the one thing in this world that cannot be data (§5.4.1).
 *
 * `next/font/google` is a build-time macro: the bundler has to SEE the family,
 * the axes and the subset as literals to emit `@font-face`, so the call lives at
 * module scope here and only `.variable` crosses the boundary through
 * `fontVariables`. `registry.ts` joins the strings and `layout.tsx` prints the
 * join; neither file is edited again for this world.
 *
 * ── Fraunces, and the two faces that were rejected ─────────────────────────
 * A display serif genuinely DRAWN for its size rather than scaled up to it: the
 * `opsz` axis is why the 145px title card and the 28px chapter heading are two
 * different letterforms instead of one letterform at two sizes. `SOFT` and
 * `WONK` were requested first and then CUT, on measured evidence: the two extra
 * axes cost 52KB of latin woff2 and buy a rounder terminal nobody reading a
 * résumé will ever name. Marcellus and Cinzel were specified and rejected: Trajan-derived
 * Roman capitals over a rising sun is the single element that turns an ascent
 * into self-mythology, and removing them is what lets the luminance ramp carry
 * the climb without the sermon.
 *
 * ── Source Serif 4 is the set's ONE new BODY face ──────────────────────────
 * The font budget across all five worlds allows two new body faces and spends
 * exactly one, here. It buys oldstyle proportional figures for the years that
 * appear INSIDE sentences — the difference between a register that is authored
 * and one that is costumed. Every STACKED date column stays lining and tabular
 * via `.xp-tnum`, which is a direct match on those elements and therefore always
 * outranks the inherited oldstyle.
 *
 * Its `opsz` axis is NOT requested, and that is the second half of the same
 * measurement: `opsz` costs 70KB of latin woff2 on this family, and body text in
 * this world lives between 16 and 19px — a 1.2× range across which an optical
 * size axis moves nothing a reader could point at. The display face spans 28px
 * to 145px, a 5× range, and that is where the axis is worth its weight. MEASURED
 * latin woff2, from the Google Fonts API: Fraunces `opsz`+`wght` 65KB + Source
 * Serif 4 `wght` 49KB = 114KB, inside the ≤120KB-per-world ceiling. With both
 * families at full axes it was 237KB, and nobody would have noticed until the
 * budget was audited.
 *
 * `preload: false` on both, `subsets: ['latin']` on both: nine `preload: false`
 * families are affordable across this site only because no rule selects one
 * until a visitor is actually inside the world that asked for it. And never
 * `font-variation-settings` for weight anywhere — that silently discards the
 * `opsz` axis and disables the browser's own weight interpolation.
 */
const crossingDisplay = Fraunces({
    subsets: ['latin'],
    axes: ['opsz'],
    display: 'swap',
    preload: false,
    variable: '--font-crossing-display',
});

const crossingBody = Source_Serif_4({
    subsets: ['latin'],
    display: 'swap',
    preload: false,
    variable: '--font-crossing-body',
});

/**
 * THE CROSSING — one ascent through a dawn. The ground falls away, the light
 * warms, and at the top you are reminded of a strength you already had.
 *
 * Pre-dawn to sunrise, seen from increasing altitude. The ground is a warm
 * near-black — night over a coastline, not outer space. Three procedural layers
 * and no more: a horizon band that descends as you scroll; five parallax
 * silhouette planes of land drawn as inline SVG paths of ≤3KB each; and a single
 * vertical ARC — one path with `pathLength="1"` whose `stroke-dashoffset` is
 * driven by scroll, painting a gold line from the bottom of the document to the
 * top.
 *
 * ── The figure is never drawn ───────────────────────────────────────────────
 * No face, no body, no likeness, no tail, no ornament, no devanagari. The
 * subject is present as SCALE and LIGHT — the silhouettes shrink chapter by
 * chapter while the arc brightens — which is how the leap is treated in
 * classical relief anyway. Marcellus and Cinzel were specified and rejected:
 * Trajan-derived Roman capitals over a rising sun is the single element that
 * makes an ascent read as self-mythology, and removing them is what lets the
 * luminance ramp carry the climb without the sermon.
 *
 * ── The myth, stated once ───────────────────────────────────────────────────
 * Hanuman was cursed as a boy to forget his own powers until he was reminded of
 * them at the moment he had to cross. Chapter 6 — walking back into IBM Curam
 * eligibility work eight years later — IS that reminder, and it is the only
 * place the world says so, in one ≤180-character narration. If a reader cannot
 * state the connection after one pass, the mythology is decoration and it gets
 * cut. **The narration never describes feelings**; it describes weather, land
 * and light, and lets the reader draw the arc. The words *journey*, *passion*
 * and *grit* are lint-banned in this world's copy.
 *
 * ── STATUS: COMPLETE ───────────────────────────────────────────────────────
 * Two faces, nine chapters of copy, nine chapters of stage data, one `Stage`
 * that adds the sky and hands the reading to the shared one, and one delimited
 * block in `experiences.css`. What is deliberately NOT here:
 *
 *   • No `Atmosphere`. The frame mounts that slot at `z-index: -1`, which paints
 *     BELOW the opaque `body` background this route requires (`experiences.css`
 *     §2 plus MUI's `CssBaseline`), so a sky put there would be painted and then
 *     covered. The sky is a fixed `z-index: 0` layer inside `Stage` instead —
 *     above the ground, below `.xp-plane-flow`'s `z-index: 1` — which keeps the
 *     two-plane law exactly and restates every guarantee the slot would have
 *     given (`aria-hidden`, `role="presentation"`, pointer-transparent,
 *     `.no-print`). See the header of `Stage.tsx`.
 *   • No `Poster` COMPONENT. `poster` itself now ships as a static file
 *     (`/xp/crossing.svg`, below): `titlePath` was made optional once it was
 *     established that nothing reads it, so the toll that kept all five worlds
 *     posterless — hand-authoring outline data without a font pipeline — is
 *     gone. The card sets the world's name from `label` in the dashboard's own
 *     neutral face, so no display family is fetched to draw one card, and the
 *     art carries no lettering at all. The live-preview component slot stays
 *     unused: this world's card is a still, and a still is a file.
 *
 * ── Measured contrast, on `--xp-bg` / `--xp-surface-alt` ────────────────────
 *   text     #F3E7D3  16.09 / 13.17      muted    #A2907A   6.37 / 5.22
 *   accent   #E8B44A  10.35 /  8.48      link     = accent
 *   counter  #7FB3A6   8.33 (non-text, atmosphere only, ≤40% opacity)
 *   peak     #F6D488  13.76 / 11.26      focus ink on accent fill 10.35
 *   ramp     6.42 → 11.57 on bg · 5.26 → 9.47 on surface-alt, monotonic
 *
 * The ramp's hue path runs 201° → 100° → 53° → 47° → 45° → 42° → 42° THROUGH
 * DESATURATED NEUTRALS, never through saturated green. A naïve interpolation
 * between the endpoints travels the wrong way round the wheel and produces a
 * rainbow, which is exactly the antipattern the single-lit-hue rule forbids.
 * `--xp-beat-peak` is deliberately distinct from `--xp-stage-7` so the peak is
 * not merely "the next rung".
 */
const crossing = {
    id: 'crossing',
    label: 'The Crossing',
    hint: 'Nine years as one ascent through a dawn. Altitude is time.',
    premise:
        'One ascent from a night coastline into sunrise, where scroll is altitude and altitude is '
        + 'time. Five silhouette planes shrink beneath a single gold arc as the light warms. Near '
        + 'the top the coastline from the first chapter returns, far below and a ninth the size, '
        + 'and the arc touches it — the same eligibility system, eight years on.',

    /** The dawn light over the night it rises out of. */
    swatch: ['#E8B44A', '#100A06'],

    poster: { kind: 'svg', src: '/xp/crossing.svg' },

    /**
     * A warm near-black: night over a coastline, not outer space. The whole
     * world is a luminance argument, so the darkest value in it has to be a
     * colour rather than an absence of one.
     */
    ground: { stamp: 'dark', bg: '#100A06' },

    fontVariables: [crossingDisplay.variable, crossingBody.variable],

    tokens: ({ ground, tier }) => ({
        '--xp-bg': ground!.bg,
        '--xp-bg-alt': '#17100A',
        '--xp-surface': '#221711',
        '--xp-surface-alt': '#2C1E16',
        '--xp-text': '#F3E7D3',
        '--xp-text-muted': '#A2907A',
        '--xp-border': 'rgba(243, 231, 211, 0.13)',
        '--xp-link': '#E8B44A',

        '--xp-accent': '#E8B44A',
        '--xp-accent-soft': 'rgba(232, 180, 74, 0.22)',
        // Non-text, atmosphere only, and never above 40% opacity: the cool
        // sea-light under the horizon before the sun reaches it.
        '--xp-counter': '#7FB3A6',
        // The horizon band ignites once, at the turn. Chapter 7 is full daylight
        // with NO glow at all, which is what keeps chapter 6 the peak.
        '--xp-glow-strength': '0.28',

        '--xp-focus-ink': '#100A06',
        '--xp-focus-halo': '#F3E7D3',

        // ── The ramp: dusk → gold, LUMINANCE, and it is the ascent itself.
        // Every stop clears 5.2:1 on the deepest card, so any stop may legally
        // carry a role title.
        '--xp-stage-1': '#85969F',
        '--xp-stage-2': '#959F90',
        '--xp-stage-3': '#AAA686',
        '--xp-stage-4': '#BDAD75',
        '--xp-stage-5': '#CFB569',
        '--xp-stage-6': '#E2BA5A',
        '--xp-stage-7': '#F0C04E',

        // The return. This colour appears here and on this chapter's rail dot,
        // nowhere else in the world.
        '--xp-beat-peak': '#F6D488',

        '--xp-atmos-a': 'rgba(232, 180, 74, 0.06)',
        '--xp-atmos-b': 'rgba(127, 179, 166, 0.04)',

        // Georgia is the fallback on both because it is the one serif present
        // on every desktop and phone this site is read on — a serif world whose
        // fallback is a sans changes register the moment the network is slow.
        '--xp-font-display': 'var(--font-crossing-display), Georgia, serif',
        '--xp-font-body': 'var(--font-crossing-body), Georgia, serif',
        '--xp-font-label': 'var(--font-mono), ui-monospace, monospace',
        '--xp-font-mono': 'var(--font-mono), ui-monospace, monospace',

        '--xp-beat-distance': tier === 'compact' ? '12px' : '18px',
        '--xp-beat-duration': '560ms',
        // 90ms, raised from the shared 60ms because this is the slowest of the
        // five worlds. 110ms is the hard ceiling and this is not near it.
        '--xp-beat-stagger': '90ms',
        '--xp-beat-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',

        // 200px at cinema rather than 260: this world spends 34vw of the screen
        // on the picture, and a rail that keeps its full width there does it by
        // taking the difference out of the measure, which is the wrong side of
        // that trade. The rail still holds nine company names at 13px.
        '--xp-rail-width': tier === 'cinema' ? '200px' : tier === 'medium' ? '148px' : '0px',
        '--xp-gutter': tier === 'compact' ? '16px' : tier === 'medium' ? '32px' : '48px',
        // 60ch at cinema, not the 66ch the shared ladder suggests and not the
        // 72ch a serif could carry: the two-pane layout gives the picture 34vw,
        // and a measure declared wider than the column that survives is a
        // measure that never applies. Stating the true number is what keeps this
        // token honest — a serif at 60ch is still the most comfortable reading
        // in the set.
        '--xp-measure': tier === 'compact' ? '36ch' : tier === 'medium' ? '48ch' : '60ch',
        '--xp-nav-h': tier === 'compact' ? '96px' : '0px',
        // Silhouette planes drawn. Compact draws one and parallaxes none, which
        // is why the altitude ramp is COLOUR rather than animation — the single
        // most important narrative signal survives at compact, in greyscale, and
        // on paper.
        '--xp-density': tier === 'compact' ? '1' : tier === 'medium' ? '3' : '5',
    }),

    spineCostume: 'altimeter',
    /** The one who carries the crossing, never the one who makes it. */
    companionAlias: 'the Vahana',
    hud: { kind: 'inventory', dock: 'bottom-left', mobileMode: 'coda-only' },
    ramp: 'luminance',
    scaleDisplay: 1.5,
    density: { compact: 1, medium: 3, cinema: 5 },

    telling: {
        compact: { flow: 'scroll', beatsInView: 1, show: ['summary', 'tags'], chrome: 'dots' },
        medium: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org'], chrome: 'dots' },
        cinema: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org', 'location'], chrome: 'rail' },
    },

    /**
     * Everything scroll-linked — the arc's `stroke-dashoffset`, the horizon
     * descent, the five parallax planes — is CSS `animation-timeline:
     * view()/scroll()` inside `@supports`, with the FINAL state as the
     * unconditional default. That is the exact pattern already proven at
     * `src/app/skin-sanctum.css:259`, and the unconditional final state is what
     * makes the world complete for a browser that supports none of it.
     *
     * Scroll-TRIGGERED chapter entrances stay on the shipped `Reveal.tsx`. Zero
     * rAF loops: the whole atmosphere is CSS. Chapter 6 alone gets the 120ms dead
     * hold plus the 900ms arrival; chapters 2 and 7 get a 240ms fade and nothing
     * else.
     */
    motion: { rafLoops: 0, parallax: true, glowStrength: 0.28 },

    /**
     * Nine chapter names and nine narrations, under three rules the world is
     * graded on and one it is linted on.
     *
     *   1. The narration NEVER describes feelings. It describes weather, land
     *      and light, and lets the reader draw the arc themselves. A line that
     *      says how the climb felt is a line asking for reverence, which is the
     *      exact failure that sank the mythic candidates in review.
     *   2. It is additive — it never restates a bullet standing directly beneath
     *      it. A narration that repeats its own evidence is the fastest way to
     *      make a reader stop reading both.
     *   3. "Curam" appears in `crossing` and in `return` and NOWHERE else, so
     *      the rhyme lands as a rhyme. That is the one fact this whole feature
     *      exists to make legible, and it is stated twice, eight years apart.
     *
     * And the lint: the words *journey*, *passion* and *grit* are banned in this
     * world's copy. Every string below is ≤180 characters.
     *
     * The myth is stated ONCE, in `return`, without a name: cursed as a boy to
     * forget his own strength until the crossing in front of him required it. If
     * a reader cannot state the connection to the chapter after one pass, the
     * mythology was decoration and it gets cut.
     */
    copy: {
        origin: {
            chapter: 'Sea level',
            narration:
                'Chennai, and the coast runs dark in both directions. The horizon sits high in the frame; from down here it is the only line there is.',
        },
        crossing: {
            chapter: 'The crossing',
            narration:
                'Charlotte, then Princeton. Curam eligibility rules for New Jersey benefits, and the first light leaves the coast heading out over open water.',
        },
        trials: {
            chapter: 'Cloud cover',
            narration:
                'Malvern, under a shelf of cloud. The ground is not visible from here — consent, audit trails, and the plumbing that carries them.',
        },
        depth: {
            chapter: 'Above the weather',
            narration:
                'Redwood City, above the weather. The air is thin and cold, the ground is gone, and what is left to measure is cold start and throughput.',
        },
        scale: {
            chapter: 'The width of it',
            narration:
                'San Francisco, where the light stops climbing and widens instead. Twelve fine lines run past the wing: change data, an hour at a time.',
        },
        ignition: {
            chapter: 'The turn',
            narration:
                'Research Triangle Park, and the horizon takes fire. Retrieval over a hundred gigabytes, agents that reason in steps, a model kept inside the fence.',
        },
        return: {
            chapter: 'The return',
            narration:
                'Raleigh. Curam eligibility again, eight years on. The boy in the story was cursed to forget his own strength until the crossing in front of him required it.',
        },
        mastery: {
            chapter: 'Full light',
            narration:
                'Durham, in full daylight and no glow at all. Grant systems for nonprofits, and an accessibility pass that closes clean against the standard.',
        },
        coda: {
            chapter: 'Landfall',
            narration:
                'The line is flat now and the light is ordinary. Everything carried up is here, and the model that reads it back runs on your own machine.',
        },
    },

    /**
     * The pressure-release valve (§5.4.2), and in this world it holds three
     * numbers and one enum per chapter — nothing that a token could have held.
     *
     * `altitude` is NOT typed here: it is a weighted prefix-sum over the spine's
     * own `weight` column, computed in `geometry.ts`. Re-weight a chapter in
     * `story.ts` and its pip, its echo and its share of the sky all move
     * together. A world that hard-coded nine altitudes would be a world with a
     * second opinion about the shape of the career, and the two would drift on
     * the first edit.
     *
     * `plane` names which of the five silhouettes is this chapter's foreground,
     * and it is the field the peak is built out of: `return` echoes `crossing`
     * (declared once, on the spine), and this world's answer is "draw the
     * ECHOED chapter's plane at a ninth of the size". `crossing.plane` is
     * `coast`, so the coastline is what comes back — the same path string, not a
     * redrawing of it. Nothing in `Stage.tsx` knows the word `return`.
     *
     * `quiet` is chapters 2 and 7, the two the spec makes deliberately dim so
     * chapter 6 has something to be bright against. The stylesheet reads it off
     * the chapter element; it is stated here so the reason is in the config and
     * not buried in a selector.
     */
    stageProps: {
        origin: { altitude: CHAPTER_ALTITUDE.origin, plane: 'cornice', quiet: false },
        crossing: { altitude: CHAPTER_ALTITUDE.crossing, plane: 'coast', quiet: false },
        trials: { altitude: CHAPTER_ALTITUDE.trials, plane: 'shelf', quiet: true },
        depth: { altitude: CHAPTER_ALTITUDE.depth, plane: 'sea', quiet: false },
        scale: { altitude: CHAPTER_ALTITUDE.scale, plane: 'ridge', quiet: false },
        ignition: { altitude: CHAPTER_ALTITUDE.ignition, plane: 'sea', quiet: false },
        return: { altitude: CHAPTER_ALTITUDE.return, plane: 'sea', quiet: false },
        mastery: { altitude: CHAPTER_ALTITUDE.mastery, plane: 'sea', quiet: true },
        coda: { altitude: CHAPTER_ALTITUDE.coda, plane: 'sea', quiet: false },
    },

    /**
     * Imported STATICALLY, not through `dynamic(..., { ssr: false })`.
     *
     * The E1 rule defers a stage that owns a motion TIMELINE, and this one owns
     * none — the sky is CSS scroll-linked animation with its final state as the
     * unconditional default, and there is not a rAF loop or a scroll listener in
     * the world. What this stage does own is the shared stage underneath it,
     * which carries every word of the résumé. Deferring it would export a page
     * whose entire story arrives one paint late: invisible to a crawler,
     * invisible with JS off, and exactly the failure the engine plan rejects
     * client-side parsing for.
     */
    Stage: CrossingStage,
} as const satisfies Experience;

export default crossing;
