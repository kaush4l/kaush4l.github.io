/**
 * The Crossing's drawn shapes, GENERATED — never hand-typed, never traced.
 *
 * CREATIVE-SPEC §5.4.2 names stage geometry as one of the four things that
 * genuinely cannot be a custom property: a silhouette is data, but it is data of
 * a shape no token can hold. The rule that keeps it honest is the second half of
 * that clause — *all four worlds' geometry is generated at build time from the
 * spine*, which is what stops the art and the content from ever disagreeing.
 *
 * So this file is a set of pure functions plus one evaluation of them at module
 * scope. Nothing here reads the DOM, the clock, or a random source: the ridges
 * come out of a seeded LCG, so the string the server renders and the string the
 * client hydrates are the same string by construction rather than by luck. A
 * `Math.random()` ridge would have been a hydration mismatch that only ever
 * reproduced on someone else's machine.
 *
 * ── Two coordinate spaces, deliberately ────────────────────────────────────
 *   SKY   `0 0 1000 620`, y=620 at the ground. Every silhouette plane and the
 *         horizon live here, and the sky <svg> is drawn `xMidYMax slice`, so
 *         the planes keep their proportions at every viewport and the frame
 *         crops rather than stretching land into taffy.
 *   ARC   `0 0 100 1000`, y=1000 at the bottom of the climb. The arc <svg> is
 *         drawn `preserveAspectRatio="none"` ON PURPOSE: at cinema the box is
 *         ~96px wide and the curve reads as a curve, and at compact the box is
 *         12px wide and the identical path collapses into the 4px vertical
 *         hairline §4.5 asks for. One path, three tellings, zero branches — the
 *         squash IS the compact telling rather than a second drawing of it.
 *
 * ── Altitude is time, and it comes from the spine ──────────────────────────
 * `CHAPTER_ALTITUDE` is a weight prefix-sum over `SPINE`, so a chapter that is
 * given more room in the story is given more sky. Re-weight chapter 6 in
 * `story.ts` and the pips, the echo and the arc's lit stop all move together;
 * nothing in this world stores a second opinion about where a chapter sits.
 */
import { SPINE, type ChapterId } from '../types';
import type { NarrativeTier } from '../types';

/** The sky's drawing box. `y = SKY_H` is the ground line. */
export const SKY_W = 1000;
export const SKY_H = 620;

/** The arc's drawing box. `y = ARC_H` is sea level; `y = 0` is the top. */
export const ARC_W = 100;
export const ARC_H = 1000;

/**
 * A deterministic 32-bit LCG.
 *
 * Numerically identical on every engine (the multiply is done in doubles and
 * masked back with `>>> 0`), which is the only property that matters here: the
 * ridge is markup, and markup that differs between the export and the hydration
 * is a React error in production and a silent visual pop everywhere else.
 */
function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/** Two decimals is under a tenth of a pixel at every viewport, and it halves the string. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A closed land silhouette: a ridge line across the top, sealed down to the
 * ground line.
 *
 * Quadratic segments through the midpoints of the sampled points, which is the
 * cheapest way to get a horizon that reads as land rather than as a chart. `jag`
 * is how much of each step's height is allowed to differ from its neighbour —
 * low for a sea horizon, high for a far ridge.
 */
function ridge(seed: number, steps: number, base: number, amp: number, jag: number): string {
    const rand = lcg(seed);
    const xs: number[] = [];
    const ys: number[] = [];
    let y = base;
    for (let i = 0; i <= steps; i += 1) {
        // A slow sine under the noise, so the ridge has a shape as well as a
        // texture — pure noise reads as static, and static is not landscape.
        const swell = Math.sin((i / steps) * Math.PI * 1.5 + seed * 0.37) * amp * 0.5;
        y = base + swell + (rand() - 0.5) * amp * jag;
        xs.push((i / steps) * SKY_W);
        ys.push(Math.max(8, Math.min(SKY_H - 8, y)));
    }

    let d = `M0,${SKY_H} L${r2(xs[0])},${r2(ys[0])}`;
    for (let i = 1; i < xs.length; i += 1) {
        const mx = (xs[i - 1] + xs[i]) / 2;
        const my = (ys[i - 1] + ys[i]) / 2;
        d += ` Q${r2(xs[i - 1])},${r2(ys[i - 1])} ${r2(mx)},${r2(my)}`;
    }
    d += ` L${SKY_W},${r2(ys[ys.length - 1])} L${SKY_W},${SKY_H} Z`;
    return d;
}

/**
 * The nearest plane: a temple cornice in flat side elevation.
 *
 * Steps and a chamfer, and nothing else — no finial, no ornament, no figure, no
 * script. §4.5 forbids the merchandise and the reason is not squeamishness: a
 * recognisable ornament is the exact moment an ascent stops being a career and
 * starts being a costume. What survives is the one thing architecture
 * contributes to this world, which is a hard human edge at the bottom of a soft
 * sky.
 */
function cornice(seed: number): string {
    const rand = lcg(seed);
    const tiers = 5;
    let d = `M0,${SKY_H}`;
    let y = SKY_H - 40;
    let x = 0;
    // Left flank: five stepped set-backs rising toward the centre.
    for (let i = 0; i < tiers; i += 1) {
        const run = 70 + rand() * 40;
        const rise = 26 + rand() * 16;
        y -= rise;
        d += ` L${r2(x)},${r2(y)} L${r2(x + run)},${r2(y)}`;
        x += run;
    }
    // The chamfered crown, then the mirrored flank back down to the ground.
    const crownY = y - 34;
    d += ` L${r2(x + 26)},${r2(crownY)} L${r2(SKY_W - x - 26)},${r2(crownY)}`;
    for (let i = tiers - 1; i >= 0; i -= 1) {
        const run = 70 + rand() * 40;
        const rise = 26 + rand() * 16;
        d += ` L${r2(SKY_W - x)},${r2(y)}`;
        x -= run;
        y += rise;
        d += ` L${r2(SKY_W - x)},${r2(y)}`;
    }
    d += ` L${SKY_W},${SKY_H} Z`;
    return d;
}

/**
 * One silhouette plane, as data.
 *
 * `depth` is the parallax plane ratio from CREATIVE-SPEC §2.3's fixed ladder —
 * 0 / 0.08 / 0.16 / 0.28 / 0.45 and no other values — published to CSS as
 * `--xc-depth` and multiplied there by the tier's travel cap. Stating it here
 * rather than in the stylesheet is what makes "how deep is this plane" a number
 * on a piece of data instead of a magic constant in a keyframe.
 */
export interface Plane {
    /** Stable key, and the `data-plane` attribute the stylesheet reads. */
    id: 'sea' | 'ridge' | 'shelf' | 'coast' | 'cornice';
    /** Parallax plane ratio. §2.3's ladder, never an intermediate value. */
    depth: number;
    /** Path data in the SKY box. */
    d: string;
}

/**
 * The five planes, far to near.
 *
 * The COAST plane is the one that matters twice: it is chapter 1's water and it
 * is chapter 6's echo, and both are literally this string. There is no second
 * coastline anywhere in this world — `echo()` scales this one down, which is the
 * whole mechanism behind §4.0's `echoes` field and the reason the peak needs no
 * bespoke art.
 */
export const PLANES: readonly Plane[] = [
    { id: 'sea', depth: 0, d: ridge(11, 10, 470, 26, 0.35) },
    { id: 'ridge', depth: 0.08, d: ridge(29, 14, 430, 74, 0.9) },
    { id: 'shelf', depth: 0.16, d: ridge(47, 9, 505, 58, 0.5) },
    { id: 'coast', depth: 0.28, d: ridge(71, 16, 556, 46, 1.1) },
    { id: 'cornice', depth: 0.45, d: cornice(97) },
];

export const COAST = PLANES.find((p) => p.id === 'coast')!;

/**
 * How many planes are drawn at each width — the `density` field, stated once.
 *
 * Compact draws ONE, and which one is a narrative decision rather than a
 * performance one: the coastline is the plane the story returns to, so it is the
 * plane a 390px screen keeps. A tier that dropped the coast and kept the cornice
 * would still be five planes minus four; this is the shortest telling of the
 * same picture.
 */
export const PLANES_BY_TIER: Readonly<Record<NarrativeTier, readonly Plane[]>> = {
    compact: [COAST],
    medium: [PLANES[1], PLANES[2], COAST],
    cinema: PLANES,
};

/**
 * The arc: one path, `pathLength="1"`, drawn bottom to top.
 *
 * A gentle double bow rather than a straight rule, because a straight rule is a
 * progress bar and a progress bar is a widget. It never crosses itself, never
 * doubles back, and ends dead centre at the top — the climb is allowed to lean,
 * not to wander.
 */
export const ARC_D = `M56,${ARC_H} C30,830 74,656 46,470 C24,330 60,168 50,0`;

/**
 * Weighted altitude, 0 at the ground and 1 at the top, keyed by chapter.
 *
 * The MIDPOINT of each chapter's weight band rather than its start: a pip drawn
 * at the start of `coda` would sit where `mastery` ends, and a reader comparing
 * the rail to the sky would find the two disagreeing by a chapter. Midpoints are
 * also what make the nine pips look evenly considered rather than evenly spaced,
 * which is the honest picture — chapter 6 is 1.6 of the climb and chapter 0 is
 * 0.6 of it.
 */
export const CHAPTER_ALTITUDE: Readonly<Record<ChapterId, number>> = (() => {
    const total = SPINE.reduce((sum, chapter) => sum + chapter.weight, 0);
    let running = 0;
    const out = {} as Record<ChapterId, number>;
    for (const chapter of SPINE) {
        out[chapter.id] = (running + chapter.weight / 2) / total;
        running += chapter.weight;
    }
    return out;
})();

/**
 * The luminance ramp stop a chapter is lit by, 1–7.
 *
 * Byte-identical to the expression the shared Stage uses for its chapter
 * ordinal (`--xp-stage-${min(index + 1, 7)}`), and identical on purpose: the
 * ordinal beside the heading and the pip on the arc are two renderings of one
 * fact, and a world in which they disagree by one stop is a world whose ramp
 * nobody can trust.
 */
export function rampStop(chapterIndex: number): number {
    return Math.min(chapterIndex + 1, 7);
}

/**
 * Where the arc actually is at a given altitude.
 *
 * The arc bows by ±26 units of its 100-unit box, so a marker placed at the box's
 * centre would miss the line by a quarter of the column's width — the kind of
 * near-miss that reads as carelessness rather than as design. Sampling the curve
 * costs nothing (it runs nine times, at module scope, at build) and it means the
 * altimeter's ticks are ON the arc by construction at every viewport.
 *
 * Bisection rather than an analytic solve: the cubic's `y` is strictly
 * decreasing along both segments, so twenty-four halvings put the answer inside
 * a ten-thousandth of a unit, and there is no root-selection case to get wrong.
 */
const ARC_SEGMENTS: readonly (readonly [number, number][])[] = [
    [[56, ARC_H], [30, 830], [74, 656], [46, 470]],
    [[46, 470], [24, 330], [60, 168], [50, 0]],
];

function cubic(p: readonly (readonly [number, number])[], t: number, axis: 0 | 1): number {
    const u = 1 - t;
    return (
        u * u * u * p[0][axis] +
        3 * u * u * t * p[1][axis] +
        3 * u * t * t * p[2][axis] +
        t * t * t * p[3][axis]
    );
}

/** `{ x, y }` in the ARC box for an altitude of 0 (sea level) to 1 (the top). */
export function arcPointAtAltitude(altitude: number): { x: number; y: number } {
    const y = (1 - Math.min(Math.max(altitude, 0), 1)) * ARC_H;
    const segment = y > 470 ? ARC_SEGMENTS[0] : ARC_SEGMENTS[1];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        if (cubic(segment, mid, 1) > y) lo = mid;
        else hi = mid;
    }
    const t = (lo + hi) / 2;
    return { x: r2(cubic(segment, t, 0)), y: r2(y) };
}
