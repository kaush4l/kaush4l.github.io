/**
 * The plate, generated. Pure arithmetic over the spine and the parsed periods —
 * no DOM, no fetch, no content import, no randomness, no time-of-day.
 *
 * ── Why this is generated rather than drawn ─────────────────────────────────
 * CREATIVE-SPEC §5.4.2 allows a world's stage geometry to be SVG path data,
 * because a path is data of a shape no custom property can hold — and then it
 * puts one condition on that allowance: the path must be *generated at build
 * time from the spine*, "which is what stops the art and the content from ever
 * disagreeing". A hand-drawn track is a picture that was true on the day it was
 * drawn. This module means that when a résumé entry's dates change, the gate
 * moves; when a chapter is added, a gate appears; and when the peak's `echoes`
 * is removed, the convergence stops happening. There is no version of this file
 * in which the plate flatters the content.
 *
 * "At build time" is literal here rather than aspirational: `Stage.tsx` is
 * imported statically by `index.ts`, so it is server-rendered into the static
 * export and every string this module returns is already in the HTML a reader
 * downloads. Nothing below runs on a visitor's machine on a warm load.
 *
 * ── The two axes ────────────────────────────────────────────────────────────
 *   x  TIME, eased against gate order (see `RANK_WEIGHT` below). Gate positions
 *      come from the lead beats' parsed `period` starts, so a long stretch still
 *      looks long — but two gates ten weeks apart cannot land on top of each
 *      other. Every date PRINTED anywhere is real calendar arithmetic; only the
 *      spacing is eased, which is a scale decision a schematic is allowed to
 *      make and a date is not.
 *   y  DISTANCE FROM THE FIRST PROBLEM, authored once per chapter in
 *      `plate-data.ts`. Never seniority and never rank: this world has no clock,
 *      no personal best and no medal, and an axis that ranked employers would
 *      smuggle all three back in.
 *
 * ── The ghost, and why the convergence is not code ──────────────────────────
 * The ghost is the live trace translated forward in time by the REFERENCE SPAN
 * — the gap between the chapter that declares `echoes` and the chapter it names
 * (Aug 2017 → Jan 2025). That single translation produces every beat the spec
 * asks for, and produces them as consequences rather than as cases:
 *
 *   • chapter 0  both traces sit on the start line together, because the ghost
 *                is clamped to the origin altitude before the span elapses.
 *   • gate 1     they separate by a hair — the live trace has only just moved.
 *   • gates 3–5  the gap opens and is widest, because that is where the live
 *                trace climbs fastest away from the first problem.
 *   • gate 6     THE GAP IS EXACTLY ZERO. The ghost's `crossing` knot lands on
 *                x = x(return) by the definition of the span, and `return`'s own
 *                altitude is `crossing`'s by `echoes` — so the two curves pass
 *                through one identical point. Not a drawn convergence: an
 *                arithmetic one, and it disappears the moment the field does.
 *   • gate 7     the ghost is back near the start line, where it stops and
 *                fades. It stands at the finish; it was never lapped, it was
 *                earlier.
 *
 * There is no branch below whose condition is `id === 'return'`.
 */
import type { ChapterId, SpineChapter, Story, StoryBeat, StorySpineChapter } from '@/lib/story';
import { GHOST_STAGE_PROPS, type GateSymbol } from './plate-data';

/**
 * The drawing space. Normalised, square, and stretched to the plate's real box
 * by `preserveAspectRatio="none"` — every stroke carries
 * `vector-effect="non-scaling-stroke"` so the hairline stays exactly 1px at a
 * 390px strip and at a 1440px elevation alike, which is the one property a
 * blueprint cannot be allowed to lose.
 *
 * Nothing typographic is drawn inside this space. Annotations are HTML
 * positioned in percentages of the same coordinates (see `Plate.tsx`), because
 * type in a non-uniformly scaled SVG is type that has been squashed.
 */
const VIEW = 1000;
/** Margins, in view units. The bottom band is the start line's own room. */
const PAD = { left: 34, right: 34, top: 96, bottom: 132 } as const;

export interface Gate {
    id: ChapterId;
    /** 0-based spine position. `ordinal` is what a reader is shown. */
    index: number;
    ordinal: string;
    /** The employer, school or client — what a skimmer is scanning for. */
    label: string;
    /** The authored period string. Rendered as authored, never reconstructed. */
    periodLabel?: string;
    /** Calendar start year, or `null` for a chapter with no dated lead. */
    year: number | null;
    /** Whole years between the reference run's start and this gate. */
    fromReference: number | null;
    signal: string;
    symbol: GateSymbol;
    /** The chapter this one echoes, if any. Drives the Then/Now pair. */
    echoes?: ChapterId;
    /** View-space position of the live trace at this gate. */
    x: number;
    y: number;
    /** View-space position of the ghost trace at the same x. */
    ghostY: number;
    /** The DOM id of the chapter this gate marks, for the annotation's link. */
    anchor: string;
}

export interface Plate {
    /** `0 0 1000 1000`, stated once so the SVG and the annotations agree. */
    viewBox: string;
    view: number;
    gates: readonly Gate[];
    /** The live trace, as one monotone cubic. */
    livePath: string;
    /** The same shape, translated by the reference span and clipped at the finish. */
    ghostPath: string;
    /** The start line — the datum every altitude on this plate is measured from. */
    baselineY: number;
    /** x of the finish rule: the last dated gate. */
    finishX: number;
    /** The multi-lane section, one gate wide. 40 hairlines, and only here. */
    lanes: { from: number; to: number; xs: readonly number[] };
    /** `2017 → 2025`, and the whole-year count between them. */
    reference: { fromYear: number | null; toYear: number | null; years: number | null };
}

// ─── Scales ─────────────────────────────────────────────────────────────────

/** A period start as a fractional year. `null` for an undated lead. */
function startTime(beat: StoryBeat | undefined): number | null {
    const period = beat?.period;
    if (!period) return null;
    return period.startYear + ((period.startMonth ?? 1) - 1) / 12;
}

/**
 * A monotone cubic through the knots (Fritsch–Carlson).
 *
 * Not Catmull-Rom, and the difference is load-bearing rather than academic: the
 * live trace dives from the plate's ceiling to its start line inside three
 * months of x at the seventh gate, and any spline that does not clamp its
 * tangents overshoots *below the baseline* there — a trace that dips under the
 * start line is a claim the résumé does not make. Monotone interpolation cannot
 * overshoot between two knots, by construction.
 */
function monotonePath(points: readonly { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

    const n = points.length;
    const h: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i += 1) {
        const dx = points[i + 1].x - points[i].x;
        h.push(dx);
        // A zero-width interval would divide by zero; two gates in the same
        // month is not impossible and must not produce NaN in a path string.
        slope.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
    }

    const m: number[] = new Array(n).fill(0);
    m[0] = slope[0];
    m[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i += 1) {
        // A local extremum gets a flat tangent — this is the clause that keeps
        // the dive into the seventh gate from undershooting the start line.
        m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    for (let i = 0; i < n - 1; i += 1) {
        if (slope[i] === 0) {
            m[i] = 0;
            m[i + 1] = 0;
            continue;
        }
        const a = m[i] / slope[i];
        const b = m[i + 1] / slope[i];
        const s = a * a + b * b;
        if (s > 9) {
            const t = 3 / Math.sqrt(s);
            m[i] = t * a * slope[i];
            m[i + 1] = t * b * slope[i];
        }
    }

    let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
    for (let i = 0; i < n - 1; i += 1) {
        const c1x = points[i].x + h[i] / 3;
        const c1y = points[i].y + (m[i] * h[i]) / 3;
        const c2x = points[i + 1].x - h[i] / 3;
        const c2y = points[i + 1].y - (m[i + 1] * h[i]) / 3;
        d += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(points[i + 1].x)} ${round(points[i + 1].y)}`;
    }
    return d;
}

/** Two decimals. A path string is shipped bytes; six of them are noise. */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}

// ─── The plate ──────────────────────────────────────────────────────────────

/**
 * Build the whole plate from a resolved story.
 *
 * Deliberately a plain function taking the story it was handed, not a hook and
 * not a module-level constant: a Stage receives everything and fetches nothing,
 * and a constant would have to be regenerated by a script every time `content/`
 * changed — which is the drift this module exists to make impossible.
 */
export function buildPlate(story: Story, chapterAnchor: (chapter: StorySpineChapter) => string): Plate {
    const chapters = story.spine.chapters;
    const leadOf = (chapter: SpineChapter & { leadIndex: number }): StoryBeat | undefined =>
        chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;

    // ── x: time. An undated chapter (the coda has no period — a skill group is
    // not an engagement) is placed a fixed run-out past the last dated one,
    // rather than being dropped from the axis. Nothing on this plate is dropped.
    const times = chapters.map((chapter) => startTime(leadOf(chapter)));
    const dated = times.filter((t): t is number => t !== null);
    const t0 = dated.length > 0 ? Math.min(...dated) : 0;
    const tLast = dated.length > 0 ? Math.max(...dated) : 1;
    const runOut = Math.max((tLast - t0) * 0.06, 0.5);
    const tEnd = tLast + runOut;
    const span = tEnd - t0 || 1;

    /**
     * The horizontal axis: a BLEND of elapsed time and gate order, 45/55.
     *
     * Pure elapsed time is the honest first instinct and it draws a bad plate:
     * the résumé's last two gates are ten weeks apart (January and April 2025),
     * so on a linear scale the convergence and the finish rule land on top of
     * each other and the peak reads as a spike rather than as a turn. Pure rank
     * is worse in the other direction — it would make six years of education and
     * ten weeks of contract look like the same stretch of track.
     *
     * So both, weighted, stated once here, and every NUMBER on the plate stays
     * real calendar arithmetic: the annotations, the dimension values and the
     * table all print parsed dates, and only the spacing is eased. A schematic
     * is allowed to choose its scale; it is not allowed to invent a date.
     */
    const RANK_WEIGHT = 0.55;
    const lastIndex = Math.max(chapters.length - 1, 1);
    const position = (t: number, index: number) =>
        (1 - RANK_WEIGHT) * ((t - t0) / span) + RANK_WEIGHT * (index / lastIndex);
    const X = (t: number, index: number) =>
        PAD.left + position(t, index) * (VIEW - PAD.left - PAD.right);

    // ── y: distance from the first problem. `spread` is authored per chapter,
    // except on the chapter that declares `echoes`, whose altitude IS the
    // altitude of the chapter it names. That lookup is the convergence.
    const baselineY = VIEW - PAD.bottom;
    const Y = (spread: number) => baselineY - spread * (baselineY - PAD.top);
    const spreadOf = (id: ChapterId): number => {
        const own = GHOST_STAGE_PROPS[id];
        if (own.spread !== undefined) return own.spread;
        const echoed = chapters.find((chapter) => chapter.id === id)?.echoes;
        // No `spread` and no `echoes` would be an authoring gap, not a shape:
        // the start line is the honest answer, because it claims nothing.
        return echoed ? spreadOf(echoed) : 0;
    };

    const positions = chapters.map((chapter, index) => ({
        chapter,
        time: times[index] ?? tEnd,
        x: X(times[index] ?? tEnd, index),
        y: Y(spreadOf(chapter.id)),
    }));

    // ── The reference span: the distance between the echo and its source. One
    // subtraction, and it is the only number the ghost needs.
    const echoing = chapters.find((chapter) => chapter.echoes);
    const source = echoing ? chapters.find((chapter) => chapter.id === echoing.echoes) : undefined;
    const echoX = echoing ? positions[echoing.index].x : 0;
    const sourceX = source ? positions[source.index].x : 0;
    const shift = echoing && source ? echoX - sourceX : 0;

    const livePoints = positions.map((p) => ({ x: p.x, y: p.y }));

    // The ghost: every live knot translated by the span, preceded by the flat
    // run along the start line that the reference run had not yet begun, and cut
    // at the finish rule.
    const finishX = positions[positions.length - 2]?.x ?? positions[positions.length - 1].x;
    const shifted = livePoints.map((p) => ({ x: p.x + shift, y: p.y }));
    const ghostPoints: { x: number; y: number }[] = [];
    if (shift > 0) ghostPoints.push({ x: livePoints[0].x, y: livePoints[0].y });
    for (let i = 0; i < shifted.length; i += 1) {
        const point = shifted[i];
        if (point.x <= finishX) {
            ghostPoints.push(point);
            continue;
        }
        // The one straddling segment, cut where it crosses the finish rule.
        const previous = shifted[i - 1];
        if (previous && previous.x < finishX) {
            const k = (finishX - previous.x) / (point.x - previous.x);
            ghostPoints.push({ x: finishX, y: previous.y + k * (point.y - previous.y) });
        }
        break;
    }

    // ── The ghost's altitude AT each gate, for the dimension annotations. It is
    // read off the shifted knots by linear interpolation rather than off the
    // spline: a dimension line is a measurement, and measuring against the
    // drawn curve rather than the data would make the number depend on the
    // interpolation. Two readings of the same fact must not disagree.
    const ghostYAt = (x: number): number => {
        if (ghostPoints.length === 0) return baselineY;
        if (x <= ghostPoints[0].x) return ghostPoints[0].y;
        for (let i = 1; i < ghostPoints.length; i += 1) {
            if (x <= ghostPoints[i].x) {
                const a = ghostPoints[i - 1];
                const b = ghostPoints[i];
                const k = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
                return a.y + k * (b.y - a.y);
            }
        }
        return ghostPoints[ghostPoints.length - 1].y;
    };

    const referenceYear = source ? (leadOf(source)?.period?.startYear ?? null) : null;
    const echoYear = echoing ? (leadOf(echoing)?.period?.startYear ?? null) : null;

    const gates: Gate[] = positions.map(({ chapter, x, y }, index) => {
        const lead = leadOf(chapter);
        const props = GHOST_STAGE_PROPS[chapter.id];
        const year = lead?.period?.startYear ?? null;
        return {
            id: chapter.id,
            index,
            ordinal: String(index + 1).padStart(2, '0'),
            label: lead?.org ?? lead?.title ?? chapter.id,
            periodLabel: lead?.periodLabel,
            year,
            fromReference: year !== null && referenceYear !== null ? year - referenceYear : null,
            signal: props.signal,
            symbol: props.symbol,
            echoes: chapter.echoes,
            x,
            y,
            ghostY: ghostYAt(x),
            anchor: chapterAnchor(chapter),
        };
    });

    // ── The multi-lane section: one gate wide, and the only ambient loop in the
    // world. 40 hairlines because that is what reads as "many lanes" without
    // becoming a fill; 41 divisions, 40 lines, drawn between two real gates.
    const laneGate = gates.find((gate) => gate.symbol === 'lane');
    const laneFrom = laneGate ? laneGate.x : 0;
    const laneTo = laneGate ? (gates[laneGate.index + 1]?.x ?? laneFrom) : 0;
    const xs: number[] = [];
    for (let i = 1; i <= 40 && laneTo > laneFrom; i += 1) {
        xs.push(round(laneFrom + ((laneTo - laneFrom) * i) / 41));
    }

    return {
        viewBox: `0 0 ${VIEW} ${VIEW}`,
        view: VIEW,
        gates,
        livePath: monotonePath(livePoints),
        ghostPath: monotonePath(ghostPoints),
        baselineY,
        finishX,
        lanes: { from: laneFrom, to: laneTo, xs },
        reference: {
            fromYear: referenceYear,
            toYear: echoYear,
            years: referenceYear !== null && echoYear !== null ? echoYear - referenceYear : null,
        },
    };
}
