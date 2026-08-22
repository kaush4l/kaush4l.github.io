'use client';

/**
 * The shared default Stage — the engine's acceptance test, stated as one
 * component.
 *
 * `Skin.SectionRenderer` is declared in `src/skins/types.ts` and consumed
 * nowhere. That is the warning this file is written against: an optional
 * component slot with no shipped default behind it is a slot nobody can use,
 * because the first author to reach for it has to invent the whole surface
 * before they can express one idea. So the default here is real, it ships
 * first, and it is what `Experience.Stage` is measured against rather than a
 * placeholder it replaces.
 *
 * The bar it has to clear is exact: **a complete, readable, correctly-graded
 * telling of the résumé from nothing but `Story` + `TellingSpec` + the `--xp-*`
 * tokens.** If `plain` — no ground, no faces, an empty token map, no Stage —
 * renders a dignified reading of this career through this file alone, then the
 * engine is done and the five worlds are content rather than infrastructure.
 *
 * ── WHAT CHANGED WHEN THE CREATIVE SPEC LANDED ──────────────────────────────
 * This file used to render `story.chapters` — one act per content SECTION
 * (about, experience, projects, education, skills, contact). That is the
 * résumé's own filing order, and it is the right structure for a document and
 * the wrong one for a story: it puts every project in one bucket at the end
 * rather than beside the engagement that earned it, and it has no place to hang
 * the one fact this whole feature exists to make legible — that the 2017
 * engineer and the 2025 one were solving the same problem.
 *
 * It now renders `story.spine` — the nine ordered chapters shared by all five
 * worlds (CREATIVE-SPEC §4.0). `story.chapters` is untouched and still exported;
 * the two answer different questions and both remain answered.
 *
 * The retelling rule is unchanged and is now provably total: the spine claims
 * every beat, `Story.spine.unplaced` reports any it did not, and unclaimed beats
 * are appended to the coda rather than dropped. The beat count is
 * `story.beats.length` at every tier, and QA asserts exactly that.
 *
 * ── What this component is allowed to know ──────────────────────────────────
 * Facts and derived signals, never presentation. Every colour, measure, face,
 * duration, curve and spacing step is a `--xp-*` custom property with a default
 * in `experiences.css`; there is not one hex literal, one px font size, one
 * hand-typed duration, or one media query below. Radii come from the shipped
 * `RADIUS` const — imported, never redeclared as a px literal (SKIN-CONTRACT).
 * A world retunes this stage by writing `tokens()` — which receives `tier`, so
 * per-viewport geometry stays DATA — and by writing `telling`, which is the only
 * thing that changes the SHAPE.
 *
 * ── The retelling rule (charter non-negotiable 4) ────────────────────────────
 * Every beat in the story is rendered at every tier. `TellingSpec.show` filters
 * PARTS of a beat, never beats, and there is deliberately no code path in this
 * file that can skip one: the beat loop is over `chapter.beats` unconditionally,
 * and `show` is only ever consulted inside a beat, below its title and its
 * dates. `compact` is a shorter telling of the same story, never the same
 * telling with things removed. QA asserts the `[data-beat-id]` count is
 * identical at 390, 820 and 1440.
 *
 * ── Motion budget: zero rAF loops ───────────────────────────────────────────
 * The entrance is CSS (`.xp-beat` + `--xp-beat-index`, authored resting-frame-
 * first in `experiences.css` §3, so a beat is visible if the animation never
 * runs at all). The reading position is an `IntersectionObserver`, not a scroll
 * handler, so there is no frame loop to throttle and nothing to pause on
 * tab-hide. The only thing this file animates is a `transform` on the chapter
 * rail's progress spine and on the active dot — composited, non-layout-
 * affecting, and stilled outright under reduced motion. The budget an
 * experience declares (`motion.rafLoops`) is therefore entirely available to a
 * world's own Stage; the default spends none of it.
 *
 * ── Reduced motion stills; it never hides ───────────────────────────────────
 * Nothing below is conditional on `reduceMotion` except a `transition` and
 * `scroll-behavior`. There is no branch that renders less content, no branch
 * that unmounts a marker, and no branch that collapses a chapter. A visitor who
 * asks for stillness reads exactly the same words in exactly the same order.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type RefObject,
} from 'react';
import { Box } from '@mui/material';
import { RADIUS } from '@/theme/ThemeProvider';
import { useExperience } from './ExperienceProvider';
import type { ChapterCopy, StageProps, TellingSpec } from './types';
import type { ChapterId, Story, StoryBeat, StorySpineChapter } from '@/lib/story';

/**
 * A navigable landmark in the telling: the overture, then one per spine chapter.
 *
 * Kept as a flat list rather than as two special cases so the observer, the
 * chrome and the progress spine all read one array. The overture is a mark like
 * any other precisely so that a reader at the top of the story is *somewhere*
 * on the rail rather than nowhere — an indicator that is blank for the first
 * screenful reads as broken rather than as honest.
 *
 * ── `label` is a COMPANY NAME, and that is the single highest-stakes line ────
 * CREATIVE-SPEC §2.6 names this the most common fatal error of narrative
 * portfolios: a skimmer scanning for "did he do Kafka at scale" will not click
 * "IV — The Widening". So the rail label is the employer, always, in every
 * world, and the poetic chapter name is `subtitle` — a small, low-alpha second
 * line revealed on hover and focus. Never the other way round, and never the
 * heading.
 */
interface Mark {
    /** The DOM id of the element this mark scrolls to and observes. */
    id: string;
    /** The employer, school or client. What a skimmer is actually looking for. */
    label: string;
    /** The poetic chapter name, if this world declared one. A subtitle only. */
    subtitle?: string;
    /** How many beats this mark accounts for, for the honest progress fill. */
    beatCount: number;
}

/**
 * Visually hidden but present for assistive tech — never `display: none`.
 *
 * `'1px'` as a STRING, never the bare number `1`. QA-2026-08-22/S1: MUI's `sx`
 * treats a unitless number in `width`/`height` between 0 and 1 as a FRACTION,
 * so `width: 1` compiles to `width: 100%` — and because this box is
 * `position: absolute` inside a `static` ancestor, that 100% resolves against
 * the initial containing block, i.e. the viewport. The live region then sat a
 * full viewport wide starting at the content inset and pushed the document
 * sideways: 48px at 390 and 464px at 1440 in `trunk`, on `documentElement` only
 * (`body` never sees it, because the ICB is the containing block) — which is
 * exactly why it read as a mysterious phantom rather than as an element anyone
 * could see. A unit makes the value mean what every other sr-only recipe on the
 * page means.
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

/**
 * Clearance for the frame's fixed door, which sits at the top of the viewport
 * and would otherwise cover whatever a hash link just scrolled to.
 *
 * Stated once, used by the page padding and by every scroll target, because the
 * failure mode when the two disagree is silent: the link works, the reader
 * arrives, and the heading they came for is behind a button.
 */
const DOOR_CLEARANCE = 'calc(var(--xp-sp-9) + var(--xp-sp-4))';

/**
 * A beat's DOM id, PREFIXED.
 *
 * `beat-` is not decoration. A deep link carries `#beat-experience-04-oracle`,
 * and the browser's native fragment scroll fires as soon as an element with that
 * id parses. Without the prefix a world's own markup could plausibly own the
 * bare id, the browser would jump to an unstyled position mid-hydration, and the
 * reader would watch the page yank itself somewhere and then yank back. The
 * prefix guarantees the id belongs to this component and to nothing else.
 *
 * The colon in `${sectionId}:${slug}` is replaced rather than escaped: a colon is
 * legal in an id attribute but is a CSS combinator in a selector, so
 * `document.querySelector('#beat-experience:04-oracle')` throws. One substitution
 * here is cheaper than a `CSS.escape` at every call site that ever grows.
 */
function beatAnchor(beatId: string): string {
    return `beat-${beatId.replace(/:/g, '-')}`;
}

/** A chapter's anchor: its lead beat's, so a chapter link IS a beat link. */
function chapterAnchor(chapter: StorySpineChapter, beats: readonly StoryBeat[]): string {
    const lead = chapter.leadIndex >= 0 ? beats[chapter.leadIndex] : undefined;
    return lead ? beatAnchor(lead.id) : `xp-chapter-${chapter.id}`;
}

const OVERTURE_ID = 'xp-overture';

/**
 * The chapter's rail label, and the text of its `<h2>`.
 *
 * The heading reads `Oracle Corporation — Software Engineer, March 2020 - May
 * 2022`: employer, role, dates, in that order, because that is the order a
 * reader of a career scans them in. `periodLabel` is the string the AUTHOR
 * wrote — `story.ts` is explicit that a reconstruction from the parsed fields
 * must never render — so the separator inside it is whatever `content/` says and
 * is deliberately not normalised here.
 */
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

// ─── Reading position ───────────────────────────────────────────────────────

/**
 * Which mark the reader is currently inside.
 *
 * An `IntersectionObserver` with a middle-band root margin, which is the same
 * mechanism `Sidebar.tsx`'s scroll-spy uses and for the same reason: "active"
 * should mean "occupying the middle of the viewport", not "topmost", or the
 * indicator flickers backwards every time two sections straddle the fold.
 *
 * Two things make it different from the sidebar's:
 *
 *   • It observes by id from a list this component owns, rather than by
 *     `document.querySelectorAll('section[id]')`. A world's Stage may render
 *     sections of its own, and a spy that scooped up every `section[id]` on the
 *     page would light up the wrong mark in exactly the worlds that are hardest
 *     to debug.
 *   • It takes a scroll root. Under `flow: 'paged'` the scroller is the stage's
 *     own element, not the viewport, and an observer left on the default root
 *     would report every page as permanently visible — the indicator would
 *     freeze on the first chapter and never move again.
 *
 * M41: no `document` read in an initializer. `null` is the server's answer and
 * the first client frame's answer, and the real one lands on the commit after
 * the observer fires.
 */
function useActiveMark(
    marks: readonly Mark[],
    rootRef: RefObject<HTMLElement | null>,
    rooted: boolean,
): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);
    // The ids alone, so a re-render that rebuilds the array with identical
    // contents does not tear down and re-create the observer on every commit.
    const key = marks.map((mark) => mark.id).join('|');

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;

        const ids = key ? key.split('|') : [];
        const elements = ids
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
                // Document order wins among everything currently in the band, so
                // the mark never jumps forward past a section the reader can
                // still see.
                setActiveId(elements.find((element) => visible.has(element.id))?.id ?? null);
            },
            {
                root: rooted ? rootRef.current : null,
                rootMargin: '-35% 0px -55% 0px',
                threshold: 0,
            },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [key, rooted, rootRef]);

    return activeId;
}

/**
 * Announce the chapter change, and move focus only on a DELIBERATE jump.
 *
 * The spec asks for both on every chapter change. The announcement is
 * unconditional here and the focus move is not, and the split is deliberate:
 * moving focus as a side effect of SCROLLING takes the caret away from a reader
 * who is tabbing through links or typing in the chat widget, which is a worse
 * accessibility outcome than the one it is trying to buy. A jump the reader
 * asked for — a rail click, a number key — is the moment focus should follow,
 * and it is the moment `preventScroll` exists for.
 *
 * The live region is rendered once and mutated by state rather than being
 * mounted per announcement: a region added to the DOM at the same moment its
 * text appears is frequently not announced at all, because the assistive tech
 * has nothing to diff against.
 */
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

/**
 * Keyboard navigation over the marks.
 *
 * A restrained subset of CREATIVE-SPEC §2.6, and the restraint is the point:
 * **`Space`, `PageDown` and native arrow-scroll are never bound.** This augments
 * scrolling; it never replaces it. Every binding below no-ops inside
 * `input, textarea, select, [contenteditable]` and inside the chat widget, and
 * when any modifier other than the documented `Shift+G` is held — so a reader
 * using `Cmd+←` to go back in history is never intercepted.
 *
 * A jump is a CUT, not an auto-scroll through four chapters: input is locked for
 * the cut's duration, and the last input during the lock is QUEUED rather than
 * dropped, so `4 4 4` lands on chapter 4 instead of stuttering.
 */
const CUT_MS = 560;

function useChapterKeys(
    marks: readonly Mark[],
    activeId: string | null,
    jump: (id: string) => void,
    enabled: boolean,
) {
    // Refs, not state: the handler must see the latest values without the
    // listener being torn down and re-attached on every scroll tick.
    const marksRef = useRef(marks);
    const activeRef = useRef(activeId);
    const jumpRef = useRef(jump);
    // Adopted in an effect, never in the render body. A ref written during
    // render is a render side effect: under StrictMode's double invoke, and
    // under any render React discards before committing, the ref would hold a
    // value that never reached the DOM — and `react-hooks/refs` fails the lint
    // gate on exactly that. The listener below reads these only from an async
    // keyboard event, which cannot land before this effect has run, so the
    // "one render behind" window this trades for is not observable here.
    useEffect(() => {
        marksRef.current = marks;
        activeRef.current = activeId;
        jumpRef.current = jump;
    });

    useEffect(() => {
        if (!enabled) return;

        let lockedUntil = 0;
        let queued: string | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const commit = (id: string) => {
            const now = Date.now();
            if (now < lockedUntil) {
                // Queued, never dropped. The LAST input during the lock wins,
                // which is what makes a repeated key land on its target rather
                // than replaying every intermediate stop.
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
            ) {
                return;
            }

            const list = marksRef.current;
            if (list.length === 0) return;
            const current = Math.max(
                0,
                list.findIndex((mark) => mark.id === activeRef.current),
            );

            const go = (index: number) => {
                event.preventDefault();
                commit(list[Math.min(Math.max(index, 0), list.length - 1)].id);
            };

            // `G G` then `Shift+G`, in that order, so the pending-G state is
            // cleared by anything that is not the second G.
            if (event.key === 'G') {
                pendingG = false;
                go(list.length - 1);
                return;
            }
            if (event.key === 'g') {
                if (pendingG) {
                    pendingG = false;
                    go(0);
                } else {
                    pendingG = true;
                }
                return;
            }
            pendingG = false;

            if (event.shiftKey) return;

            switch (event.key) {
                case 'j':
                case 'ArrowDown':
                    // `ArrowDown` is only claimed when the reader is not in a
                    // scrollable control; native arrow-scroll of the DOCUMENT is
                    // what this replaces, and only by one chapter at a time.
                    if (event.key === 'ArrowDown') return;
                    go(current + 1);
                    return;
                case 'k':
                    go(current - 1);
                    return;
                case 'ArrowRight':
                    go(current + 1);
                    return;
                case 'ArrowLeft':
                    go(current - 1);
                    return;
                default:
                    break;
            }

            if (/^[1-9]$/.test(event.key)) go(Number(event.key) - 1);
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (timer) clearTimeout(timer);
        };
    }, [enabled]);
}

// ─── Chapter chrome ─────────────────────────────────────────────────────────

/**
 * The progress fill: the TRUE fraction of beats completed.
 *
 * Derived from the same array the content comes from, which is the property
 * CREATIVE-SPEC §2.6 insists on — *a progress affordance that lies once makes
 * everything else on the page suspect*. It is beats and not chapters because a
 * nine-beat coda and a one-beat return are not the same amount of reading, and a
 * bar that treated them as equal would be visibly wrong to anyone who scrolled.
 */
function progressFraction(marks: readonly Mark[], activeId: string | null): number {
    const index = marks.findIndex((mark) => mark.id === activeId);
    if (index < 0) return 0;
    const total = marks.reduce((sum, mark) => sum + mark.beatCount, 0);
    if (total === 0) return 0;
    const done = marks.slice(0, index + 1).reduce((sum, mark) => sum + mark.beatCount, 0);
    return done / total;
}

/**
 * The full rail: company names, a poetic subtitle on hover/focus, and a spine
 * that fills as the reader descends.
 *
 * Real `<a href>` links inside a `<nav aria-label><ol>`, with
 * `aria-current="step"` on the active one — so middle-click, copy-link-address
 * and open-in-new-tab all work. A rail built from `<button onClick>` looks
 * identical and silently breaks all three, which is exactly the kind of defect
 * that survives review.
 *
 * The spine is one `scaleY` on a single absolutely-positioned element: one
 * composited property, no layout, and stilled outright under reduced motion.
 */
function ChapterRail({
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
    const progress = progressFraction(marks, activeId);

    return (
        <Box
            component="nav"
            className="no-print"
            aria-label="Career progress"
            sx={{
                flex: '0 0 auto',
                width: 'var(--xp-rail-width)',
                position: 'sticky',
                top: DOOR_CLEARANCE,
                alignSelf: 'flex-start',
                pl: 'var(--xp-sp-5)',
                // The rail is the one place this stage draws a line, and it
                // draws it in the border token rather than the accent so the
                // accent stays reserved for the one thing that is *lit*.
                borderLeft: 'var(--xp-hairline) solid var(--xp-border)',
            }}
        >
            {/* The spine. `scaleY` from the top, so its resting frame at
                progress 0 is a zero-height line rather than a hidden one —
                nothing here can withhold a mark's label. */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    left: 'calc(var(--xp-hairline) * -1)',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: 'var(--xp-accent)',
                    transformOrigin: 'top',
                    transform: `scaleY(${progress})`,
                    transition: reduceMotion
                        ? 'none'
                        : 'transform var(--xp-dur-element) var(--xp-ease-ui)',
                }}
            />

            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {marks.map((mark, index) => {
                    const active = mark.id === activeId;
                    return (
                        <Box component="li" key={mark.id} sx={{ m: 0 }}>
                            <Box
                                component="a"
                                href={`#${mark.id}`}
                                onClick={() => onJump(mark.id)}
                                aria-current={active ? 'step' : undefined}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 'var(--xp-sp-3)',
                                    // 44px minimum target, the house rule for
                                    // every pointer control on this site.
                                    minHeight: 44,
                                    py: 'var(--xp-sp-2)',
                                    borderRadius: RADIUS.chip,
                                    textDecoration: 'none',
                                    fontFamily: 'var(--xp-font-label)',
                                    fontSize: 'var(--xp-fs-2)',
                                    letterSpacing: '0.04em',
                                    // Full-strength text for the mark the reader
                                    // is in, muted for the rest. Both are text
                                    // tokens, so both clear 4.5:1 by
                                    // construction — the distinction is weight
                                    // and colour, never legibility.
                                    color: active ? 'var(--xp-text)' : 'var(--xp-text-muted)',
                                    fontWeight: active ? 600 : 400,
                                    '&:hover, &:focus-visible': {
                                        color: 'var(--xp-text)',
                                        '& .xp-rail-subtitle': { opacity: 0.55 },
                                    },
                                }}
                            >
                                <Box
                                    component="span"
                                    aria-hidden
                                    className="xp-tnum"
                                    sx={{ opacity: 0.7 }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </Box>
                                <Box component="span" sx={{ minWidth: 0 }}>
                                    {mark.label}
                                    {/* The poetic name. A SUBTITLE — 11px, 0.55
                                        alpha, revealed on hover and focus only,
                                        and never the thing a skimmer has to read
                                        to find an employer. It is in the DOM at
                                        all times, so a screen reader gets it
                                        without any hover ever happening. */}
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
                                                transition: reduceMotion
                                                    ? 'none'
                                                    : 'opacity var(--xp-dur-micro) var(--xp-ease-ui)',
                                            }}
                                        >
                                            {mark.subtitle}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

/**
 * The dot strip: the same information at a width that cannot spare a rail.
 *
 * This is the compact TELLING of the chrome, not the chrome with its labels
 * hidden — every dot keeps its company name as an accessible name and as a
 * native `title`, so the information is present for a screen reader and one
 * hover away for everyone else. A strip that dropped the names would be exactly
 * the `display: none` the charter forbids, one layer up.
 *
 * The dot is 8px inside a 44px target. Shrinking the target with the dot is the
 * most common form of this control and it is unusable with a thumb.
 */
function ChapterDots({
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
    return (
        <Box
            component="nav"
            className="no-print"
            aria-label="Career progress"
            sx={{
                position: 'fixed',
                right: 'max(4px, env(safe-area-inset-right))',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: (theme) => theme.zIndex.appBar,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {marks.map((mark) => {
                const active = mark.id === activeId;
                return (
                    <Box
                        component="a"
                        key={mark.id}
                        href={`#${mark.id}`}
                        onClick={() => onJump(mark.id)}
                        title={mark.label}
                        aria-current={active ? 'step' : undefined}
                        sx={{
                            width: 44,
                            height: 44,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: RADIUS.pill,
                            textDecoration: 'none',
                        }}
                    >
                        <Box
                            aria-hidden
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: RADIUS.pill,
                                border: 'var(--xp-hairline) solid var(--xp-border)',
                                backgroundColor: active ? 'var(--xp-accent)' : 'var(--xp-text-muted)',
                                opacity: active ? 1 : 0.45,
                                transform: active ? 'scale(1.5)' : 'scale(1)',
                                transition: reduceMotion
                                    ? 'none'
                                    : 'transform var(--xp-dur-ui) var(--xp-ease-ui), opacity var(--xp-dur-ui) var(--xp-ease-ui)',
                            }}
                        />
                        <Box component="span" sx={srOnly}>{mark.label}</Box>
                    </Box>
                );
            })}
        </Box>
    );
}

/**
 * The compact position readout: a 3px top progress bar plus a `03 / 09 · Oracle`
 * pill in the thumb arc.
 *
 * Both are rendered at every tier that chose `dots`, because a dot strip alone
 * answers "how many" and never "where am I, in words". The pill is a real link
 * to the current chapter, so tapping it re-centres rather than doing nothing —
 * a control that looks tappable and is not is worse than no control.
 *
 * It sits inside the reserved bottom band (`--xp-nav-h`), which is the same band
 * the chat FAB offsets from, so the two can never stack on the home indicator.
 */
function ChapterPill({
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
    const progress = progressFraction(marks, activeId);
    const mark = index >= 0 ? marks[index] : marks[0];
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
                    transition: reduceMotion
                        ? 'none'
                        : 'transform var(--xp-dur-element) var(--xp-ease-ui)',
                }}
            />
            <Box
                component="a"
                className="no-print"
                href={`#${mark.id}`}
                onClick={() => onJump(mark.id)}
                sx={{
                    position: 'fixed',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: 'calc(var(--xp-sp-4) + env(safe-area-inset-bottom))',
                    zIndex: (theme) => theme.zIndex.appBar,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--xp-sp-2)',
                    px: 'var(--xp-sp-4)',
                    borderRadius: RADIUS.pill,
                    textDecoration: 'none',
                    fontFamily: 'var(--xp-font-label)',
                    fontSize: 'var(--xp-fs-2)',
                    color: 'var(--xp-text)',
                    // Blur is not a contrast strategy: the ground behind it is
                    // mixed at 72% so the composited result is measured, and the
                    // border keeps the edge readable where `backdrop-filter` is
                    // unsupported and the mix falls back to the flat ground.
                    backgroundColor: 'color-mix(in oklab, var(--xp-bg) 88%, transparent)',
                    backdropFilter: 'blur(10px)',
                    border: 'var(--xp-hairline) solid var(--xp-border)',
                }}
            >
                <Box component="span" className="xp-tnum" aria-hidden>
                    {String(index < 0 ? 1 : index + 1).padStart(2, '0')} / {String(marks.length).padStart(2, '0')}
                </Box>
                <Box component="span" aria-hidden sx={{ opacity: 0.5 }}>·</Box>
                <Box component="span">{mark.label}</Box>
                <Box component="span" sx={srOnly}>
                    {`Chapter ${index < 0 ? 1 : index + 1} of ${marks.length}`}
                </Box>
            </Box>
        </>
    );
}

// ─── The beat ───────────────────────────────────────────────────────────────

/**
 * The one-line meta strip under a beat's title.
 *
 * Pulled out because the order of these facts is a typographic decision and it
 * should be made once: authored dates first (they are what a reader scanning a
 * career looks for), then duration, then the era, then place. `periodLabel` is
 * the string the author wrote — `story.ts` is explicit that a reconstruction
 * from the parsed fields must never render — and the parsed `Period` is used
 * only for the things prose cannot state, which is `years` and `isPresent`.
 */
function beatMeta(beat: StoryBeat, shows: (part: TellingSpec['show'][number]) => boolean): string[] {
    const parts: string[] = [];
    if (beat.periodLabel) parts.push(beat.periodLabel);
    // A single-point beat reports 0 years and should say nothing rather than
    // "0 yrs"; a present engagement is already announced by its own marker.
    if (beat.years >= 1) parts.push(beat.years === 1 ? '1 yr' : `${beat.years} yrs`);
    if (beat.era) parts.push(beat.era);
    if (shows('location') && beat.location) parts.push(beat.location);
    return parts;
}

/**
 * One beat, told at the current tier.
 *
 * `index` is the beat's position WITHIN ITS VIEW, not within the story, and
 * that is what `--xp-beat-index` multiplies. A stagger keyed to the story-wide
 * position would make beat forty wait through thirty-nine delays before it
 * appeared — an entrance that is charming for the first screen and a bug for
 * every one after it.
 *
 * The heading is an `h3` because the chapter above it owns the `h2` and the
 * overture owns the page's one `h1`. That tree is not decoration: it is the
 * table of contents a screen-reader user navigates this story by, and it is the
 * only structural thing on the route, since a stage renders no `<Layout>` and
 * therefore no header, no sidebar and no landmark but this one.
 */
function Beat({
    beat,
    index,
    spec,
    lead,
}: {
    beat: StoryBeat;
    index: number;
    spec: TellingSpec;
    /** True for the beat whose heading the chapter's `<h2>` already carried. */
    lead: boolean;
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
                // A featured beat is marked with a rule, not with a colour on
                // its text: `--xp-accent` is a FILL channel (M36's lesson one
                // axis over) and small text set in it is the reliable way to
                // fail 4.5:1 in a world nobody re-measured.
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
                {/* The beat's absolute position in the whole telling. It is the
                    one number that tells a reader mid-story where they are
                    without a rail, and it costs nothing at any width. */}
                <Box component="span" className="xp-tnum">
                    {String(beat.chapter).padStart(2, '0')}
                </Box>
                {beat.isPresent && (
                    <Box component="span" sx={{ color: 'var(--xp-text)', fontWeight: 600 }}>
                        Present
                    </Box>
                )}
            </Box>

            {/* The lead beat's name is already the chapter's `<h2>`. Repeating it
                here as an `<h3>` would put the same string twice in the heading
                outline a screen-reader user navigates by, so the lead beat opens
                straight into its evidence. Nothing is lost: the `<h2>` above
                carries employer, role AND dates. */}
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
                        fontWeight: 600,
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
                    ) : (
                        beat.title
                    )}
                </Box>
            )}

            {!lead && shows('org') && beat.org && (
                <Box
                    sx={{
                        mt: 'var(--xp-sp-1)',
                        fontSize: 'var(--xp-fs-3)',
                        fontWeight: 500,
                        color: 'var(--xp-text)',
                    }}
                >
                    {beat.org}
                    {/* The agency is a fact about the engagement, not about the
                        employer, so it is set apart rather than concatenated
                        into the org's own name. */}
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
                    {beat.summary}
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
                                // A drawn marker rather than a list-style glyph,
                                // because the glyph inherits the font and every
                                // world would get a different one.
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
                            {/* `label` + `text`, never `label` + `html` — the
                                html already contains the label, and rendering
                                both prints it twice. */}
                            {bullet.label && (
                                <Box component="strong" sx={{ fontWeight: 600 }}>{`${bullet.label}: `}</Box>
                            )}
                            {bullet.text}
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

// ─── The overture ───────────────────────────────────────────────────────────

/**
 * The title card: the story's first `about` beat, told once, at display size.
 *
 * It is not an extra element bolted on top of the story — it IS that beat, and
 * it carries the same `data-beat-id` and the same `.xp-beat` class as any
 * other, which is what keeps the beat count exactly `story.beats.length` at
 * every tier. The chapter loop skips this one index rather than re-rendering
 * it; nothing is duplicated and nothing is dropped.
 *
 * Promoting it is what gives the route its one `h1`. A stage renders no
 * `<Layout>`, so if this component does not supply a top-level heading the page
 * has none — a document whose outline begins at `h2` is a real defect for
 * anyone navigating by headings, and it is invisible to everyone else, which is
 * why it survives so long when it happens.
 *
 * If the résumé has no `about` section, there is no overture and the first
 * chapter's title takes the `h1` instead (see `Stage`). Neither path invents a
 * heading out of nothing.
 */
function Overture({
    beat,
    spec,
    id,
}: {
    beat: StoryBeat;
    spec: TellingSpec;
    id: string;
}) {
    const shows = (part: TellingSpec['show'][number]) => spec.show.includes(part);

    return (
        <Box
            component="header"
            id={id}
            className="xp-beat"
            data-beat-id={beat.id}
            style={{ '--xp-beat-index': 0 } as CSSProperties}
            sx={{
                scrollMarginTop: DOOR_CLEARANCE,
                mb: 'var(--xp-sp-9)',
                maxWidth: 'var(--xp-measure)',
            }}
        >
            <Box
                component="h1"
                sx={{
                    m: 0,
                    fontFamily: 'var(--xp-font-display)',
                    // The one place this stage speaks loudly, and it speaks from
                    // the DISPLAY ladder — 44 → 145px, with the deliberate void
                    // between 28 and 44 kept intact. A heading at 34px is what a
                    // blog `h1` looks like; the gap is the whole effect.
                    fontSize: 'var(--xp-fs-display-2)',
                    lineHeight: 'var(--xp-lh-display)',
                    letterSpacing: 'var(--xp-track-large)',
                    fontWeight: 600,
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
                    {/* The role, and the place, on the line under the name. The
                        overture states them at every tier — `show` gates the
                        BEATS' optional parts, and the one thing a title card
                        cannot be is anonymous. */}
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
                    {beat.summary}
                </Box>
            )}
        </Box>
    );
}

// ─── The stage ──────────────────────────────────────────────────────────────

/**
 * How the beats of one chapter are arranged, as a function of the telling spec.
 *
 * Three flows, three grids, and every one of them holds `beatsInView` beats in
 * view without a single beat being unrenderable:
 *
 *   scroll  N columns down the page. `minmax(0, 1fr)` rather than a min track
 *           sized in `ch`, because an intrinsic minimum is exactly how a grid
 *           overflows its container — and horizontal overflow on `body` is a QA
 *           failure, not a cosmetic one.
 *   rail    N across an inner horizontal scroller with snap points. The
 *           scroller is INNER, so it contributes nothing to the document's own
 *           scroll width. `clamp` on the track keeps a beat readable when the
 *           chapter is narrower than `N × measure` instead of crushing it.
 *   paged   N across, one chapter per snap page in the stage's own vertical
 *           scroller. `min-height`, never `height`: a chapter with more beats
 *           than one screen grows past the page rather than clipping them,
 *           which is the difference between a paged telling and a lost one.
 */
function chapterGridSx(spec: TellingSpec) {
    const n = Math.max(spec.beatsInView, 1);
    const gap = 'var(--xp-gutter)';

    if (spec.flow === 'rail') {
        return {
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns:
                n === 1
                    ? 'min(100%, var(--xp-measure))'
                    : `clamp(260px, calc((100% - ${gap} * ${n - 1}) / ${n}), var(--xp-measure))`,
            gap,
            overflowX: 'auto',
            overscrollBehaviorX: 'contain',
            scrollSnapType: 'x proximity',
            // Room for the beats' negative inset (the featured rule) and for the
            // focus ring's halo, which is otherwise clipped by the scroller.
            px: 'var(--xp-sp-4)',
            mx: 'calc(var(--xp-sp-4) * -1)',
            py: 'var(--xp-sp-2)',
            '& > *': { scrollSnapAlign: 'start' },
        } as const;
    }

    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        gap,
        alignItems: 'start',
    } as const;
}

/**
 * One chapter of the spine.
 *
 * ── Semantics, which are the whole accessibility argument ───────────────────
 * `<section aria-labelledby>` with a real `<h2 tabindex="-1">` reading
 * `Oracle Corporation — Software Engineer, March 2020 - May 2022`. The poetic
 * chapter name is a `<p class="xp-eyebrow">` ABOVE it and is never the heading:
 * a heading outline made of "The Widening" and "Ignition" is unnavigable for
 * exactly the reader who most needs the outline.
 *
 * `tabindex="-1"` makes the heading a programmatic focus target for a deliberate
 * jump without putting it in the tab order — a heading a sighted keyboard user
 * has to tab THROUGH is nine extra stops between the door and the story.
 *
 * ── Beat rhythm is spacing, not time ────────────────────────────────────────
 * `margin-block-start: calc(var(--xp-sp-9) * var(--beat-weight))`. A weight-1.6
 * chapter arrives after 154px of silence where a weight-0.7 chapter gets 67px.
 * That is how the peak survives `prefers-reduced-motion` and print, where time
 * does not exist.
 */
function Chapter({
    chapter,
    story,
    spec,
    skipBeatIndex,
    headingLevel,
    copy,
    anchorId,
    headingRef,
}: {
    chapter: StorySpineChapter;
    story: Story;
    spec: TellingSpec;
    skipBeatIndex: number | null;
    headingLevel: 'h1' | 'h2';
    copy?: ChapterCopy;
    anchorId: string;
    headingRef: (id: ChapterId, element: HTMLElement | null) => void;
}) {
    const beatIndices = chapter.beats.filter((beatIndex) => beatIndex !== skipBeatIndex);
    const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
    const headingId = `${anchorId}-heading`;
    const heading = chapterHeading(lead) || chapter.id;

    return (
        <Box
            component="section"
            id={anchorId}
            data-xp-chapter={chapter.id}
            aria-labelledby={headingId}
            style={
                {
                    '--beat-weight': chapter.weight,
                    '--xp-chapter-index': chapter.index,
                } as CSSProperties
            }
            sx={{
                scrollMarginTop: DOOR_CLEARANCE,
                // The rhythm. Weight-driven silence before a chapter is the one
                // pacing device that is not motion, so it is the one that
                // survives every still.
                mt: 'calc(var(--xp-sp-9) * var(--beat-weight))',
                ...(spec.flow === 'paged'
                    ? {
                        minHeight: '100svh',
                        scrollSnapAlign: 'start',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }
                    : null),
            }}
        >
            <Box sx={{ mb: 'var(--xp-sp-6)', pb: 'var(--xp-sp-3)', borderBottom: 'var(--xp-hairline) solid var(--xp-border)' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 'var(--xp-sp-4)' }}>
                    <Box
                        component="span"
                        aria-hidden
                        className="xp-tnum"
                        sx={{
                            fontFamily: 'var(--xp-font-label)',
                            fontSize: 'var(--xp-fs-1)',
                            letterSpacing: 'var(--xp-track-caps)',
                            // The ordinal is drawn from the ramp so a reader can
                            // see where in the arc they are without reading a
                            // number — and it is ALSO a number, because colour
                            // is never the sole carrier of anything here.
                            color: `var(--xp-stage-${Math.min(chapter.index + 1, 7)})`,
                        }}
                    >
                        {String(chapter.index + 1).padStart(2, '0')}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        {/* The poetic name, as an eyebrow. Never the heading. */}
                        {copy?.chapter && (
                            <Box
                                component="p"
                                className="xp-eyebrow"
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
                                {copy.chapter}
                            </Box>
                        )}

                        <Box
                            component={headingLevel}
                            id={headingId}
                            tabIndex={-1}
                            ref={(element: HTMLElement | null) => headingRef(chapter.id, element)}
                            sx={{
                                m: 0,
                                fontFamily: 'var(--xp-font-display)',
                                fontSize: 'var(--xp-fs-7)',
                                lineHeight: 'var(--xp-lh-title)',
                                fontWeight: 600,
                                letterSpacing: 'var(--xp-track-mid)',
                                color: 'var(--xp-text)',
                                textWrap: 'balance',
                                // A programmatic focus target must still SHOW
                                // focus when it receives it, or a keyboard reader
                                // is moved somewhere with no indication.
                                '&:focus-visible': { outlineOffset: '4px' },
                            }}
                        >
                            {heading}
                        </Box>
                    </Box>
                </Box>

                {/* The narration. Additive only — it never restates a bullet,
                    and it is capped at 180 characters by the copy contract, so
                    it is one line of orientation rather than a second summary. */}
                {copy?.narration && (
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
                        {copy.narration}
                    </Box>
                )}
            </Box>

            <Box
                // A horizontal scroller is a keyboard-operable region, so it has
                // to be focusable and it has to say what it is; otherwise the
                // beats past the first are reachable with a pointer and with
                // nothing else.
                {...(spec.flow === 'rail'
                    ? { role: 'region', tabIndex: 0, 'aria-label': `${heading} — scrollable` }
                    : null)}
                sx={chapterGridSx(spec)}
            >
                {beatIndices.map((beatIndex, position) => (
                    <Beat
                        key={story.beats[beatIndex].id}
                        beat={story.beats[beatIndex]}
                        index={position}
                        spec={spec}
                        lead={beatIndex === chapter.leadIndex}
                    />
                ))}
            </Box>
        </Box>
    );
}

export default function Stage({ story, tier, reduceMotion }: StageProps) {
    /**
     * The telling spec and this world's chapter copy are the two things a Stage
     * needs that `StageProps` does not carry, so they are read from the provider.
     *
     * That is a deliberate asymmetry with a world's own Stage, which is handed
     * three plain props and can be rendered in isolation with no context. This
     * one cannot, and should not: it is the SHARED stage, it only ever runs
     * inside `ExperienceFrame`, and the alternative — widening `StageProps` with
     * a `spec` field — would put a field on every world's interface that only
     * this file reads.
     */
    const { experience } = useExperience();
    const spec = experience.telling[tier];
    const copy = experience.copy;

    const scrollerRef = useRef<HTMLElement | null>(null);
    const paged = spec.flow === 'paged';

    /**
     * The overture beat, and its index.
     *
     * `byKind.about` is the derived bucket rather than a hardcoded section name,
     * for the reason `buildPersonJsonLd` gives on the default route: renaming or
     * reordering a section must not break this. A résumé with no about section
     * simply has no overture, and every branch below reads `overtureIndex`
     * rather than assuming one exists.
     *
     * The overture beat is one of `origin`'s `also` beats in the spine, so
     * promoting it here and skipping that index in the chapter loop keeps the
     * rendered beat count at exactly `story.beats.length`.
     */
    const overtureBeat = story.byKind.about[0];
    const overtureIndex = overtureBeat
        ? story.beats.findIndex((beat) => beat.id === overtureBeat.id)
        : -1;

    /**
     * The chapters that still have a beat left after the overture is lifted
     * out. A chapter consisting of nothing but the title card is not a chapter,
     * and a rail entry pointing at an empty section is a link to nowhere.
     */
    const chapters = useMemo(
        () =>
            story.spine.chapters.filter((chapter) =>
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
        }));
        return overtureBeat
            ? [{ id: OVERTURE_ID, label: overtureBeat.title, beatCount: 1 }, ...chapterMarks]
            : chapterMarks;
    }, [chapters, anchors, story.beats, copy, overtureBeat, overtureIndex]);

    const activeId = useActiveMark(marks, scrollerRef, paged);
    const announcement = useChapterAnnouncement(marks, activeId);

    /**
     * The chapter headings, by chapter id, so a deliberate jump can move focus
     * to the one it landed on.
     *
     * A ref map rather than `document.getElementById`: the ids are this
     * component's, but reading them back out of the document would make this
     * file's correctness depend on nothing else on the page having rendered a
     * colliding id — which is precisely the assumption the `beat-` prefix exists
     * because we cannot make.
     */
    const headingsRef = useRef(new Map<ChapterId, HTMLElement>());
    const setHeading = useCallback((id: ChapterId, element: HTMLElement | null) => {
        if (element) headingsRef.current.set(id, element);
        else headingsRef.current.delete(id);
    }, []);

    /**
     * A deliberate jump: scroll, then move focus to the heading WITHOUT scrolling
     * again.
     *
     * `preventScroll: true` is load-bearing. Without it the browser performs its
     * own instant scroll-into-view on focus, which lands a fraction off the
     * smooth scroll already in flight and produces a visible double jump — the
     * single most common way a "jump to chapter" control feels broken.
     */
    const jump = useCallback(
        (id: string) => {
            const target = document.getElementById(id);
            target?.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'start',
            });
            const index = anchors.indexOf(id);
            if (index >= 0) {
                headingsRef.current.get(chapters[index].id)?.focus({ preventScroll: true });
            }
            // Back means "back one decision": only a deliberate jump pushes.
            if (typeof history !== 'undefined') history.pushState(null, '', `#${id}`);
        },
        [anchors, chapters, reduceMotion],
    );

    useChapterKeys(marks, activeId, jump, marks.length > 0);

    return (
        <Box
            component="main"
            ref={scrollerRef}
            // The stage announces its own telling on its own element rather than
            // on `document.body`: `applyExperienceTokens` is the single owner of
            // every write to `body` (M32), and a second writer racing it is the
            // bug that discipline exists to prevent.
            data-xp-stage=""
            data-tier={tier}
            data-flow={spec.flow}
            sx={{
                fontFamily: 'var(--xp-font-body)',
                fontSize: 'var(--xp-fs-base)',
                color: 'var(--xp-text)',
                px: 'var(--xp-gutter)',
                // The dot strip is fixed to the right edge, so it is outside the
                // flow and cannot push anything — which means the flow has to be
                // told about it. Without this reservation the strip sits ON the
                // last word of every line at the widths that chose `dots` in the
                // first place. `rail` needs no equivalent: it is in flow.
                ...(spec.chrome === 'dots' ? { pr: 'calc(var(--xp-gutter) + 44px)' } : null),
                pt: DOOR_CLEARANCE,
                // The reserved bottom band, plus breathing room. The chat FAB
                // offsets from the same token, so nothing can stack on the home
                // indicator.
                pb: 'calc(var(--xp-nav-h) + var(--xp-sp-9))',
                // Smooth scrolling belongs to the container the anchors move,
                // and it is motion: a reader who asked for stillness gets the
                // instant jump, which is also the browser's own default.
                scrollBehavior: reduceMotion ? 'auto' : 'smooth',
                ...(paged
                    ? {
                        // `paged` is the only flow that takes the scroll away
                        // from the document. 100svh — the *small* viewport
                        // height — so a mobile browser's collapsing URL bar
                        // cannot leave a page one bar taller than its snap.
                        height: '100svh',
                        overflowY: 'auto',
                        overscrollBehaviorY: 'contain',
                        scrollSnapType: 'y proximity',
                    }
                    : null),
            }}
        >
            {/* Rendered once and mutated, never mounted per announcement: a live
                region added to the DOM at the same moment its text appears is
                frequently not announced at all. */}
            <Box aria-live="polite" role="status" sx={srOnly}>
                {announcement}
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--xp-gutter)',
                    // Wide enough for a rail beside a full measure, and no wider:
                    // a story that runs the whole width of a 27" display is a
                    // story nobody finishes.
                    maxWidth: 1400,
                    mx: 'auto',
                }}
            >
                <Box className="xp-plane-flow" sx={{ flex: '1 1 auto', minWidth: 0, width: 'auto' }}>
                    {overtureBeat && <Overture beat={overtureBeat} spec={spec} id={OVERTURE_ID} />}

                    {/* `data-xp-chapters` is what the print sheet reorders
                        against: on paper the chapters run reverse-chronologically
                        via `order`, which flips the VISUAL sequence without
                        touching the DOM, so reading order for assistive tech and
                        for the exported HTML is unchanged. */}
                    <Box data-xp-chapters="">
                        {chapters.map((chapter, index) => (
                            <Chapter
                                key={chapter.id}
                                chapter={chapter}
                                story={story}
                                spec={spec}
                                skipBeatIndex={overtureIndex >= 0 ? overtureIndex : null}
                                // The overture holds the page's `h1` when it
                                // exists. When it does not, the first chapter
                                // takes it, so the outline never begins at `h2`.
                                headingLevel={!overtureBeat && index === 0 ? 'h1' : 'h2'}
                                copy={copy?.[chapter.id]}
                                anchorId={anchors[index]}
                                headingRef={setHeading}
                            />
                        ))}
                    </Box>
                </Box>

                {spec.chrome === 'rail' && marks.length > 0 && (
                    <ChapterRail
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                    />
                )}
            </Box>

            {spec.chrome === 'dots' && marks.length > 0 && (
                <>
                    <ChapterDots
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                    />
                    <ChapterPill
                        marks={marks}
                        activeId={activeId}
                        reduceMotion={reduceMotion}
                        onJump={jump}
                    />
                </>
            )}
        </Box>
    );
}
