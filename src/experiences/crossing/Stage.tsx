'use client';

/**
 * THE CROSSING — the sky, and nothing else.
 *
 * ── What this component deliberately does NOT do ────────────────────────────
 * It does not re-implement the reading. The shared `Stage` is "a complete,
 * readable, correctly-graded telling of the résumé" and it already owns the
 * things a world must never get subtly wrong on its own: the beat count at every
 * tier, the `<h2 tabindex="-1">` per chapter with employer / role / dates, the
 * poetic name as an eyebrow rather than as a heading, the company-name rail, the
 * polite live region, the keyboard map, the queued-not-dropped cut lock, the
 * `beat-` prefixed anchors, and the print reordering. Re-typing all of that here
 * would have bought this world nothing except five new places for chapter six to
 * go missing at 390px.
 *
 * So this file adds exactly one thing — the sky — and hands the story straight
 * to the shared stage underneath it. That composition IS the world: everything
 * else The Crossing needs is expressed as tokens, as `copy`, as `stageProps`,
 * and as one delimited block in `experiences.css`.
 *
 * ── Why the sky is a fixed layer at `z-index: 0`, and not the frame's
 *    `Atmosphere` slot ──────────────────────────────────────────────────────
 * The frame's atmosphere frame is `z-index: -1`. A negative-z descendant paints
 * in the root stacking context's negative layer, which is BELOW the background
 * of every in-flow block above it — and on this route `body` carries an opaque
 * background twice over (MUI's `CssBaseline`, and `experiences.css` §2, which
 * must paint `--xp-bg` because the pre-paint script sets nothing else). An
 * atmosphere would therefore be painted and then covered, which is the worst
 * kind of correct-looking code. The Crossing's sky is not decoration behind the
 * ground anyway: it IS the ground, and it is the only picture this world has.
 *
 * `z-index: 0` on a fixed layer paints above `body`'s background and below the
 * flow, because the shared stage's flow column carries `.xp-plane-flow`, which
 * `experiences.css` §1c gives `position: relative; z-index: 1`. The two-plane
 * law is kept exactly: spectacle underneath, meaning on top, and never a third
 * plane. The layer is `aria-hidden`, `role="presentation"`, pointer-transparent
 * and `.no-print` — every guarantee the frame's slot would have supplied is
 * restated here rather than assumed.
 *
 * ── Zero rAF loops, zero scroll handlers, zero reading state ────────────────
 * Nothing below observes anything. The arc's fill, the horizon's descent and the
 * planes' parallax are CSS scroll-linked animations declared in this world's
 * block, each authored with its FINAL state as the unconditional default, so a
 * browser with no scroll-driven animations gets a complete dawn rather than an
 * empty one. `motion.rafLoops: 0` is therefore a fact about this file, not a
 * promise about it.
 */

import { Box } from '@mui/material';
import type { CSSProperties } from 'react';
import DefaultStage from '../Stage';
import { useExperience } from '../ExperienceProvider';
import type { StageProps } from '../types';
import type { StorySpineChapter } from '@/lib/story';
import {
    ARC_D,
    ARC_H,
    ARC_W,
    arcPointAtAltitude,
    PLANES,
    PLANES_BY_TIER,
    SKY_H,
    SKY_W,
    rampStop,
    type Plane,
} from './geometry';

/**
 * The per-chapter half of this world's `stageProps`, narrowed once.
 *
 * `WorldProps` is `Record<string, unknown>` by design — the shape is the world's
 * own and only this component reads it — so the narrowing happens here, at the
 * boundary, and every consumer below is typed. A missing key returns the
 * chapter's honest defaults rather than throwing: a config typo should cost one
 * dull pip, never the whole sky.
 */
interface ChapterStage {
    /** 0 at sea level, 1 at the top of the climb. Weighted, from the spine. */
    altitude: number;
    /** Which silhouette plane is this chapter's foreground. */
    plane: Plane['id'];
    /** Deliberately quiet chapter (CREATIVE-SPEC §4.0). Read by the stylesheet. */
    quiet: boolean;
}

function readChapterStage(raw: unknown, fallbackAltitude: number): ChapterStage {
    const props = (raw ?? {}) as Record<string, unknown>;
    const altitude = typeof props.altitude === 'number' ? props.altitude : fallbackAltitude;
    const plane = typeof props.plane === 'string' ? (props.plane as Plane['id']) : 'sea';
    return { altitude, plane, quiet: props.quiet === true };
}

/**
 * The film grain: the SHARED 160×160 `feTurbulence`, at the shared strength.
 *
 * §4.5 allows this world exactly one texture and names it, and the numbers are
 * not this world's to retune — `opacity: 0.035` and `mix-blend-mode: overlay`
 * are what every world that grains uses. A tile rather than a full-frame filter
 * because a turbulence over a 1440×900 surface is a real per-paint cost and a
 * 160px tile is visually indistinguishable from one.
 */
function Grain() {
    return (
        <svg className="xc-grain" aria-hidden focusable="false">
            <filter id="xc-grain-filter" x="0" y="0" width="160" height="160" filterUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={7} stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#xc-grain-filter)" />
        </svg>
    );
}

/**
 * The sky: horizon, silhouette planes, the arc, nine pips, and the echo.
 *
 * Every element here is drawn from data — `PLANES_BY_TIER` decides how much land
 * exists at this width (the `density` field, not a media query), the spine's own
 * weights decide where each pip sits, and the spine's `echoes` decides whether
 * there is an echo at all.
 */
function Sky({
    tier,
    chapters,
    stageProps,
}: {
    tier: StageProps['tier'];
    chapters: readonly StorySpineChapter[];
    stageProps: Readonly<Record<string, unknown>> | undefined;
}) {
    const planes = PLANES_BY_TIER[tier];

    const stops = chapters.map((chapter, index) => ({
        chapter,
        stage: readChapterStage(stageProps?.[chapter.id], (index + 0.5) / chapters.length),
        /** The one chapter that references an earlier one. §4.0's `echoes`. */
        echoes: chapter.echoes,
    }));

    /**
     * THE RETURN, rendered as one field rather than as peak code.
     *
     * The spine says chapter 6 echoes chapter 1. This world's answer to that
     * sentence is: draw the echoed chapter's own silhouette — the same path
     * string, not a copy of it — at a ninth of its size, at the echoing
     * chapter's altitude, with the arc touching it. Nothing below knows the word
     * "return", "Curam" or "DHHS"; delete `echoes` from `story.ts` and this
     * block renders nothing, which is the test for whether it was bespoke.
     */
    const echoing = stops.find((stop) => stop.echoes !== undefined);
    const echoed = echoing
        ? stops.find((stop) => stop.chapter.id === echoing.echoes)
        : undefined;
    const echoPlane = echoed ? PLANES.find((plane) => plane.id === echoed.stage.plane) : undefined;

    return (
        <Box
            className="xc-sky no-print"
            data-tier={tier}
            aria-hidden
            role="presentation"
        >
            {/* The vault: the light itself. One element, so the horizon is
                literally one DOM node for the whole story — §4.5's match-cut on
                the horizon is a consequence of the markup rather than a
                transition anybody had to write. */}
            <div className="xc-vault">
                <div className="xc-horizon" />
                {/* Chapter 4's throughput cue: twelve fine parallel hairlines at
                    plane 1. They stream because the plane they are painted on
                    parallaxes; there is no animation of their own. */}
                <div className="xc-stream" />
                <svg
                    className="xc-planes"
                    viewBox={`0 0 ${SKY_W} ${SKY_H}`}
                    preserveAspectRatio="xMidYMax slice"
                    focusable="false"
                >
                    {planes.map((plane) => (
                        <path
                            key={plane.id}
                            className="xc-plane xp-scroll-linked"
                            data-plane={plane.id}
                            style={{ '--xc-depth': plane.depth } as CSSProperties}
                            d={plane.d}
                        />
                    ))}
                </svg>
                <Grain />
            </div>

            {/* The arc, and the altimeter's nine ticks on it.
                `preserveAspectRatio="none"` is the compact telling: the same
                path in a 12px-wide box IS the 4px hairline pinned left that
                §4.5 asks for. `vector-effect` keeps the stroke a true width
                through that squash, and `pathLength={1}` makes the dash maths
                identical at all three tiers.

                THE RAMP IS THE STROKE. The arc is painted with the seven-stop
                luminance ramp running bottom to top, which is what makes "you
                are getting higher" survive at 390px, in greyscale and on paper —
                the most important narrative signal in this world is COLOUR
                rather than animation, and colour is the one channel a phone
                loses nothing of. */}
            <svg
                className="xc-arc"
                viewBox={`0 0 ${ARC_W} ${ARC_H}`}
                preserveAspectRatio="none"
                focusable="false"
            >
                <defs>
                    <linearGradient id="xc-ramp" x1="0" y1="1" x2="0" y2="0">
                        {[1, 2, 3, 4, 5, 6, 7].map((stop, index) => (
                            <stop
                                key={stop}
                                offset={index / 6}
                                stopColor={`var(--xp-stage-${stop})`}
                            />
                        ))}
                    </linearGradient>
                </defs>

                <path className="xc-arc-track" d={ARC_D} vectorEffect="non-scaling-stroke" />
                <path
                    className="xc-arc-line xp-scroll-linked"
                    d={ARC_D}
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                />

                {/* Nine altitudes, each a tick ON the line rather than beside it
                    — the curve is sampled at build time, so a marker cannot
                    drift from the thing it marks. The ticks carry no text: the
                    ordinal, the company name and the chapter name are all in the
                    shared chrome, and colour is never the sole carrier of
                    anything in this feature. */}
                {stops.map(({ chapter, stage, echoes }) => {
                    const point = arcPointAtAltitude(stage.altitude);
                    const peak = echoes !== undefined;
                    const half = peak ? 26 : 15;
                    return (
                        <line
                            key={chapter.id}
                            className="xc-tick"
                            data-chapter={chapter.id}
                            data-peak={peak ? '' : undefined}
                            x1={point.x - half}
                            x2={point.x + half}
                            y1={point.y}
                            y2={point.y}
                            vectorEffect="non-scaling-stroke"
                            style={
                                {
                                    // The peak is the ONE reference to
                                    // `--xp-beat-peak` in this world. Every other
                                    // tick is lit by its own ramp stop, and that
                                    // stop is byte-identical to the one the
                                    // shared stage prints beside the heading —
                                    // two renderings of one fact, never two
                                    // opinions about it.
                                    stroke: peak
                                        ? 'var(--xp-beat-peak)'
                                        : `var(--xp-stage-${rampStop(chapter.index)})`,
                                } as CSSProperties
                            }
                        />
                    );
                })}
            </svg>

            {echoing && echoPlane && (
                <svg
                    className="xc-echo xp-scroll-linked"
                    viewBox={`0 0 ${SKY_W} ${SKY_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={
                        {
                            '--xc-alt': echoing.stage.altitude,
                            // Where the arc IS at that altitude, as a fraction of
                            // the arc's own box — so "the arc touches it" stays
                            // true at every width instead of in one screenshot.
                            '--xc-arc-x': arcPointAtAltitude(echoing.stage.altitude).x / ARC_W,
                        } as CSSProperties
                    }
                    focusable="false"
                >
                    {/* The same string as the plane far below. A second path
                        drawn to look similar would be the moment the rhyme
                        became a resemblance. */}
                    <path d={echoPlane.d} />
                </svg>
            )}
        </Box>
    );
}

export default function CrossingStage(props: StageProps) {
    const { experience } = useExperience();

    return (
        <>
            <Sky
                tier={props.tier}
                chapters={props.story.spine.chapters}
                stageProps={experience.stageProps}
            />
            {/* The story, whole, in the shared telling. */}
            <DefaultStage {...props} />
        </>
    );
}
