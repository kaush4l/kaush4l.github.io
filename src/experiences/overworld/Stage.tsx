'use client';

/**
 * OVERWORLD — the map screen between levels, drawn rather than rendered.
 *
 * ── Why this world has a Stage at all ───────────────────────────────────────
 * The engine's whole argument is that a world should be a config object and a
 * token map (§5.0), and four fifths of this world is exactly that: the palette,
 * the ramp, the geometry per tier, the nine chapter names and narrations, the
 * station table and the route are all data in `index.ts` and `geometry.ts`.
 * What is left over is the thing the shared Stage genuinely cannot do — draw a
 * MAP, keep an inventory, and let a reader jump to a station by pointing at it.
 * So this file is deliberately thin on opinions and thick on wiring: it decides
 * nothing about colour, size, duration or curve, all of which are `--xp-*`
 * tokens, and it holds no hex literal, no px font size and no media query.
 *
 * ── The one idea: the map IS the progress bar ───────────────────────────────
 * Every station is drawn from `STATION_LIST`, whose y coordinates are a pure
 * function of the same spine weights that space the chapters in the flow. The
 * whole journey is therefore visible before the reader moves, every station is
 * on screen and clickable at all times, and the affordance cannot lie about
 * where the reader is because it is drawn from the array the content comes
 * from. That is the property CREATIVE-SPEC §2.6 makes non-negotiable, and the
 * cheapest way to get it is to never compute the picture twice.
 *
 * ── `echoes`, rendered in this world's language ─────────────────────────────
 * One field on the spine — `echoes: 'crossing'` on chapter 6 — is read by
 * `echoThread()` and by the station renderer, and produces: the civic
 * `<symbol>` from station 1 drawn again at 3× on the highest ground, and a
 * thread back across the map to where it first appeared. There is no `if
 * (chapter.id === 'return')` anywhere in this file. A second echo, or a sixth
 * world's echo, draws itself.
 *
 * ── Motion: zero rAF loops, zero scroll handlers ────────────────────────────
 * Route advance, four parallax planes, the sun, the lantern, the token and the
 * five inventory slots are all consumers of ONE registered custom property
 * `--ow-p`, driven by `animation-timeline: scroll(root block)` in
 * `experiences.css`. Nothing in this file animates anything. That is a
 * performance decision before it is a taste one: this page ships an ONNX
 * runtime that will own the main thread while the on-device model warms, and a
 * compositor timeline is the only scroll motion that survives it.
 *
 * The one thing JavaScript does own is the READING POSITION — which station is
 * lit, what the live region announces, and where a deliberate jump lands. That
 * is an `IntersectionObserver`, not a frame loop.
 *
 * ── Reduced motion stills; it never hides ───────────────────────────────────
 * Under the still, `--ow-p` resolves to its declared value of 1: the route is
 * fully drawn, every station is lit, the inventory is complete and the token is
 * parked at the last station. The complete map is the RESTING state and the
 * animation is what takes it away — authored in that direction so that a
 * browser with no scroll timelines, a printer, a crawler and a reader who asked
 * for stillness all get the whole picture rather than an empty frame.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { Box } from '@mui/material';
import { RADIUS } from '@/theme/ThemeProvider';
import { useExperience } from '../ExperienceProvider';
import type { NarrativeTier, StageProps, TellingSpec } from '../types';
import type { ChapterId, SkillGroupId, Story, StoryBeat, StorySpineChapter } from '@/lib/story';
import MapDefs, { SYMBOL_IDS } from './symbols';
import {
    PLANES,
    PLANE_TRAVEL,
    RIDGE,
    ROUTE,
    STATION_LIST,
    TERRAIN,
    TERRAIN_FILL,
    VIEW,
    echoThread,
    type Station,
} from './geometry';

/**
 * Clearance for the frame's fixed door. Identical to the shared Stage's, and
 * stated once here for the same reason it is stated once there: when the page
 * padding and the scroll targets disagree the failure is silent — the link
 * works, the reader arrives, and the heading they came for is behind a button.
 */
const DOOR_CLEARANCE = 'calc(var(--xp-sp-9) + var(--xp-sp-4))';

/**
 * Visually hidden, never `display: none`.
 *
 * `'1px'` as a STRING, never the bare number `1` — see the twin note in the
 * shared `Stage.tsx`. QA-2026-08-22/S1: MUI's `sx` reads a unitless 0–1 number
 * in `width`/`height` as a fraction, so `width: 1` becomes `width: 100%`, and an
 * absolutely-positioned box with no positioned ancestor resolves that against
 * the viewport. This world scrolled sideways by 52px at 390 and 40px at 1440
 * because of it, on `documentElement` only.
 */
const srOnly = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: 0,
} as const;

const OVERTURE_ID = 'xp-overture';

/** A beat's DOM id, PREFIXED — see the shared Stage for the whole argument. */
function beatAnchor(beatId: string): string {
    return `beat-${beatId.replace(/:/g, '-')}`;
}

function chapterAnchor(chapter: StorySpineChapter, beats: readonly StoryBeat[]): string {
    const lead = chapter.leadIndex >= 0 ? beats[chapter.leadIndex] : undefined;
    return lead ? beatAnchor(lead.id) : `xp-chapter-${chapter.id}`;
}

/** `Oracle Corporation — Software Engineer, March 2020 - May 2022`. */
function chapterHeading(lead: StoryBeat | undefined): string {
    if (!lead) return '';
    const name = lead.org ?? lead.title;
    const role = lead.org ? lead.title : undefined;
    const head = role ? `${name} — ${role}` : name;
    return lead.periodLabel ? `${head}, ${lead.periodLabel}` : head;
}

function chapterLabel(lead: StoryBeat | undefined): string {
    return lead ? (lead.org ?? lead.title) : '';
}

interface Mark {
    id: string;
    /** The employer. What a skimmer is actually looking for — never the poem. */
    label: string;
    subtitle?: string;
    beatCount: number;
    /** The station this mark stands on, or `null` for the overture. */
    station: Station | null;
}

// ─── The skimmer's landing lights ───────────────────────────────────────────

/**
 * `4s`, `100ms`, `10M+`, `3x`, `85%`, `100GB+`, `WCAG 2.1 AA`.
 *
 * CREATIVE-SPEC §2.5 asks for these to be wrapped at BUILD time in
 * `<b class="xp-metric">`. That pipeline does not exist yet and it belongs in
 * `story.ts`, which this world does not own — so the wrap happens here, at
 * render, over the already-parsed plain text. Two properties make that a
 * stopgap rather than a divergence: the class and every visual decision behind
 * it are the shared ones, and when the build-time wrap lands this function
 * deletes cleanly because it produces exactly the same element.
 *
 * It never splits a word and never splits a string per letter — the whole match
 * is one text node inside one `<b>` — so selection, find-in-page, screen-reader
 * reading order and print are all unaffected.
 */
const METRIC = /(WCAG\s2\.1\s?AA|\d+(?:\.\d+)?\s?(?:ms|s\b|x\b|%|M\+|K\+|GB\+?|min\b|hours?\b))/g;

function withMetrics(text: string): ReactNode {
    const parts = text.split(METRIC);
    if (parts.length === 1) return text;
    return parts.map((part, index) =>
        index % 2 === 1
            ? <b className="xp-metric" key={index}>{part}</b>
            : part,
    );
}

// ─── Reading position ───────────────────────────────────────────────────────

/**
 * Which mark the reader is inside.
 *
 * A middle-band `IntersectionObserver` over ids this component owns — "active"
 * means "occupying the middle of the viewport", not "topmost", or the map's lit
 * station flickers backwards every time two chapters straddle the fold.
 *
 * M41: no `document` read in an initializer. `null` is the server's answer and
 * the first client frame's answer; the real one lands after the observer fires.
 */
function useActiveMark(marks: readonly Mark[]): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);
    const key = marks.map((mark) => mark.id).join('|');

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const elements = (key ? key.split('|') : [])
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => element !== null);
        if (elements.length === 0) return;

        const visible = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.add(entry.target.id);
                    else visible.delete(entry.target.id);
                }
                setActiveId(elements.find((element) => visible.has(element.id))?.id ?? null);
            },
            { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
        );
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [key]);

    return activeId;
}

/**
 * The chapter announcement, and the keyboard subset.
 *
 * Both are the shared Stage's behaviour, re-stated rather than imported because
 * the shared Stage exports one component and nothing else. Where the behaviour
 * is identical the code is deliberately identical too: a world that navigates
 * differently from its four siblings is a world that has to be re-learned, and
 * the frame's whole argument is that the picture changes while the frame holds
 * still.
 *
 * `Space`, `PageDown` and native arrow-scroll are never bound. Every binding
 * no-ops inside a text control and inside the chat widget, and when any
 * modifier but the documented `Shift+G` is held.
 */
const CUT_MS = 560;

function useChapterKeys(
    marks: readonly Mark[],
    activeId: string | null,
    jump: (id: string) => void,
) {
    const marksRef = useRef(marks);
    const activeRef = useRef(activeId);
    const jumpRef = useRef(jump);

    /**
     * The latest values, parked where the listener can reach them.
     *
     * Refs rather than dependencies: the `keydown` listener must see the current
     * reading position without being torn down and re-attached on every scroll
     * tick, and a listener that re-attaches mid-keystroke drops the keystroke.
     * The writes are in an effect with no dependency array — after every commit,
     * never during render — because a ref written during render is read back by
     * a concurrent re-render that was supposed to be discarded.
     */
    useEffect(() => {
        marksRef.current = marks;
        activeRef.current = activeId;
        jumpRef.current = jump;
    });

    useEffect(() => {
        let lockedUntil = 0;
        let queued: string | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const commit = (id: string) => {
            const now = Date.now();
            if (now < lockedUntil) {
                // Queued, never dropped: `4 4 4` lands on 4 rather than
                // replaying every intermediate station.
                queued = id;
                return;
            }
            lockedUntil = now + CUT_MS;
            jumpRef.current(id);
            timer = setTimeout(() => {
                if (queued) {
                    const next = queued;
                    queued = null;
                    commit(next);
                }
            }, CUT_MS);
        };

        let pendingG = false;

        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (
                target?.closest(
                    'input, textarea, select, [contenteditable], [role="textbox"], [data-chat-widget]',
                )
            ) return;

            const list = marksRef.current;
            if (list.length === 0) return;
            const current = Math.max(0, list.findIndex((mark) => mark.id === activeRef.current));
            const go = (index: number) => {
                event.preventDefault();
                commit(list[Math.min(Math.max(index, 0), list.length - 1)].id);
            };

            if (event.key === 'G') { pendingG = false; go(list.length - 1); return; }
            if (event.key === 'g') {
                if (pendingG) { pendingG = false; go(0); } else { pendingG = true; }
                return;
            }
            pendingG = false;
            if (event.shiftKey) return;

            switch (event.key) {
                case 'j': go(current + 1); return;
                case 'k': go(current - 1); return;
                case 'ArrowRight': go(current + 1); return;
                case 'ArrowLeft': go(current - 1); return;
                default: break;
            }
            if (/^[1-9]$/.test(event.key)) go(Number(event.key) - 1);
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (timer) clearTimeout(timer);
        };
    }, []);
}

function useChapterAnnouncement(marks: readonly Mark[], activeId: string | null): string {
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (!activeId) return;
        const index = marks.findIndex((mark) => mark.id === activeId);
        if (index < 0) return;
        setMessage(`Chapter ${index + 1} of ${marks.length} — ${marks[index].label}`);
    }, [activeId, marks]);
    return message;
}

/** The TRUE fraction of beats completed — never a fraction of chapters. */
function progressFraction(marks: readonly Mark[], activeId: string | null): number {
    const index = marks.findIndex((mark) => mark.id === activeId);
    if (index < 0) return 0;
    const total = marks.reduce((sum, mark) => sum + mark.beatCount, 0);
    if (total === 0) return 0;
    return marks.slice(0, index + 1).reduce((sum, mark) => sum + mark.beatCount, 0) / total;
}

// ─── The map ────────────────────────────────────────────────────────────────

/**
 * One station, drawn: its silhouette, its glyph, its ordinal and — when the
 * chapter it stands for declares `echoes` — the echoed station's own symbol at
 * 3× and a thread back to it.
 *
 * `scale` is the only thing that differs between the two drawings of the civic
 * building, and `color` is the only thing that differs between any two
 * stations: the ramp stop, or `--xp-beat-peak` for the one chapter that echoes.
 * That is the single reference to the peak token in this world, and both the
 * 3× building and the thread inherit it through `currentColor` rather than
 * naming it twice.
 */
function StationArt({
    station,
    chapter,
    active,
    label,
    href,
    onJump,
    scale = 1,
}: {
    station: Station;
    chapter: StorySpineChapter | undefined;
    active: boolean;
    label: string;
    href: string;
    onJump: (id: string) => void;
    scale?: number;
}) {
    const echoed = chapter?.echoes
        ? STATION_LIST.find((other) => other.id === chapter.echoes)
        : undefined;
    // The peak is referenced HERE and nowhere else in this world. Everything
    // inside the group — the reprised building, the thread, the ring — takes it
    // through `currentColor`.
    const color = echoed
        ? 'var(--xp-beat-peak)'
        : `var(--xp-stage-${Math.min(station.index + 1, 7)})`;
    const size = 56 * scale;
    const reprise = echoed ? 3 : 1;

    return (
        <g style={{ color }} data-ow-station={station.id} data-ow-active={active ? '' : undefined}>
            {echoed && (
                /* The only line on the map that is not part of the route.
                   Drawn from the spine's own `echoes` field, between the two
                   stations that field names — there is no station id in this
                   expression. */
                <path
                    className="ow-thread"
                    d={echoThread(station.id, echoed.id) ?? undefined}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.75"
                />
            )}

            <use
                href={`#${SYMBOL_IDS[station.symbol]}`}
                x={station.x - (size * reprise) / 2}
                y={station.y - size * reprise}
                width={size * reprise}
                height={size * reprise}
            />

            {/* The glyph. A station is legible by SHAPE and by ORDINAL as well
                as by colour — colour is never the sole carrier of anything on
                this map, which is also what makes it survive greyscale, print
                and forced-colors. */}
            <circle
                cx={station.x}
                cy={station.y}
                r={active ? 7 : 5}
                fill="var(--xp-bg)"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
            {active && (
                <circle
                    cx={station.x}
                    cy={station.y}
                    r={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                    vectorEffect="non-scaling-stroke"
                />
            )}

            {/* Every station is clickable at all times — the map's strongest
                property is that the reader can leave for anywhere without
                traversing. The anchor is `tabindex=-1`: the map is
                `aria-hidden` stage art (§2.7.5), so it must not put a stop in
                the tab order, and the identical jump is a real focusable link in
                the rail beside it. Pointer users get the map; keyboard and
                assistive-tech users get the nav. Neither gets a dead end. */}
            <a href={href} tabIndex={-1} aria-hidden="true" onClick={() => onJump(href.slice(1))}>
                <title>{label}</title>
                <circle cx={station.x} cy={station.y} r={22} fill="transparent" />
            </a>
        </g>
    );
}

/**
 * The whole map: five planes, one route, nine stations, a sun and a lantern.
 *
 * Rendered at medium and cinema only. At compact the same art is drawn as nine
 * 180px vignettes inside the flow, which is a retelling rather than a crop —
 * see `Vignette`.
 */
function WorldMap({
    marks,
    chapters,
    activeId,
    tier,
    onJump,
}: {
    marks: readonly Mark[];
    chapters: readonly StorySpineChapter[];
    activeId: string | null;
    tier: NarrativeTier;
    onJump: (id: string) => void;
}) {
    return (
        <Box
            className="no-print xp-plane-stage ow-map"
            aria-hidden
            role="presentation"
            style={{ '--ow-travel': `${PLANE_TRAVEL[tier]}px` } as CSSProperties}
            sx={{
                flex: '0 0 auto',
                // Sticky inside a flex row only works on an item that is not
                // stretched, so the alignment is stated rather than inherited.
                alignSelf: 'flex-start',
                // The map is a picture of the whole journey, so it is never
                // cropped by its own container: the viewBox does the fitting and
                // the element only decides how much room the picture gets.
                width: tier === 'cinema' ? '38vw' : '100%',
                maxWidth: tier === 'cinema' ? '38vw' : 'none',
                overflow: 'hidden',
            }}
        >
            <svg
                viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
                // `meet`, never `slice`. Slicing a 360x1040 map into a 40svh
                // band or a 38vw column crops stations out of the frame, and a
                // map whose whole promise is "the entire journey is visible
                // before you move" cannot have a station off screen. Letterboxed
                // and complete beats filled and partial.
                preserveAspectRatio="xMidYMid meet"
                width="100%"
                height="100%"
                focusable="false"
            >
                {/* The sun — the single warm source the whole map is lit by,
                    and the only thing on the far plane. It crosses the sky as
                    the reader travels, which is the one piece of "time passing"
                    this world states, and it states it with no clock. */}
                <g className="ow-sun" style={{ color: 'var(--xp-accent)' }}>
                    <circle cx={VIEW.width * 0.72} cy={74} r={16} fill="currentColor" />
                    <circle cx={VIEW.width * 0.72} cy={74} r={34} fill="currentColor" opacity="0.12" />
                </g>

                {PLANES.map((plane) => (
                    <g
                        key={plane.key}
                        // The blur class is separate rather than a `blur(0px)`
                        // that resolves to nothing: a zero-radius filter still
                        // forces the group into its own raster pass, so two of
                        // the four planes would pay for an effect they do not
                        // use.
                        className={plane.blur ? 'ow-plane ow-plane--blur' : 'ow-plane'}
                        style={{
                            '--ow-ratio': plane.ratio,
                            '--ow-blur': `${plane.blur}px`,
                            opacity: plane.opacity,
                        } as CSSProperties}
                    >
                        {plane.key === 'far' && (
                            <path
                                d={RIDGE}
                                fill="none"
                                stroke="var(--xp-stage-1)"
                                strokeWidth="2"
                            />
                        )}
                        {plane.key === 'mid' && (
                            <path d={TERRAIN_FILL} fill="var(--xp-bg-alt)" />
                        )}
                        {plane.key === 'ground' && (
                            <>
                                <path d={TERRAIN_FILL} fill="var(--xp-surface)" />
                                {/* The one hairline where a region meets the
                                    ground. 1px, always — never 2, never 0.5. */}
                                <path
                                    d={TERRAIN}
                                    fill="none"
                                    stroke="var(--xp-border)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </>
                        )}
                        {plane.key === 'fore' && (
                            <path
                                d={`M -8 ${VIEW.height - 40} Q ${VIEW.width / 2} ${VIEW.height - 96} ${VIEW.width + 8} ${VIEW.height - 40} L ${VIEW.width + 8} ${VIEW.height + 8} L -8 ${VIEW.height + 8} Z`}
                                fill="var(--xp-surface-alt)"
                            />
                        )}
                    </g>
                ))}

                {/* The rail yard's carriages: the map's one ambient loop, on the
                    only station whose content is throughput. It lives outside
                    the silhouette so it can be stopped without the station
                    becoming unreadable, and it is nowhere near text. */}
                <g className="ow-yard" style={{ color: 'var(--xp-stage-5)' }} opacity="0.34">
                    {[0, 1, 2, 3].map((i) => (
                        <rect
                            key={i}
                            x={STATION_LIST[4].x - 60 + i * 34}
                            y={STATION_LIST[4].y + 12}
                            width={24}
                            height={10}
                            fill="currentColor"
                        />
                    ))}
                </g>

                {/* The route ahead, and the route behind. Two paths, one
                    geometry: the reader sees where they are going at all times
                    and where they have been at full strength. `pathLength=1`
                    turns "how far along" into a pure number, which is what lets
                    one scroll-linked property drive the draw with no JS. */}
                <path
                    d={ROUTE}
                    pathLength={1}
                    fill="none"
                    stroke="var(--xp-accent)"
                    strokeOpacity="0.44"
                    strokeWidth="3"
                    strokeLinecap="round"
                    // Detail scales WITH the viewport rather than being hidden by
                    // overflow: `--xp-density` is 24 / 90 / 180 segments.
                    strokeDasharray="calc(0.4 / var(--xp-density)) calc(0.6 / var(--xp-density))"
                />
                <path
                    className="ow-route-done"
                    d={ROUTE}
                    pathLength={1}
                    fill="none"
                    stroke="var(--xp-accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="1"
                />

                {STATION_LIST.map((station) => {
                    const chapter = chapters.find((entry) => entry.id === station.id);
                    const mark = marks.find((entry) => entry.station?.id === station.id);
                    if (!mark) return null;
                    return (
                        <g key={station.id}>
                            {/* Side-paths: one branch per project the chapter
                                carries, drawn from the spine's own `also` list. */}
                            {station.waypoints.map((waypoint) => (
                                <g key={waypoint.beatId} opacity="0.6">
                                    <path
                                        d={waypoint.path}
                                        fill="none"
                                        stroke="var(--xp-text-muted)"
                                        strokeWidth="1"
                                        strokeDasharray="2 4"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    <circle cx={waypoint.x} cy={waypoint.y} r={3.5} fill="var(--xp-text-muted)" />
                                </g>
                            ))}
                            <StationArt
                                station={station}
                                chapter={chapter}
                                active={mark.id === activeId}
                                label={mark.label}
                                href={`#${mark.id}`}
                                onJump={onJump}
                            />
                            {/* The employer, on the sky rather than on a region:
                                measured at 14.13:1 against the composited sky
                                and never over a ramp fill, which is where this
                                text would have been unreadable. */}
                            <text
                                x={station.x + (station.lane > 0.5 ? -26 : 26)}
                                y={station.y + 4}
                                textAnchor={station.lane > 0.5 ? 'end' : 'start'}
                                fill="var(--xp-text)"
                                style={{
                                    fontFamily: 'var(--xp-font-label)',
                                    fontSize: '13px',
                                    letterSpacing: 'var(--xp-track-caps)',
                                }}
                            >
                                {mark.label}
                            </text>
                        </g>
                    );
                })}

                {/* The lantern's light — the first source on the map that is not
                    the sun, and the second and last. It arrives with chapter 5,
                    which is the beat where the on-device model begins to warm:
                    the dramatic timing and the performance decision are one
                    decision. */}
                <g
                    className="ow-lantern"
                    style={{ '--ow-at': STATION_LIST[5].at, color: 'var(--xp-accent)' } as CSSProperties}
                >
                    <circle cx={STATION_LIST[5].x} cy={STATION_LIST[5].y - 40} r={30} fill="currentColor" opacity="0.18" />
                </g>

                {/* The token. 18px, no face, no walk cycle: there is nothing to
                    watch while there is something to read. It advances by
                    `offset-path` — a native browser feature, no library, no
                    per-frame JS — and it moves only while the reader scrolls. */}
                <g
                    className="ow-token"
                    style={{ '--ow-route': `path("${ROUTE}")` } as CSSProperties}
                >
                    <circle r={9} fill="var(--xp-bg)" stroke="var(--xp-accent)" strokeWidth="3" />
                    <circle r={3} fill="var(--xp-accent)" />
                </g>

                {/* The shared 160×160 turbulence grain, at 0.035 over overlay.
                    Inline rather than a raster: it is 300 bytes, it scales, and
                    it is the one material every world shares. */}
                <filter id="ow-grain" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                </filter>
                <rect
                    width={VIEW.width}
                    height={VIEW.height}
                    filter="url(#ow-grain)"
                    opacity="0.035"
                    style={{ mixBlendMode: 'overlay' }}
                />
            </svg>
        </Box>
    );
}

/**
 * The compact telling of the map: one station, cropped from the same art.
 *
 * 180px, inside the chapter it belongs to, showing that station's silhouette
 * and the two stubs of route entering and leaving it. It is not the big map
 * scaled down — a nine-station map at 390px is nine unreadable dots — and it is
 * not the big map with things hidden. It is the same geometry, framed.
 */
function Vignette({ station, chapter }: { station: Station; chapter: StorySpineChapter | undefined }) {
    const echoed = chapter?.echoes ? STATION_LIST.find((s) => s.id === chapter.echoes) : undefined;
    const color = echoed ? 'var(--xp-beat-peak)' : `var(--xp-stage-${Math.min(station.index + 1, 7)})`;

    return (
        <Box
            className="no-print ow-vignette"
            aria-hidden
            role="presentation"
            sx={{ height: 180, mb: 'var(--xp-sp-5)', borderRadius: RADIUS.card, overflow: 'hidden' }}
        >
            <svg viewBox={station.vignette} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" focusable="false">
                <path d={TERRAIN_FILL} fill="var(--xp-surface)" />
                <path d={TERRAIN} fill="none" stroke="var(--xp-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <path d={ROUTE} fill="none" stroke="var(--xp-accent)" strokeOpacity="0.44" strokeWidth="3" strokeLinecap="round" />
                <g style={{ color }}>
                    <use
                        href={`#${SYMBOL_IDS[station.symbol]}`}
                        x={station.x - (echoed ? 84 : 28)}
                        y={station.y - (echoed ? 168 : 56)}
                        width={echoed ? 168 : 56}
                        height={echoed ? 168 : 56}
                    />
                    <circle cx={station.x} cy={station.y} r={6} fill="var(--xp-bg)" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </g>
            </svg>
        </Box>
    );
}

// ─── The inventory ──────────────────────────────────────────────────────────

interface Slot {
    group: SkillGroupId;
    label: string;
    /** Where on the route this slot fills — the granting chapter's own position. */
    at: number;
    tags: readonly string[];
}

/**
 * Five slots, and the unacquired ones are VISIBLE at 0.18 alpha rather than
 * hidden.
 *
 * Seeing what is coming is what makes progression feel like progression, and it
 * is also the honest thing: an inventory that revealed its own slots one at a
 * time would be a progress affordance that lies about how much is left. The
 * fill is one `calc()` off `--ow-p` per slot, thresholded at the position of
 * the chapter that grants it — data, from the spine, with no state anywhere.
 *
 * `aria-hidden`, because every skill group in it is real content that the coda
 * renders as beats; announcing it twice would make a screen-reader user hear
 * the whole skills section arrive in fragments and then again in full.
 */
function Inventory({ slots, docked }: { slots: readonly Slot[]; docked: boolean }) {
    return (
        <Box
            className="no-print ow-inventory"
            aria-hidden
            sx={{
                ...(docked
                    ? {
                        position: 'fixed',
                        left: 'var(--xp-sp-5)',
                        bottom: 'calc(var(--xp-sp-5) + env(safe-area-inset-bottom))',
                        width: 320,
                        zIndex: (theme) => theme.zIndex.appBar,
                    }
                    : { mb: 'var(--xp-sp-6)' }),
                p: 'var(--xp-sp-4)',
                borderRadius: RADIUS.card,
                border: 'var(--xp-hairline) solid var(--xp-border)',
                // 88% ground: measured at 12.87:1 for text and 5.79:1 for muted
                // even when it lands on the brightest stop of the ramp.
                backgroundColor: 'color-mix(in oklab, var(--xp-bg) 88%, transparent)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <Box
                sx={{
                    fontFamily: 'var(--xp-font-label)',
                    fontSize: 'var(--xp-fs-1)',
                    letterSpacing: 'var(--xp-track-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--xp-text-muted)',
                    mb: 'var(--xp-sp-3)',
                }}
            >
                Inventory
            </Box>
            <Box sx={{ display: 'grid', gap: 'var(--xp-sp-2)' }}>
                {slots.map((slot) => (
                    <Box
                        key={slot.group}
                        className="ow-slot"
                        style={{ '--ow-at': slot.at } as CSSProperties}
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 'var(--xp-sp-3)',
                            px: 'var(--xp-sp-3)',
                            py: 'var(--xp-sp-2)',
                            borderRadius: RADIUS.chip,
                            border: 'var(--xp-hairline) solid var(--xp-border)',
                            position: 'relative',
                        }}
                    >
                        {/* The empty slot: an outlined chip at 0.18, always
                            present. The fill is a sibling that ramps to 1 —
                            nothing appears, something LIGHTS. */}
                        <Box
                            className="ow-slot-fill"
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: RADIUS.chip,
                                backgroundColor: 'var(--xp-accent-soft)',
                            }}
                        />
                        <Box
                            component="span"
                            className="xp-tnum ow-slot-text"
                            sx={{
                                position: 'relative',
                                fontFamily: 'var(--xp-font-label)',
                                fontSize: 'var(--xp-fs-2)',
                                color: 'var(--xp-text)',
                            }}
                        >
                            {slot.label}
                        </Box>
                        <Box
                            component="span"
                            className="ow-slot-text"
                            sx={{
                                position: 'relative',
                                ml: 'auto',
                                fontFamily: 'var(--xp-font-label)',
                                fontSize: 'var(--xp-fs-1)',
                                color: 'var(--xp-text-muted)',
                            }}
                        >
                            {slot.tags.length}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// ─── The chrome ─────────────────────────────────────────────────────────────

/**
 * The route rail — the shared progress affordance, wearing this world's
 * costume.
 *
 * Real `<a href>` links in a `<nav aria-label><ol>` with `aria-current="step"`,
 * so middle-click, copy-link-address and open-in-new-tab all work. Labels are
 * COMPANY NAMES; the poetic station name is an 11px subtitle at 0.55 alpha on
 * hover and focus, and is in the DOM at all times so a screen reader gets it
 * with no hover ever happening.
 *
 * Two variants, one component: a vertical rail at cinema and medium, and a left
 * gutter route at compact — a 3px line with nine station glyphs on it, which is
 * the map itself at the one width where the map cannot also be a picture.
 */
function RouteRail({
    marks,
    activeId,
    reduceMotion,
    onJump,
    compact,
}: {
    marks: readonly Mark[];
    activeId: string | null;
    reduceMotion: boolean;
    onJump: (id: string) => void;
    compact: boolean;
}) {
    const progress = progressFraction(marks, activeId);

    return (
        <Box
            component="nav"
            className="no-print"
            aria-label="Career progress"
            sx={
                compact
                    ? {
                        position: 'fixed',
                        left: 'max(6px, env(safe-area-inset-left))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: (theme) => theme.zIndex.appBar,
                    }
                    : {
                        flex: '0 0 auto',
                        width: 'var(--xp-rail-width)',
                        position: 'sticky',
                        top: DOOR_CLEARANCE,
                        alignSelf: 'flex-start',
                        pl: 'var(--xp-sp-5)',
                        borderLeft: 'var(--xp-hairline) solid var(--xp-border)',
                        borderRadius: RADIUS.card,
                        backgroundColor: 'color-mix(in oklab, var(--xp-bg) 88%, transparent)',
                        backdropFilter: 'blur(10px)',
                        py: 'var(--xp-sp-3)',
                    }
            }
        >
            {/* The travelled route. `scaleY` from the top, so its resting frame
                at zero progress is a zero-height line rather than a hidden one —
                nothing here can withhold a station's name. */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    left: compact ? '21px' : 'calc(var(--xp-hairline) * -1)',
                    top: 0,
                    bottom: 0,
                    width: compact ? '3px' : '2px',
                    backgroundColor: 'var(--xp-accent)',
                    transformOrigin: 'top',
                    transform: `scaleY(${progress})`,
                    transition: reduceMotion ? 'none' : 'transform var(--xp-dur-element) var(--xp-ease-ui)',
                }}
            />
            {compact && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        left: '21px',
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        backgroundColor: 'var(--xp-accent)',
                        opacity: 0.44,
                    }}
                />
            )}

            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {marks.map((mark, index) => {
                    const active = mark.id === activeId;
                    const stop = mark.station
                        ? `var(--xp-stage-${Math.min(mark.station.index + 1, 7)})`
                        : 'var(--xp-text-muted)';
                    return (
                        <Box component="li" key={mark.id} sx={{ m: 0 }}>
                            <Box
                                component="a"
                                href={`#${mark.id}`}
                                onClick={() => onJump(mark.id)}
                                aria-current={active ? 'step' : undefined}
                                title={compact ? mark.label : undefined}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--xp-sp-3)',
                                    minHeight: 44,
                                    ...(compact ? { width: 44, justifyContent: 'center' } : { py: 'var(--xp-sp-2)' }),
                                    borderRadius: RADIUS.chip,
                                    textDecoration: 'none',
                                    fontFamily: 'var(--xp-font-label)',
                                    fontSize: 'var(--xp-fs-2)',
                                    letterSpacing: '0.04em',
                                    color: active ? 'var(--xp-text)' : 'var(--xp-text-muted)',
                                    fontWeight: active ? 600 : 400,
                                    '&:hover, &:focus-visible': {
                                        color: 'var(--xp-text)',
                                        '& .xp-rail-subtitle': { opacity: 0.55 },
                                    },
                                }}
                            >
                                {/* The station glyph: a 12px pip in the ramp
                                    stop, which is the same colour the station
                                    wears on the map, so the rail and the picture
                                    are visibly one thing. */}
                                <Box
                                    aria-hidden
                                    sx={{
                                        flex: '0 0 auto',
                                        width: active ? 12 : 8,
                                        height: active ? 12 : 8,
                                        borderRadius: RADIUS.pill,
                                        border: `2px solid ${stop}`,
                                        backgroundColor: active ? stop : 'transparent',
                                        transition: reduceMotion ? 'none' : 'all var(--xp-dur-ui) var(--xp-ease-ui)',
                                    }}
                                />
                                {compact ? (
                                    <Box component="span" sx={srOnly}>{mark.label}</Box>
                                ) : (
                                    <Box component="span" sx={{ minWidth: 0 }}>
                                        <Box component="span" className="xp-tnum" aria-hidden sx={{ opacity: 0.7, mr: 'var(--xp-sp-2)' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Box>
                                        {mark.label}
                                        {mark.subtitle && (
                                            <Box
                                                component="span"
                                                className="xp-rail-subtitle"
                                                sx={{
                                                    display: 'block',
                                                    fontSize: 'var(--xp-fs-1)',
                                                    fontWeight: 400,
                                                    letterSpacing: 0,
                                                    opacity: 0,
                                                    transition: reduceMotion ? 'none' : 'opacity var(--xp-dur-micro) var(--xp-ease-ui)',
                                                }}
                                            >
                                                {mark.subtitle}
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

/**
 * The compact bottom band: where the reader is, and where they are going next.
 *
 * The next control is labelled with the NEXT EMPLOYER — never a bare chevron.
 * A chevron in the thumb arc of a career story is the one control that costs a
 * tap to find out what it does, and a reader deciding whether to keep going is
 * exactly the reader who will not spend it.
 *
 * Both controls live inside `--xp-nav-h`, the reserved band the chat FAB also
 * offsets from, so nothing can ever stack on the home indicator.
 */
function CompactBand({
    marks,
    activeId,
    reduceMotion,
    onJump,
}: {
    marks: readonly Mark[];
    activeId: string | null;
    reduceMotion: boolean;
    onJump: (id: string) => void;
}) {
    const index = marks.findIndex((mark) => mark.id === activeId);
    const here = index >= 0 ? index : 0;
    const mark = marks[here];
    const next = marks[here + 1];
    const progress = progressFraction(marks, activeId);
    if (!mark) return null;

    return (
        <>
            <Box
                aria-hidden
                className="no-print"
                sx={{
                    position: 'fixed',
                    insetInline: 0,
                    top: 0,
                    height: '3px',
                    zIndex: (theme) => theme.zIndex.appBar,
                    backgroundColor: 'var(--xp-accent)',
                    transformOrigin: 'left',
                    transform: `scaleX(${progress})`,
                    transition: reduceMotion ? 'none' : 'transform var(--xp-dur-element) var(--xp-ease-ui)',
                }}
            />
            <Box
                className="no-print"
                sx={{
                    position: 'fixed',
                    insetInline: 0,
                    bottom: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--xp-sp-2)',
                    px: 'var(--xp-sp-4)',
                    pb: 'calc(var(--xp-sp-3) + env(safe-area-inset-bottom))',
                    pt: 'var(--xp-sp-3)',
                    backgroundColor: 'color-mix(in oklab, var(--xp-bg) 88%, transparent)',
                    backdropFilter: 'blur(10px)',
                    borderTop: 'var(--xp-hairline) solid var(--xp-border)',
                }}
            >
                <Box
                    component="a"
                    href={`#${mark.id}`}
                    onClick={() => onJump(mark.id)}
                    sx={{
                        minHeight: 44,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--xp-sp-2)',
                        px: 'var(--xp-sp-3)',
                        borderRadius: RADIUS.pill,
                        textDecoration: 'none',
                        fontFamily: 'var(--xp-font-label)',
                        fontSize: 'var(--xp-fs-2)',
                        color: 'var(--xp-text)',
                        border: 'var(--xp-hairline) solid var(--xp-border)',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                    }}
                >
                    <Box component="span" className="xp-tnum" aria-hidden>
                        {String(here + 1).padStart(2, '0')} / {String(marks.length).padStart(2, '0')}
                    </Box>
                    <Box component="span" aria-hidden sx={{ opacity: 0.5 }}>·</Box>
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{mark.label}</Box>
                    <Box component="span" sx={srOnly}>{`Chapter ${here + 1} of ${marks.length}`}</Box>
                </Box>

                {next && (
                    <Box
                        component="a"
                        href={`#${next.id}`}
                        onClick={() => onJump(next.id)}
                        sx={{
                            ml: 'auto',
                            flex: '1 1 auto',
                            minWidth: 0,
                            height: 56,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--xp-sp-2)',
                            px: 'var(--xp-sp-4)',
                            borderRadius: RADIUS.pill,
                            textDecoration: 'none',
                            fontFamily: 'var(--xp-font-label)',
                            fontSize: 'var(--xp-fs-3)',
                            fontWeight: 600,
                            // Ink on the accent fill: 12.00:1, which is also the
                            // focus ring's own pairing, so the control that gets
                            // pressed most is the one measured most.
                            color: 'var(--xp-focus-ink)',
                            backgroundColor: 'var(--xp-accent)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}
                    >
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {`Next · ${next.label}`}
                        </Box>
                        <Box component="span" aria-hidden>→</Box>
                    </Box>
                )}
            </Box>
        </>
    );
}

// ─── The flow ───────────────────────────────────────────────────────────────

function beatMeta(beat: StoryBeat, shows: (part: TellingSpec['show'][number]) => boolean): string[] {
    const parts: string[] = [];
    if (beat.periodLabel) parts.push(beat.periodLabel);
    if (beat.years >= 1) parts.push(beat.years === 1 ? '1 yr' : `${beat.years} yrs`);
    if (beat.era) parts.push(beat.era);
    if (shows('location') && beat.location) parts.push(beat.location);
    return parts;
}

/**
 * One beat, told at the current tier.
 *
 * Every beat is rendered at every tier and `show` filters PARTS of a beat,
 * never beats. Compact does not collapse its bullets behind a disclosure, and
 * that is a deliberate departure from §4.4's "+4 more": a closed `<details>` is
 * content that a printer, a crawler and a reader with JS off cannot open, and
 * the shared print sheet can force the element to `display: block` without
 * forcing it OPEN. The retelling instead demotes the bullets after the first to
 * the smaller step of the same ladder — shorter, never absent.
 */
function Beat({
    beat,
    index,
    spec,
    lead,
    tier,
}: {
    beat: StoryBeat;
    index: number;
    spec: TellingSpec;
    lead: boolean;
    tier: NarrativeTier;
}) {
    const shows = (part: TellingSpec['show'][number]) => spec.show.includes(part);
    const meta = beatMeta(beat, shows);

    return (
        <Box
            component="article"
            className="xp-beat"
            data-beat-id={beat.id}
            style={{ '--xp-beat-index': index % Math.max(spec.beatsInView, 1) } as CSSProperties}
            sx={{
                maxWidth: 'var(--xp-measure)',
                minWidth: 0,
                borderLeft: beat.featured ? '2px solid var(--xp-accent)' : '2px solid transparent',
                pl: 'var(--xp-sp-4)',
                ml: 'calc(var(--xp-sp-4) * -1)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 'var(--xp-sp-3)',
                    fontFamily: 'var(--xp-font-label)',
                    fontSize: 'var(--xp-fs-1)',
                    letterSpacing: 'var(--xp-track-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--xp-text-muted)',
                }}
            >
                <Box component="span" className="xp-tnum">{String(beat.chapter).padStart(2, '0')}</Box>
                {beat.isPresent && (
                    <Box component="span" sx={{ color: 'var(--xp-text)', fontWeight: 600 }}>Present</Box>
                )}
            </Box>

            {!lead && (
                <Box
                    component="h3"
                    sx={{
                        m: 0,
                        mt: 'var(--xp-sp-2)',
                        fontFamily: 'var(--xp-font-display)',
                        fontSize: 'var(--xp-fs-6)',
                        lineHeight: 'var(--xp-lh-title)',
                        letterSpacing: 'var(--xp-track-mid)',
                        fontWeight: 700,
                        color: 'var(--xp-text)',
                        textWrap: 'balance',
                    }}
                >
                    {beat.link ? (
                        <Box
                            component="a"
                            href={beat.link}
                            sx={{
                                color: 'inherit',
                                textDecoration: 'none',
                                borderBottom: 'var(--xp-hairline) solid var(--xp-accent)',
                                '&:hover': { borderBottomWidth: '2px' },
                            }}
                        >
                            {beat.title}
                        </Box>
                    ) : beat.title}
                </Box>
            )}

            {!lead && shows('org') && beat.org && (
                <Box sx={{ mt: 'var(--xp-sp-1)', fontSize: 'var(--xp-fs-3)', fontWeight: 500, color: 'var(--xp-text)' }}>
                    {beat.org}
                    {beat.via && (
                        <Box component="span" sx={{ color: 'var(--xp-text-muted)', fontWeight: 400 }}>
                            {` · via ${beat.via}`}
                        </Box>
                    )}
                </Box>
            )}

            {!lead && meta.length > 0 && (
                <Box
                    className="xp-tnum"
                    sx={{
                        mt: 'var(--xp-sp-1)',
                        fontFamily: 'var(--xp-font-label)',
                        fontSize: 'var(--xp-fs-2)',
                        color: 'var(--xp-text-muted)',
                    }}
                >
                    {meta.join(' · ')}
                </Box>
            )}

            {shows('summary') && beat.summary && (
                <Box
                    sx={{
                        mt: 'var(--xp-sp-3)',
                        fontSize: 'var(--xp-fs-base)',
                        lineHeight: 'var(--xp-lh-body)',
                        color: 'var(--xp-text)',
                        textWrap: 'pretty',
                    }}
                >
                    {withMetrics(beat.summary)}
                </Box>
            )}

            {shows('bullets') && beat.bullets.length > 0 && (
                <Box component="ul" sx={{ mt: 'var(--xp-sp-3)', mb: 0, pl: 0, listStyle: 'none' }}>
                    {beat.bullets.map((bullet, i) => (
                        <Box
                            component="li"
                            key={`${beat.id}:${i}`}
                            sx={{
                                position: 'relative',
                                pl: 'var(--xp-sp-5)',
                                mb: 'var(--xp-sp-2)',
                                lineHeight: 'var(--xp-lh-body)',
                                color: 'var(--xp-text)',
                                textWrap: 'pretty',
                                // The compact retelling: the lead bullet at full
                                // size, the rest one step down. Shorter, never
                                // hidden — a printer can render every word.
                                fontSize: tier === 'compact' && i > 0 ? 'var(--xp-fs-3)' : 'inherit',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    top: '0.6em',
                                    width: 'var(--xp-sp-3)',
                                    height: 'var(--xp-hairline)',
                                    backgroundColor: 'var(--xp-accent)',
                                },
                            }}
                        >
                            {bullet.label && (
                                <Box component="strong" sx={{ fontWeight: 600 }}>{`${bullet.label}: `}</Box>
                            )}
                            {withMetrics(bullet.text)}
                        </Box>
                    ))}
                </Box>
            )}

            {shows('tags') && beat.tags.length > 0 && (
                <Box
                    component="ul"
                    aria-label="Technologies"
                    sx={{
                        mt: 'var(--xp-sp-3)',
                        mb: 0,
                        p: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--xp-sp-2)',
                    }}
                >
                    {beat.tags.map((tag) => (
                        <Box
                            component="li"
                            key={tag}
                            sx={{
                                fontFamily: 'var(--xp-font-label)',
                                fontSize: 'var(--xp-fs-1)',
                                color: 'var(--xp-text-muted)',
                                border: 'var(--xp-hairline) solid var(--xp-border)',
                                borderRadius: RADIUS.chip,
                                px: 'var(--xp-sp-2)',
                                py: 'var(--xp-sp-1)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {tag}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

/** The title card: the story's one `about` beat, at display size, with the h1. */
function Overture({ beat, spec, id }: { beat: StoryBeat; spec: TellingSpec; id: string }) {
    const shows = (part: TellingSpec['show'][number]) => spec.show.includes(part);
    return (
        <Box
            component="header"
            id={id}
            className="xp-beat"
            data-beat-id={beat.id}
            style={{ '--xp-beat-index': 0 } as CSSProperties}
            sx={{ scrollMarginTop: DOOR_CLEARANCE, mb: 'var(--xp-sp-9)', maxWidth: 'var(--xp-measure)' }}
        >
            <Box
                component="h1"
                sx={{
                    m: 0,
                    fontFamily: 'var(--xp-font-display)',
                    fontSize: 'var(--xp-fs-display-2)',
                    lineHeight: 'var(--xp-lh-display)',
                    letterSpacing: 'var(--xp-track-large)',
                    fontWeight: 800,
                    color: 'var(--xp-text)',
                    textWrap: 'balance',
                }}
            >
                {beat.title}
            </Box>
            {beat.org && (
                <Box
                    sx={{
                        mt: 'var(--xp-sp-3)',
                        fontFamily: 'var(--xp-font-label)',
                        fontSize: 'var(--xp-fs-2)',
                        letterSpacing: 'var(--xp-track-caps)',
                        textTransform: 'uppercase',
                        color: 'var(--xp-text-muted)',
                    }}
                >
                    {[beat.org, beat.location].filter(Boolean).join(' · ')}
                </Box>
            )}
            {shows('summary') && beat.summary && (
                <Box
                    sx={{
                        mt: 'var(--xp-sp-5)',
                        fontSize: 'var(--xp-fs-base)',
                        lineHeight: 'var(--xp-lh-body)',
                        color: 'var(--xp-text)',
                        textWrap: 'pretty',
                    }}
                >
                    {withMetrics(beat.summary)}
                </Box>
            )}
        </Box>
    );
}

/** How the beats of one chapter are arranged. Never fewer beats — fewer columns. */
function chapterGridSx(spec: TellingSpec) {
    const n = Math.max(spec.beatsInView, 1);
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        gap: 'var(--xp-gutter)',
        alignItems: 'start',
    } as const;
}

export default function OverworldStage({ story, tier, reduceMotion }: StageProps) {
    const { experience } = useExperience();
    const spec = experience.telling[tier];
    const copy = experience.copy;
    const compact = tier === 'compact';

    const overtureBeat = story.byKind.about[0];
    const overtureIndex = overtureBeat
        ? story.beats.findIndex((beat) => beat.id === overtureBeat.id)
        : -1;

    const chapters = useMemo(
        () => story.spine.chapters.filter((chapter) =>
            chapter.beats.some((beatIndex) => beatIndex !== overtureIndex),
        ),
        [story.spine.chapters, overtureIndex],
    );

    const anchors = useMemo(
        () => chapters.map((chapter) => chapterAnchor(chapter, story.beats)),
        [chapters, story.beats],
    );

    const marks = useMemo<Mark[]>(() => {
        const chapterMarks = chapters.map((chapter, index) => ({
            id: anchors[index],
            label: chapterLabel(chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined)
                || chapter.id,
            subtitle: copy?.[chapter.id]?.chapter,
            beatCount: chapter.beats.filter((beatIndex) => beatIndex !== overtureIndex).length,
            station: STATION_LIST.find((entry) => entry.id === chapter.id) ?? null,
        }));
        return overtureBeat
            ? [{ id: OVERTURE_ID, label: overtureBeat.title, beatCount: 1, station: null }, ...chapterMarks]
            : chapterMarks;
    }, [chapters, anchors, story.beats, copy, overtureBeat, overtureIndex]);

    /**
     * The five inventory slots, derived: each skill group's label and tag count
     * come from the beat that IS that group, and its fill threshold is the
     * position of the first chapter whose `grants` names it. Nothing about the
     * inventory is authored twice, so nothing about it can disagree with the
     * spine or with `content/`.
     */
    const slots = useMemo<Slot[]>(() => {
        const groups: SkillGroupId[] = ['languages', 'frameworks', 'cloud', 'ai', 'tools'];
        return groups.map((group) => {
            const granting = story.spine.chapters.find((chapter) => chapter.grants.includes(group));
            const station = granting
                ? STATION_LIST.find((entry) => entry.id === granting.id)
                : undefined;
            const beat = story.byKind.skills.find((entry) => entry.id.endsWith(group));
            return {
                group,
                label: beat?.title ?? group,
                at: station?.at ?? 1,
                tags: beat?.tags ?? [],
            };
        });
    }, [story.spine.chapters, story.byKind.skills]);

    const activeId = useActiveMark(marks);
    const announcement = useChapterAnnouncement(marks, activeId);

    const headingsRef = useRef(new Map<ChapterId, HTMLElement>());
    const setHeading = useCallback((id: ChapterId, element: HTMLElement | null) => {
        if (element) headingsRef.current.set(id, element);
        else headingsRef.current.delete(id);
    }, []);

    /**
     * A deliberate jump is a CUT, never a pan across the map: panning four
     * stations is three seconds of nausea, and it is also three seconds during
     * which the reader cannot read. `preventScroll: true` on the focus move is
     * load-bearing — without it the browser adds its own instant scroll on top
     * of the smooth one already in flight and the jump visibly double-lands.
     */
    const jump = useCallback((id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start',
        });
        const index = anchors.indexOf(id);
        if (index >= 0) headingsRef.current.get(chapters[index].id)?.focus({ preventScroll: true });
        if (typeof history !== 'undefined') history.pushState(null, '', `#${id}`);
    }, [anchors, chapters, reduceMotion]);

    useChapterKeys(marks, activeId, jump);

    return (
        <Box
            component="main"
            data-xp-stage=""
            data-tier={tier}
            data-flow={spec.flow}
            // The one scroll timeline in the world, declared on the element every
            // consumer inherits from. `xp-scroll-linked` is the class the shared
            // reduced-motion gate drops the timeline on, so this world never has
            // to remember to still itself.
            className="ow-timeline xp-scroll-linked"
            sx={{
                fontFamily: 'var(--xp-font-body)',
                fontSize: 'var(--xp-fs-base)',
                color: 'var(--xp-text)',
                px: 'var(--xp-gutter)',
                pt: DOOR_CLEARANCE,
                pb: 'calc(var(--xp-nav-h) + var(--xp-sp-9))',
                ...(compact ? { pl: 'calc(var(--xp-gutter) + 44px)' } : null),
                scrollBehavior: reduceMotion ? 'auto' : 'smooth',
            }}
        >
            <MapDefs />

            <Box aria-live="polite" role="status" sx={srOnly}>{announcement}</Box>

            {/* One axis at every viewport, and three arrangements of it.
                cinema  the map is a sticky 38vw stage beside the flow.
                medium  the map is a sticky band ABOVE the flow — same picture,
                        same geometry, landscape crop, half the parallax.
                compact the map is nine vignettes inside the chapters, plus the
                        route in the left gutter. No sticky band: a 40svh band on
                        a 390px screen leaves 60% of a phone for a career. */}
            {tier === 'medium' && (
                <WorldMap
                    marks={marks}
                    chapters={chapters}
                    activeId={activeId}
                    tier={tier}
                    onJump={jump}
                />
            )}

            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--xp-gutter)',
                    maxWidth: 1400,
                    mx: 'auto',
                }}
            >
                {tier === 'cinema' && (
                    <WorldMap
                        marks={marks}
                        chapters={chapters}
                        activeId={activeId}
                        tier={tier}
                        onJump={jump}
                    />
                )}

                <Box className="xp-plane-flow" sx={{ flex: '1 1 auto', minWidth: 0, width: 'auto' }}>
                    {overtureBeat && <Overture beat={overtureBeat} spec={spec} id={OVERTURE_ID} />}

                    <Box data-xp-chapters="">
                        {chapters.map((chapter, index) => {
                            const station = STATION_LIST.find((entry) => entry.id === chapter.id);
                            const beatIndices = chapter.beats.filter((i) => i !== overtureIndex);
                            const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
                            const anchorId = anchors[index];
                            const headingId = `${anchorId}-heading`;
                            const heading = chapterHeading(lead) || chapter.id;
                            const chapterCopy = copy?.[chapter.id];
                            const HeadingTag = !overtureBeat && index === 0 ? 'h1' : 'h2';

                            return (
                                <Box
                                    key={chapter.id}
                                    component="section"
                                    id={anchorId}
                                    data-xp-chapter={chapter.id}
                                    aria-labelledby={headingId}
                                    style={{
                                        '--beat-weight': chapter.weight,
                                        '--xp-chapter-index': chapter.index,
                                    } as CSSProperties}
                                    sx={{
                                        scrollMarginTop: DOOR_CLEARANCE,
                                        // Beat rhythm is SPACING, not time: a
                                        // weight-1.6 chapter arrives after 154px
                                        // of silence where a weight-0.7 chapter
                                        // gets 67px, which is how the shape of
                                        // this career survives a still and a
                                        // printer.
                                        mt: 'calc(var(--xp-sp-9) * var(--beat-weight))',
                                        ...(compact
                                            ? { minHeight: '100svh', scrollSnapAlign: 'start' }
                                            : null),
                                    }}
                                >
                                    {compact && station && <Vignette station={station} chapter={chapter} />}

                                    <Box sx={{ mb: 'var(--xp-sp-6)', pb: 'var(--xp-sp-3)', borderBottom: 'var(--xp-hairline) solid var(--xp-border)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 'var(--xp-sp-4)' }}>
                                            <Box
                                                component="span"
                                                aria-hidden
                                                className="xp-tnum ow-ordinal"
                                                sx={{
                                                    fontFamily: 'var(--xp-font-label)',
                                                    fontSize: 'var(--xp-fs-1)',
                                                    letterSpacing: 'var(--xp-track-caps)',
                                                    color: `var(--xp-stage-${Math.min(chapter.index + 1, 7)})`,
                                                }}
                                            >
                                                {String(chapter.index + 1).padStart(2, '0')}
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                {chapterCopy?.chapter && (
                                                    <Box
                                                        component="p"
                                                        className="xp-eyebrow ow-ordinal"
                                                        sx={{
                                                            m: 0,
                                                            mb: 'var(--xp-sp-1)',
                                                            fontFamily: 'var(--xp-font-label)',
                                                            fontSize: 'var(--xp-fs-1)',
                                                            letterSpacing: 'var(--xp-track-caps)',
                                                            textTransform: 'uppercase',
                                                            color: 'var(--xp-text-muted)',
                                                        }}
                                                    >
                                                        {chapterCopy.chapter}
                                                    </Box>
                                                )}
                                                <Box
                                                    component={HeadingTag}
                                                    id={headingId}
                                                    tabIndex={-1}
                                                    ref={(element: HTMLElement | null) => setHeading(chapter.id, element)}
                                                    sx={{
                                                        m: 0,
                                                        fontFamily: 'var(--xp-font-display)',
                                                        fontSize: 'var(--xp-fs-7)',
                                                        lineHeight: 'var(--xp-lh-title)',
                                                        fontWeight: 800,
                                                        letterSpacing: 'var(--xp-track-mid)',
                                                        color: 'var(--xp-text)',
                                                        textWrap: 'balance',
                                                        '&:focus-visible': { outlineOffset: '4px' },
                                                    }}
                                                >
                                                    {heading}
                                                </Box>
                                            </Box>
                                        </Box>

                                        {chapterCopy?.narration && (
                                            <Box
                                                sx={{
                                                    mt: 'var(--xp-sp-3)',
                                                    maxWidth: 'var(--xp-measure)',
                                                    fontSize: 'var(--xp-fs-4)',
                                                    lineHeight: 'var(--xp-lh-caption)',
                                                    color: 'var(--xp-text-muted)',
                                                    textWrap: 'pretty',
                                                }}
                                            >
                                                {chapterCopy.narration}
                                            </Box>
                                        )}
                                    </Box>

                                    {/* The coda's first panel at compact: the
                                        inventory, once, complete — rather than a
                                        HUD following the reader down a 390px
                                        screen it has no room on. */}
                                    {tier !== 'cinema' && chapter.id === 'coda' && (
                                        <Inventory slots={slots} docked={false} />
                                    )}

                                    <Box sx={chapterGridSx(spec)}>
                                        {beatIndices.map((beatIndex, position) => (
                                            <Beat
                                                key={story.beats[beatIndex].id}
                                                beat={story.beats[beatIndex]}
                                                index={position}
                                                spec={spec}
                                                tier={tier}
                                                lead={beatIndex === chapter.leadIndex}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {!compact && spec.chrome === 'rail' && marks.length > 0 && (
                    <RouteRail
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                        compact={false}
                    />
                )}
            </Box>

            {compact && (
                <>
                    <RouteRail
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                        compact
                    />
                    <CompactBand
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                    />
                </>
            )}

            {/* Docked at cinema, where there is a bottom-left corner nobody is
                reading. At medium and compact it appears once, complete, as the
                coda's first panel — a persistent HUD on a screen that narrow is
                a panel standing on the story. */}
            {tier === 'cinema' && <Inventory slots={slots} docked />}
        </Box>
    );
}
