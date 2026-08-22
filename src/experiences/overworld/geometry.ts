/**
 * The map, as numbers.
 *
 * CREATIVE-SPEC §5.4.2 names SVG path data as one of the four things that
 * genuinely cannot be a custom property: it is data, but it is data of a shape
 * no token can hold. So it lives here, generated ONCE at module scope from the
 * spine's own weights, and `index.ts` mirrors the per-chapter slice of it into
 * `stageProps` so the schema's declared surface is the one a reader of the
 * config sees. There is exactly one source for every number below.
 *
 * ── Why the route is DERIVED and not drawn ──────────────────────────────────
 * A hand-drawn route and a weighted spine drift the moment either is edited,
 * and the drift is invisible: the map still looks like a map, it just stops
 * agreeing with the story it claims to be a picture of. So every station's
 * vertical position is a pure function of `SPINE[i].weight` — the same numbers
 * that drive `margin-block-start` in the flow — which is what makes the
 * sentence "the progress bar is the map itself, and it cannot lie" literally
 * true rather than a claim. Change a weight and the map re-draws itself.
 *
 * ── What is authored, and what is computed ──────────────────────────────────
 * Authored per station (the table below): which side of the map it stands on,
 * how high its ground is, and which silhouette it wears. Those are pictorial
 * decisions and no derivation can make them.
 * Computed: every coordinate, the route path, the side-paths, the terrain
 * profile, the echo thread, and the fraction of the route each station sits at.
 *
 * ── No colour lives in this file ────────────────────────────────────────────
 * Not one hex, by the §5.2 lint rule and because a map that knows its own
 * palette is a map that cannot be re-skinned by the token layer it was built to
 * be driven by. Everything here is geometry; `Stage.tsx` paints it in
 * `currentColor` and the token map decides what that is.
 */
import { SPINE, type ChapterId } from '../types';

/**
 * The map's own coordinate system.
 *
 * A fixed viewBox rather than pixel geometry: the same numbers then serve the
 * 38vw cinema stage, the 40svh medium band and the 180px compact vignette,
 * which is the mechanical half of "one axis at every viewport". The aspect is
 * deliberately tall — the route runs top to bottom at every width, so the map
 * never has to be re-authored in landscape.
 */
export const VIEW = { width: 360, height: 1040 } as const;

/** The vertical band the nine stations are laid out inside. */
const TOP = 90;
const BOTTOM = 980;

/** Lane 0 → 1 maps across this inset band, so no station touches the edge. */
const LANE_LEFT = 46;
const LANE_RIGHT = 314;

/**
 * How much one unit of `ground` lifts a station off its weight-derived
 * baseline.
 *
 * 120 is the largest value at which the station sequence stays monotonic top to
 * bottom for this spine — the check is asserted below rather than trusted, so a
 * future weight change that would make the route double back fails the build
 * instead of drawing a knot.
 */
const ELEVATION = 120;

export type StationSymbol =
    | 'plain'
    | 'civic'
    | 'ward'
    | 'cut'
    | 'yard'
    | 'lantern'
    | 'plateau'
    | 'coda';

/** The authored half: a pictorial decision per station, and nothing else. */
interface StationSpec {
    id: ChapterId;
    symbol: StationSymbol;
    /** 0 → 1 across the map's width. The serpentine, stated as data. */
    lane: number;
    /** 0 → 1 elevation. `return` is the highest ground; `depth` is the cut. */
    ground: number;
}

/**
 * The nine stations.
 *
 * `crossing` and `return` share the symbol `civic` and that sharing is the
 * whole point: `Stage` renders both as a `<use href="#ow-sym-civic">` of ONE
 * `<symbol>` node, so the building at station 6 is not a copy of the building
 * at station 1 — it is the same node, drawn at three times the size. The rhyme
 * cannot fall out of sync with itself because there is only one of it.
 */
const STATIONS: readonly StationSpec[] = [
    { id: 'origin', symbol: 'plain', lane: 0.30, ground: 0.20 },
    { id: 'crossing', symbol: 'civic', lane: 0.64, ground: 0.26 },
    { id: 'trials', symbol: 'ward', lane: 0.34, ground: 0.30 },
    // The only place the route goes down: a cut into the ground.
    { id: 'depth', symbol: 'cut', lane: 0.68, ground: 0.08 },
    { id: 'scale', symbol: 'yard', lane: 0.26, ground: 0.34 },
    { id: 'ignition', symbol: 'lantern', lane: 0.60, ground: 0.46 },
    // The highest ground on the map, and the only station that is a reprise.
    { id: 'return', symbol: 'civic', lane: 0.76, ground: 0.92 },
    { id: 'mastery', symbol: 'plateau', lane: 0.32, ground: 0.62 },
    { id: 'coda', symbol: 'coda', lane: 0.50, ground: 0.58 },
];

export interface Waypoint {
    /** The beat id this waypoint stands for — a project, always. */
    beatId: string;
    x: number;
    y: number;
    /** The branch from the station to the waypoint, as a path. */
    path: string;
}

export interface Station extends StationSpec {
    index: number;
    x: number;
    y: number;
    /** Where this station sits along the route, 0 → 1. Drives the token. */
    at: number;
    /** The spine weight that produced `y`, carried so nothing has to look it up. */
    weight: number;
    /** Project side-paths branching off this station. */
    waypoints: readonly Waypoint[];
    /** The crop a compact vignette uses to show this station and nothing else. */
    vignette: string;
}

/** Midpoint of a chapter's share of the story, measured in WEIGHT. */
function weightMidpoints(): number[] {
    const total = SPINE.reduce((sum, chapter) => sum + chapter.weight, 0) || 1;
    let running = 0;
    return SPINE.map((chapter) => {
        const mid = running + chapter.weight / 2;
        running += chapter.weight;
        return mid / total;
    });
}

const MIDPOINTS = weightMidpoints();

/**
 * The stations, resolved.
 *
 * `y` is the weight midpoint mapped into the band, then lifted by the station's
 * own ground. The lift is what makes elevation legible on a flat elevation map:
 * `return` arrives 74 units above where pacing alone would have put it, and
 * `depth` sits 26 below, which is the same fact the terrain profile states a
 * second way.
 */
export const STATION_LIST: readonly Station[] = STATIONS.map((spec, index) => {
    const chapter = SPINE[index];
    const x = LANE_LEFT + spec.lane * (LANE_RIGHT - LANE_LEFT);
    const y = TOP + MIDPOINTS[index] * (BOTTOM - TOP) - (spec.ground - 0.3) * ELEVATION;
    // Side-paths carry the projects, and only the projects: a degree folded into
    // a chapter is part of that chapter's ground, not a detour off it.
    const projects = chapter.also.filter((id) => id.startsWith('projects:'));
    // Branches leave on the side with the most room, so a waypoint never lands
    // under the route it belongs to.
    const dir = spec.lane > 0.5 ? -1 : 1;
    const waypoints = projects.map((beatId, k) => {
        const wx = x + dir * (52 + k * 8);
        const wy = y - 34 + k * 30;
        return {
            beatId,
            x: wx,
            y: wy,
            path: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + dir * 26).toFixed(1)} ${((y + wy) / 2).toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)}`,
        };
    });

    return {
        ...spec,
        index,
        x,
        y,
        at: MIDPOINTS[index],
        weight: chapter.weight,
        waypoints,
        vignette: `${(x - 90).toFixed(1)} ${(y - 66).toFixed(1)} 180 132`,
    };
});

/**
 * Monotonic or the build fails.
 *
 * A route that doubles back is not a stylistic problem: it makes "further down
 * the page" stop meaning "later in the career", which is the one thing this
 * whole world is drawn to say. `ELEVATION` is the knob most likely to be
 * nudged by eye, so the invariant is asserted at module scope — at build time,
 * in the static export — rather than left to a reviewer noticing a knot.
 */
STATION_LIST.forEach((station, index) => {
    if (index > 0 && station.y <= STATION_LIST[index - 1].y) {
        throw new Error(
            `overworld: station ${station.id} is not below ${STATION_LIST[index - 1].id}. `
            + 'Lower ELEVATION or re-balance the spine weights.',
        );
    }
});

/**
 * The route: one continuous path through all nine stations, top to bottom.
 *
 * Cubic segments whose control points are pulled vertically rather than toward
 * the next station, so the curve leaves and arrives travelling DOWN. A curve
 * that leaves sideways reads as a river; this one reads as a road.
 */
export const ROUTE = STATION_LIST.reduce((path, station, index) => {
    if (index === 0) return `M ${station.x.toFixed(1)} ${station.y.toFixed(1)}`;
    const prev = STATION_LIST[index - 1];
    const pull = (station.y - prev.y) * 0.45;
    return (
        `${path} C ${prev.x.toFixed(1)} ${(prev.y + pull).toFixed(1)}`
        + ` ${station.x.toFixed(1)} ${(station.y - pull).toFixed(1)}`
        + ` ${station.x.toFixed(1)} ${station.y.toFixed(1)}`
    );
}, '');

/**
 * The terrain profile — the 1px hairline where a region meets the ground.
 *
 * One polyline across the whole map, sampled at the stations and at the
 * midpoints between them, so a station in a cut has ground ABOVE its route
 * position and a station on a plateau has ground below it. That is what makes
 * "the only place the route goes down" and "the highest ground" readable as
 * terrain rather than as two stations that happen to be off the trend line.
 */
export const TERRAIN = (() => {
    const points: string[] = [`M -8 ${(STATION_LIST[0].y + 46).toFixed(1)}`];
    STATION_LIST.forEach((station, index) => {
        const surface = station.y + 26 - station.ground * 26;
        if (index > 0) {
            const prev = STATION_LIST[index - 1];
            const midY = (prev.y + station.y) / 2 + 34;
            points.push(`L ${((prev.x + station.x) / 2).toFixed(1)} ${midY.toFixed(1)}`);
        }
        points.push(`L ${station.x.toFixed(1)} ${surface.toFixed(1)}`);
    });
    points.push(`L ${VIEW.width + 8} ${(STATION_LIST[STATION_LIST.length - 1].y + 40).toFixed(1)}`);
    return points.join(' ');
})();

/** The terrain, closed into a fill that reaches the bottom of the frame. */
export const TERRAIN_FILL = `${TERRAIN} L ${VIEW.width + 8} ${VIEW.height + 8} L -8 ${VIEW.height + 8} Z`;

/**
 * The thread an `echoes` chapter draws back to the chapter it echoes.
 *
 * One field on the spine — `echoes: 'crossing'` on `return` — renders here as
 * the only line on the map that is not part of the route. It is a *general*
 * function of two chapter ids and not peak code: a sixth world, or a second
 * echo, draws itself by declaring the field. The bow is thrown wide of the
 * route on the side away from both stations so the thread reads as a
 * connection rather than as a shortcut somebody could walk.
 */
export function echoThread(fromId: ChapterId, toId: ChapterId): string | null {
    const from = STATION_LIST.find((station) => station.id === fromId);
    const to = STATION_LIST.find((station) => station.id === toId);
    if (!from || !to) return null;
    const bow = (from.x + to.x) / 2 > VIEW.width / 2 ? VIEW.width + 46 : -46;
    return (
        `M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`
        + ` C ${bow} ${from.y.toFixed(1)} ${bow} ${to.y.toFixed(1)}`
        + ` ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
    );
}

/**
 * The parallax ladder — CREATIVE-SPEC §2.3's five plane ratios, with the blur
 * and opacity sets paired to physical depth.
 *
 * The spec states the three sets as ladders (`0 / 0.08 / 0.16 / 0.28 / 0.45`,
 * blur `0/0/1/2/4`, opacity `1/0.90/0.72/0.50/0.34`) and this is the one place
 * they are paired. Distance is what governs: the farthest ridge moves LEAST and
 * is dimmest; the foreground moves most and is the blurriest, which is the
 * depth-of-field a camera focused on the route would give. Pairing them in the
 * order printed would have made the far ridge overtake the near one, which
 * looks like a bug and is one.
 *
 * `travel` is the absolute clamp per tier: ±120px cinema, ±48px medium, and 0
 * at compact — where the map is nine vignettes rather than one moving picture,
 * and where parallax is a nausea risk with nothing to buy.
 */
export const PLANES = [
    { key: 'far', ratio: 0.08, blur: 2, opacity: 0.50 },
    { key: 'mid', ratio: 0.16, blur: 1, opacity: 0.72 },
    { key: 'ground', ratio: 0.28, blur: 0, opacity: 0.90 },
    { key: 'fore', ratio: 0.45, blur: 4, opacity: 0.34 },
] as const;

export const PLANE_TRAVEL = { compact: 0, medium: 48, cinema: 120 } as const;

/**
 * A far ridge, drawn once from the terrain it stands behind.
 *
 * Derived rather than authored so the two horizons can never contradict each
 * other's shape, and flattened by half so the distant one reads as distant.
 */
export const RIDGE = (() => {
    const points = STATION_LIST.map((station, index) => {
        const x = index % 2 === 0 ? station.x - 70 : station.x + 70;
        const y = station.y - 96 - station.ground * 40;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
})();
