import dynamic from 'next/dynamic';
import { Bricolage_Grotesque } from 'next/font/google';
import { CHAPTER_IDS } from '../types';
import type { ChapterId, Experience, WorldProps } from '../types';
import { STATION_LIST } from './geometry';
import OverworldAtmosphere from './Atmosphere';

/**
 * OVERWORLD — a hand-drawn world map with nine stations, one route, and an
 * inventory that fills as you walk it.
 *
 * The map screen between levels, drawn rather than rendered. A flat elevation on
 * a deep navy ground, lit by a single warm source; nine stations on one
 * continuous route running top to bottom, side-paths branching to project
 * waypoints, and a small turned token that advances along the route. Never
 * isometric — an isometric tile grid is one taste slip from a corporate
 * journey-map slide, and it is unreadable at 390px.
 *
 * ── What makes it playable rather than a toy ────────────────────────────────
 * It is a DIORAMA ON RAILS: traversal only. No score, no lives, no timer, no
 * fail state, no death, no locked level, no input-driven jump, and no pixel
 * font. A hiring manager cannot be bad at reading a résumé. The token has no
 * face and no walk cycle — it is an 18px marker, so there is nothing to watch
 * while there is something to read. The HUD earns its register from GEOMETRY (an
 * 8px grid, integer sizes, one hairline), never from a costume face, and the
 * body face is Inter, identical to the plain résumé, so the type never signals
 * arcade.
 *
 * The strongest property of a map is that the whole journey is visible before
 * you move — the same affordance as a table of contents wearing a costume. Every
 * station is on screen and clickable at all times. The route ahead is drawn
 * lower than the route behind: **the progress bar is the map itself, and it
 * cannot lie, because it is drawn from the same array the content comes from.**
 *
 * ── Where the world actually lives ──────────────────────────────────────────
 *   this file          palette, ramp, per-tier geometry, the nine chapter names
 *                      and narrations, the font, and the station table mirrored
 *                      into `stageProps`.
 *   `geometry.ts`      every coordinate, derived from the spine's own weights.
 *   `symbols.tsx`      eight `<symbol>`s. `civic` is ONE node, used at station 1
 *                      and again at station 6 — the rhyme, enforced by the DOM.
 *   `Stage.tsx`        wiring: the map, the rail, the inventory, the flow.
 *   `experiences.css`  the one scroll timeline and its six consumers.
 *
 * ── Measured contrast, on `--xp-bg` / `--xp-surface-alt` ────────────────────
 *   text     #E9EDF7  16.16 / 12.52      muted    #96A0BE   7.27 / 5.64
 *   accent   #FFC53D  12.00 /  9.30      link     = accent
 *   counter  #4C6BF0   4.21 (non-text, floor 3.0 — sky wash, shadow tint)
 *   peak     #F0C367  11.46 /  8.88      focus ink on accent fill 12.00
 *   ramp     9.85 → 12.08 on bg · 7.64 → 9.36 on surface-alt, monotonic
 *   composited surfaces, computed rather than assumed:
 *     sky (bg + accent 6% + counter 4%) = #1C1E2A · text 14.13 · muted 6.36
 *     chrome panel at 88% ground over the BRIGHTEST ramp stop = #282624 ·
 *       text 12.87 · muted 5.79 — so the rail, the pill and the inventory clear
 *       their floors wherever on the map they happen to land.
 *
 * That ramp is a CORRECTION. The researched cyan→sunset ramp ended on a deep
 * orange and was NOT monotonic — it rose then fell on `--xp-surface-alt` — which
 * would have destroyed the greyscale reading. It now ends on the world's own
 * light.
 */

/**
 * The one new family this world buys, and the only one.
 *
 * `next/font/google` is a build-time macro (§5.4.1): the bundler must see the
 * family, the axes and the subset as literals to emit `@font-face`, so the call
 * lives here at module scope and only `.variable` crosses into `fontVariables`.
 *
 * Bricolage Grotesque is a variable grotesque with `opsz` and `wdth` axes — a
 * display face that gets tighter and more confident as it gets bigger, which is
 * what a station lockup wants and what a static weight cannot do. `opsz` is left
 * to `font-optical-sizing: auto` so the same declaration serves 28px and 145px;
 * `wdth: 96` is set once in the world's CSS block for lockups.
 *
 * **Deliberate omission: no pixel face anywhere.** Press Start 2P is the single
 * fastest way to make this read as a toy. Nunito — a rounded body face — was
 * rejected for the same reason: it would spend the one remaining body-face
 * budget to make a résumé look friendlier, which is the opposite of the goal.
 * Inter carries every bullet, exactly as it does on `/`.
 */
const displayFace = Bricolage_Grotesque({
    subsets: ['latin'],
    // `swap` guarantees the station names render even if the face never
    // arrives; `preload: false` is the rule every experience face follows, and
    // it is affordable only because no rule selects this face until a visitor is
    // inside this world.
    display: 'swap',
    preload: false,
    axes: ['opsz', 'wdth'],
    variable: '--font-overworld-display',
});

/**
 * The station table, mirrored from `geometry.ts` into the schema's own
 * per-chapter surface.
 *
 * `stageProps` is the declared home for data of a shape no token can hold
 * (§5.4.2), so this is where a reader of the config finds out what station a
 * chapter is. It is DERIVED rather than re-typed: the coordinates are generated
 * from the spine's weights at module scope, and a second hand-written copy of
 * them here would be the exact drift the derivation exists to prevent.
 */
const stationProps: Partial<Record<ChapterId, WorldProps>> = {};
for (const station of STATION_LIST) {
    stationProps[station.id] = {
        symbol: station.symbol,
        lane: station.lane,
        ground: station.ground,
        x: station.x,
        y: station.y,
        /** Where this station sits along the route, 0 -> 1. */
        at: station.at,
        waypoints: station.waypoints.map((waypoint) => waypoint.beatId),
    };
}

/**
 * Totality, asserted rather than assumed.
 *
 * `Record<ChapterId, WorldProps>` is the schema's promise that every one of the
 * nine chapters has stage data, and `Object.fromEntries` cannot prove it — a
 * station quietly dropped from the table would type-check and then render a
 * chapter with no station, which is the kind of gap that survives review
 * because the page still looks finished. The loop below turns that into a build
 * failure at module scope, in the same place and in the same spirit as the
 * monotonicity check in `geometry.ts`.
 */
for (const id of CHAPTER_IDS) {
    if (!stationProps[id]) {
        throw new Error(`overworld: chapter '${id}' has no station in geometry.ts.`);
    }
}

const stageProps = stationProps as Readonly<Record<ChapterId, WorldProps>>;

const overworld = {
    id: 'overworld',
    label: 'Overworld',
    hint: 'Nine stations, one route, and an inventory that fills as you walk it.',
    premise:
        'A drawn world map with the whole journey visible before you move: nine stations on one '
        + 'route, project waypoints on side-paths, and five inventory slots that fill as you reach '
        + 'them. Traversal only — no score, no timer, no fail state. On the highest ground the '
        + 'civic building from station one is redrawn at three times the size, with a single thread '
        + 'running back across the map to where it first appeared.',

    /** The sun and lantern over the night ground they light. */
    swatch: ['#FFC53D', '#0B1020'],

    /**
     * The shelf card's art: the map screen between levels.
     *
     * The nine stations on one continuous route across a lit elevation, drawn
     * at the elevations `geometry.ts` gives them, so the route's own shape is
     * the descent at `depth` and the climb to `return`. The civic building
     * stands at the crossing and again on the highest ground at three times the
     * size, with the one thread in the drawing running back between them; a
     * turned marker sits on the route with the lantern's light beside it, and
     * five inventory slots, three of them filled, sit where the HUD docks.
     *
     * Restraint is what keeps a level map out of the fan-art register: there is
     * no character, no face, no tile grid and no label — a contour hairline, a
     * hatched channel and a silhouetted range, drawn as a printed plate would
     * draw them. No `titlePath`: nothing has ever read that field, and the
     * world's argument is the route, not its name.
     */
    poster: { kind: 'svg', src: '/xp/overworld.svg' },

    /**
     * A deep navy, not a black: the map is lit by one warm source and a warm
     * light needs a cool ground to be warm against.
     */
    ground: { stamp: 'dark', bg: '#0B1020' },

    fontVariables: [displayFace.variable],

    /**
     * Statically referenced, NOT `dynamic(..., { ssr: false })`.
     *
     * The E1 rule defers a stage with a motion timeline, and the reason is a
     * JS timeline that would run before hydration settles. This world has no JS
     * timeline: every moving thing is a consumer of one scroll-linked custom
     * property in CSS. `dynamic` still code-splits the map away from the other
     * four worlds' bundles, and leaving SSR ON is what keeps the entire telling
     * — nine chapters, every bullet — in the exported HTML, where a crawler and
     * a reader with JS disabled can still read it.
     */
    Stage: dynamic(() => import('./Stage')),
    Atmosphere: OverworldAtmosphere,

    tokens: ({ ground, tier }) => ({
        '--xp-bg': ground!.bg,
        '--xp-bg-alt': '#0F1428',
        '--xp-surface': '#171E36',
        '--xp-surface-alt': '#1E2745',
        '--xp-text': '#E9EDF7',
        '--xp-text-muted': '#96A0BE',
        '--xp-border': 'rgba(233, 237, 247, 0.13)',
        '--xp-link': '#FFC53D',

        // The sun, and later the lantern. Nothing else on the map is lit.
        '--xp-accent': '#FFC53D',
        '--xp-accent-soft': 'rgba(255, 197, 61, 0.22)',
        // Non-text: the sky wash and the shadow tint under the token.
        '--xp-counter': '#4C6BF0',
        // Two sources after station 5, and only two — the sun and the lantern.
        '--xp-glow-strength': '0.30',

        '--xp-focus-ink': '#0B1020',
        '--xp-focus-halo': '#E9EDF7',

        // ── The ramp: the ONE hue journey in the set, and deliberately so.
        // Overworld is the only world whose stops are all visible
        // simultaneously, so its regions must be distinguishable from one
        // another; the other four are monochrome. It is still
        // luminance-monotonic, so it survives greyscale, print and forced-colors.
        '--xp-stage-1': '#4DC9F0',
        '--xp-stage-2': '#56D0D7',
        '--xp-stage-3': '#76D4A3',
        '--xp-stage-4': '#A8D364',
        '--xp-stage-5': '#E1C843',
        '--xp-stage-6': '#FFC056',
        '--xp-stage-7': '#FFC640',

        // The return, on the highest ground. Referenced exactly once, in
        // `StationArt`, where the reprised building and the thread back to
        // station 1 both inherit it through `currentColor`.
        '--xp-beat-peak': '#F0C367',

        // Stated as rgba rather than color-mix so the composited sky is a
        // number that can be measured: 6% of the sun and 4% of the counter over
        // the ground resolve to #1C1E2A, on which text measures 14.13:1.
        '--xp-atmos-a': 'rgba(255, 197, 61, 0.06)',
        '--xp-atmos-b': 'rgba(76, 107, 240, 0.04)',

        '--xp-font-display': `var(${displayFace.variable}), var(--font-sans), system-ui, sans-serif`,
        '--xp-font-body': 'var(--font-sans), system-ui, -apple-system, sans-serif',
        '--xp-font-label': 'var(--font-mono), ui-monospace, monospace',
        '--xp-font-mono': 'var(--font-mono), ui-monospace, monospace',

        '--xp-beat-distance': tier === 'compact' ? '12px' : '18px',
        '--xp-beat-duration': '560ms',
        '--xp-beat-stagger': '60ms',
        '--xp-beat-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',

        '--xp-rail-width': tier === 'cinema' ? '220px' : tier === 'medium' ? '148px' : '0px',
        '--xp-gutter': tier === 'compact' ? '16px' : tier === 'medium' ? '32px' : '48px',
        '--xp-measure': tier === 'compact' ? '36ch' : tier === 'medium' ? '48ch' : '66ch',
        '--xp-nav-h': tier === 'compact' ? '96px' : '0px',
        // Map segments drawn. Complexity scales WITH the viewport rather than
        // being hidden by overflow, which is the difference between a trim and a
        // second world. Region silhouettes are drawn at 2× the artwork size at
        // eight stations rather than nineteen tiles at 40px — detail loss is
        // where cheap-looking starts.
        '--xp-density': tier === 'compact' ? '24' : tier === 'medium' ? '90' : '180',
    }),

    /**
     * The nine station names and their narrations.
     *
     * Every narration is ADDITIVE — it says something the bullets underneath it
     * do not, and it never summarises them. Three copy rules hold here and are
     * checkable by grep: every string is ≤180 characters, the one repeated proper
     * noun appears in `crossing` and in `return` and nowhere else in the repo
     * (a naive grep over this file must find exactly two hits), and
     * the poetic name is a subtitle rather than a heading in every surface that
     * renders it.
     */
    copy: {
        origin: {
            chapter: 'The plain',
            narration:
                'The lowest ground and the coolest light. Five slots stand empty on the map: '
                + 'you can read the whole inventory before you have collected any of it.',
        },
        crossing: {
            chapter: 'The crossing',
            narration:
                'The only water on the map. On the far bank, a small civic building with a Curam '
                + 'nameplate — the first thing built here, and worth remembering where it stands.',
        },
        trials: {
            chapter: 'The ward',
            narration:
                'A corridor of identical bays. Nothing here is loud, and that is the point: the '
                + 'flat stretches are what the bright ones get measured against.',
        },
        depth: {
            chapter: 'The descent',
            narration:
                'The only place the route goes down. A cut into the ground, cabling overhead, and '
                + 'a start-up number that got smaller until it stopped being a number anyone cited.',
        },
        scale: {
            chapter: 'The yard',
            narration:
                'The widest frame on the map. Carriages run through it on their own schedule, all '
                + 'night, whether or not anybody is standing there to watch them go.',
        },
        ignition: {
            chapter: 'Ignition',
            narration:
                'The first light source that is not the sun. From here the token casts two shadows, '
                + 'and the model on your own machine begins to warm.',
        },
        return: {
            chapter: 'The return',
            narration:
                'The highest ground — and the building on it is the one from the crossing, redrawn '
                + 'at three times the size. The same Curam eligibility work, eight years on.',
        },
        mastery: {
            chapter: 'The plateau',
            narration:
                'Flat warm ground after the climb. The interesting thing about this map was the '
                + 'return and not the altitude, so the route levels off and stays level.',
        },
        coda: {
            chapter: 'Coda',
            narration:
                'Five slots, filled. The lantern turns to face you: everything past this point is '
                + 'yours to ask for, and nothing on the map is still waiting.',
        },
    },

    spineCostume: 'route',
    /** The first light source on the map that is not the sun. */
    companionAlias: 'the Lantern',
    /**
     * Five slots, unacquired ones visible at 0.18 alpha rather than hidden —
     * seeing what is coming is what makes progression feel like progression. At
     * compact the inventory is NOT persistent; it appears once, complete, as the
     * coda's first panel.
     */
    hud: { kind: 'inventory', dock: 'bottom-left', mobileMode: 'coda-only' },
    ramp: 'hue',
    scaleDisplay: 1.5,
    density: { compact: 24, medium: 90, cinema: 180 },
    stageProps,

    /**
     * Three tellings, one story, and the beat count is identical in all three:
     * `show` filters PARTS of a beat and there is no arm of this shape that can
     * express "hide".
     *
     * compact — one station at a time, each a 100svh section with its own 180px
     *   vignette, the route in the left gutter, and the next employer named on a
     *   56px button in the thumb arc. Bullets are present and demoted, never
     *   collapsed: a closed disclosure is content a printer cannot open.
     * medium — the map as a sticky band above the evidence, two beats abreast,
     *   parallax at half amplitude, the rail with its labels always visible.
     * cinema — the whole map as a sticky 38vw stage, three beats abreast, all
     *   four planes, the inventory docked, the rail at the far edge.
     */
    telling: {
        compact: { flow: 'scroll', beatsInView: 1, show: ['summary', 'bullets', 'tags'], chrome: 'dots' },
        medium: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org'], chrome: 'rail' },
        cinema: { flow: 'scroll', beatsInView: 3, show: ['summary', 'bullets', 'tags', 'org', 'location'], chrome: 'rail' },
    },

    /**
     * Route advance, four parallax planes, sun position, lantern light, token
     * position and inventory fill are ONE registered `@property` on
     * `animation-timeline: scroll(root block)` with six consumers through
     * `calc()` — zero JS, compositor-only, and therefore immune to the ONNX
     * runtime stalling the main thread while the on-device model warms. Plane
     * ratios 0 / 0.08 / 0.16 / 0.28 / 0.45, travel clamped ±120px at cinema,
     * ±48px at medium, **0 at compact**; blur and opacity carry depth so speed
     * is not doing it alone.
     *
     * Token advance uses `offset-path: path()` + `offset-distance` — native, no
     * library, no per-frame JS. The token moves only while the reader scrolls and
     * stops dead when they stop, which is the single detail that makes the rails
     * feel intentional rather than automated.
     */
    motion: { rafLoops: 0, parallax: true, glowStrength: 0.30 },
} as const satisfies Experience;

export default overworld;
