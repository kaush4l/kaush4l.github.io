'use client';

/**
 * TIMECODE's Stage — the cutting room, assembled from the same nine chapters
 * every other world tells.
 *
 * ── Why this world has a Stage at all ───────────────────────────────────────
 * The shared `Stage` is a complete, correctly-graded telling and four fifths of
 * this file would be a worse copy of it. What it cannot do — and should not be
 * taught to do — is the one thing this world IS: a sticky frame carrying a
 * composed title card, a track drawn to real duration, and a match cut. Those
 * are structure, not decoration, and `Experience.Stage` exists precisely so a
 * world whose argument is structural does not have to negotiate it into a
 * shared component that four other worlds also depend on.
 *
 * Everything that is NOT structural stayed in `index.ts`: the palette, the
 * ramp, the geometry per tier, the nine narrations, the shot list. This file
 * reads them; it declares none of them, and it contains no hex literal, no
 * duration and no pixel measurement that a token could have carried.
 *
 * ── STATICALLY IMPORTED, deliberately, against the `dynamic(…, { ssr: false })`
 *    default ──────────────────────────────────────────────────────────────────
 * `types.ts` recommends `dynamic` for "anything with a motion timeline". Every
 * timeline in this world is a CSS animation whose resting frame is its finished
 * state, so there is no client-only timeline to defer — and deferring would cost
 * something this world cannot pay: `ssr: false` exports a page whose entire
 * story arrives one paint late, invisible to a crawler and invisible with JS
 * off, which is exactly what the accessibility contract's "the same assertions
 * run with JS disabled" forbids. `ExperienceFrame` makes this same argument for
 * the shared Stage, in the same words. The E1 rule is about timelines, not about
 * defaults.
 *
 * ── The two planes ──────────────────────────────────────────────────────────
 *   .xp-plane-stage   the FRAME. `aria-hidden`, print-hidden, carries no fact
 *                     the flow does not. Absent at compact by design, where the
 *                     card is in the flow instead — a portrait phone cannot
 *                     afford a permanently pinned band, and overlaid text on a
 *                     390px screen loses contrast against anything behind it.
 *   .xp-plane-flow    the EVIDENCE. Every heading, bullet, date and tag. This is
 *                     what prints, what a screen reader walks, and what survives
 *                     with the stylesheet deleted.
 *
 * ── Why plain elements and class names rather than `sx` ─────────────────────
 * This world's geometry is per-tier and per-shot: a card composed one way,
 * scaled two ways, and re-timed by `data-shot`. Expressing that as `sx` objects
 * would put ninety conditionals in the render and would lose to the stylesheet's
 * own specificity half the time. The delimited `timecode` block in
 * `experiences.css` is where a world's `@keyframes`, pseudo-elements and
 * `@supports` blocks are required to live (§5.4.3); putting the geometry beside
 * them keeps the whole world's appearance in one readable place instead of two
 * that disagree.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useExperience } from '../ExperienceProvider';
import type { StageProps, StorySpineChapter, TellingSpec } from '../types';
import type { StoryBeat } from '@/lib/story';
import { readShot } from './shots';
import type { Shot } from './shots';
import TitleCard from './TitleCard';
import { buildTimeline, durationLabel, elapsedCode } from './timeline';
import type { Clip, Timeline } from './timeline';

// ─── Naming ─────────────────────────────────────────────────────────────────

/**
 * A beat's DOM id, PREFIXED — the shared engine's rule, restated because the
 * reason is the same here and the failure is silent.
 *
 * A deep link carries `#beat-experience-04-oracle`, and the browser's native
 * fragment scroll fires as soon as an element with that id parses. Without the
 * prefix a world's own markup could plausibly own the bare id and the reader
 * would watch the page yank itself somewhere mid-hydration. The colon in
 * `${sectionId}:${slug}` is replaced rather than escaped, because a colon is
 * legal in an id and is a combinator in a selector.
 */
function beatAnchor(beatId: string): string {
    return `beat-${beatId.replace(/:/g, '-')}`;
}

function chapterAnchor(chapter: StorySpineChapter, beats: readonly StoryBeat[]): string {
    const lead = chapter.leadIndex >= 0 ? beats[chapter.leadIndex] : undefined;
    return lead ? beatAnchor(lead.id) : `xp-chapter-${chapter.id}`;
}

const SLATE_ID = 'xp-overture';

/**
 * The sequence's name in the cutting room's own numbering.
 *
 * The cold open is not SEQ 00 and the end card is not SEQ 09 — neither is a
 * sequence. Naming them as ones would put two numbers on the page that disagree
 * with the beat sheet, and the reader who notices is the reader who was paying
 * the most attention.
 */
function sequenceLabel(index: number, total: number): string {
    if (index === 0) return 'cold open';
    if (index === total - 1) return 'end card';
    return `seq ${String(index).padStart(2, '0')}`;
}

/** The chapter's rung of the seven-stop candle-count ramp. */
function rampStage(index: number, total: number): number {
    if (total <= 1) return 1;
    return Math.min(7, Math.max(1, Math.round(1 + (index / (total - 1)) * 6)));
}

// ─── Reading position ───────────────────────────────────────────────────────

/**
 * Which sequence the playhead is over.
 *
 * A middle-band `IntersectionObserver`, the same mechanism and the same
 * `rootMargin` the shared Stage uses, and for the same reason: "active" must
 * mean "occupying the middle of the viewport", not "topmost", or the playhead
 * flickers backwards every time two sections straddle the fold — which on a
 * track drawn to real duration is a visibly jumping playhead rather than a
 * subtly wrong highlight.
 *
 * M41: no `document` read in a `useState` initializer. `null` is the server's
 * answer and the first client frame's answer; the real one lands on the commit
 * after the observer fires, which is also what makes the cold open the resting
 * state (no timecode burned in yet — CREATIVE-SPEC §4.3's chapter 0).
 */
function useActiveAnchor(anchors: readonly string[]): string | null {
    const [active, setActive] = useState<string | null>(null);
    const key = anchors.join('|');

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
                setActive(elements.find((element) => visible.has(element.id))?.id ?? null);
            },
            { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
        );
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [key]);

    return active;
}

/**
 * Keyboard navigation, restrained exactly as the shared Stage restrains it.
 *
 * **`Space`, `PageDown` and native arrow-scroll are never bound.** This augments
 * scrolling; it never replaces it. Every binding no-ops inside a text control
 * and inside the chat widget, and when any modifier other than `Shift+G` is held
 * — so `Cmd+←` still means "back" and never means "previous sequence".
 *
 * A deliberate jump is a CUT: input is locked for the cut's duration and the
 * last input during the lock is QUEUED rather than dropped, so `4 4 4` lands on
 * sequence 4 instead of stuttering through 2 and 3 on the way.
 */
const CUT_MS = 560;

function useSequenceKeys(anchors: readonly string[], activeId: string | null, jump: (id: string) => void) {
    const anchorsRef = useRef(anchors);
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
        anchorsRef.current = anchors;
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

            const list = anchorsRef.current;
            if (list.length === 0) return;
            const current = Math.max(0, list.indexOf(activeRef.current ?? ''));
            const go = (index: number) => {
                event.preventDefault();
                commit(list[Math.min(Math.max(index, 0), list.length - 1)]);
            };

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
    }, []);
}

// ─── The track ──────────────────────────────────────────────────────────────

/**
 * The cut, drawn to real duration — the world's one non-negotiable craft claim.
 *
 * Every geometry below is a fraction produced by `timeline.ts` from the périods
 * `story.ts` parsed out of `content/`. Nothing is authored, so a three-month
 * contract is a sliver and a two-year role is a bar, and the peak is physically
 * small on the timeline at the exact moment it is largest in the telling. That
 * contradiction is the whole point of drawing it honestly.
 *
 * `aria-hidden`, because it is a picture of information the rail, the sheet and
 * the headings all state in words. The navigation affordance is the rail; this
 * is the film's own timeline and it is spectacle.
 *
 * The playhead is a full-width element translated by `(p - 1) * 100%` so its
 * right edge lands at `p`. That is a pure `transform` — a composited property —
 * where the obvious `left: calc(p * 100%)` would lay out on every scroll tick.
 */
function Track({
    timeline,
    progress,
    activeIndex,
    density,
}: {
    timeline: Timeline;
    progress: number;
    activeIndex: number;
    density: number;
}) {
    return (
        <div className="tc-track" aria-hidden style={{ ['--tc-p' as string]: String(progress) }}>
            <div className="tc-track-lane" data-lane="cut">
                {timeline.clips.map((clip) => (
                    <span
                        key={clip.id}
                        className="tc-clip"
                        data-dated={clip.dated ? '' : undefined}
                        data-state={
                            clip.index < activeIndex ? 'past' : clip.index === activeIndex ? 'now' : 'ahead'
                        }
                        style={{
                            ['--tc-from' as string]: String(clip.from),
                            ['--tc-span' as string]: String(Math.max(clip.to - clip.from, 0)),
                            ['--tc-stage-color' as string]: `var(--xp-stage-${rampStage(clip.index, timeline.clips.length)})`,
                        }}
                    />
                ))}
                <span className="tc-playhead" />
            </div>

            {/* The B-roll: projects and the second degree, on their own lane, in
                the cool non-text channel so the two tracks separate without
                either of them being lit. Drawn from `--xp-density` — how much
                detail this width can carry — which is a NUMBER and therefore a
                token, never a media query nobody can find. */}
            {density >= 2 && (
                <div className="tc-track-lane" data-lane="broll">
                    {timeline.bRoll.map((clip) => (
                        <span
                            key={clip.id}
                            className="tc-broll"
                            style={{
                                ['--tc-from' as string]: String(clip.from),
                                ['--tc-span' as string]: String(Math.max(clip.to - clip.from, 0)),
                            }}
                        />
                    ))}
                </div>
            )}

            {/* In and out points, as years. The only two numbers on the track
                itself, and they are what make the proportions readable rather
                than merely present. */}
            <div className="tc-track-marks xp-tnum">
                <span>{timeline.inYear}</span>
                <span>{timeline.outYear}</span>
            </div>
        </div>
    );
}

// ─── The mix ────────────────────────────────────────────────────────────────

/**
 * Five stems that enter as the cut progresses — visible but empty ahead of time,
 * so the reader can watch the mix filling rather than discovering it at the end.
 *
 * The levels are `SpineChapter.grants`, accumulated: a stem is at full level once
 * the chapter that grants it is behind the playhead. That means the strip cannot
 * disagree with the spine, and a sixth skill group added to the spine tomorrow
 * appears here with no edit.
 *
 * Two renderings of one fact, chosen by `hud.mobileMode: 'coda-only'`:
 * `dock` follows the reader at cinema, where there is room for it beside the
 * frame; below that it appears ONCE, complete, in the end card — because a strip
 * that follows a reader down a 390px screen is a strip standing on the words.
 */
function Mix({
    groups,
    granted,
    variant,
}: {
    groups: readonly { id: string; title: string }[];
    granted: ReadonlySet<string>;
    variant: 'dock' | 'panel';
}) {
    return (
        <div className="tc-mix" data-variant={variant} {...(variant === 'dock' ? { 'aria-hidden': true } : null)}>
            <p className="tc-mix-title">{variant === 'dock' ? 'mix' : 'the record'}</p>
            <ul className="tc-mix-list">
                {groups.map((group) => (
                    <li key={group.id} className="tc-mix-stem" data-level={granted.has(group.id) ? 'full' : 'empty'}>
                        <span className="tc-mix-label">{group.title}</span>
                        <span className="tc-mix-meter" aria-hidden />
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── The evidence ───────────────────────────────────────────────────────────

/**
 * One beat of evidence, beneath the card that named it.
 *
 * The lead beat opens straight into its bullets: its employer, role and dates
 * are already the chapter's `<h2>` inside the title card, and repeating them as
 * an `<h3>` would put the same string twice in the outline a screen-reader user
 * navigates by. Nothing is lost — the heading above carries all three.
 */
function Evidence({ beat, spec, lead, index }: { beat: StoryBeat; spec: TellingSpec; lead: boolean; index: number }) {
    const shows = (part: TellingSpec['show'][number]) => spec.show.includes(part);
    const meta: string[] = [];
    if (!lead && beat.periodLabel) meta.push(beat.periodLabel);
    if (shows('location') && beat.location) meta.push(beat.location);
    if (beat.era) meta.push(beat.era);

    return (
        <article
            className="xp-beat tc-evidence"
            data-beat-id={beat.id}
            data-lead={lead ? '' : undefined}
            style={{ '--xp-beat-index': index % Math.max(spec.beatsInView, 1) } as CSSProperties}
        >
            {!lead && (
                <h3 className="tc-evidence-title">
                    {beat.link ? (
                        <a className="tc-evidence-link" href={beat.link}>
                            {beat.title}
                        </a>
                    ) : (
                        beat.title
                    )}
                </h3>
            )}

            {!lead && shows('org') && beat.org && (
                <p className="tc-evidence-org">
                    {beat.org}
                    {beat.via && <span className="tc-evidence-via">{` · via ${beat.via}`}</span>}
                </p>
            )}

            {meta.length > 0 && <p className="tc-evidence-meta xp-tnum">{meta.join(' · ')}</p>}

            {shows('summary') && beat.summary && <p className="tc-evidence-summary">{beat.summary}</p>}

            {shows('bullets') && beat.bullets.length > 0 && (
                <ul className="tc-evidence-bullets">
                    {beat.bullets.map((bullet, i) => (
                        <li key={`${beat.id}:${i}`}>
                            {/* `label` + `text`, never `label` + `html`: the html
                                already contains the label and rendering both
                                prints it twice. */}
                            {bullet.label && <strong>{`${bullet.label}: `}</strong>}
                            {bullet.text}
                        </li>
                    ))}
                </ul>
            )}

            {shows('tags') && beat.tags.length > 0 && (
                <ul className="tc-evidence-tags" aria-label="Technologies">
                    {beat.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                    ))}
                </ul>
            )}
        </article>
    );
}

// ─── The stage ──────────────────────────────────────────────────────────────

export default function Stage({ story, tier, reduceMotion }: StageProps) {
    const { experience } = useExperience();
    const spec = experience.telling[tier];
    const copy = experience.copy;
    const shots = experience.stageProps;
    const density = tier === 'cinema' ? 3 : tier === 'medium' ? 2 : 1;

    /**
     * The slate: the résumé's `about` beat, lifted out and told once at the head
     * of the film as the page's one `h1`.
     *
     * `byKind.about` rather than a hardcoded section name, so renaming a content
     * folder cannot silently remove the page's only top-level heading. The
     * chapter loop skips this index, which is what keeps the rendered beat count
     * exactly `story.beats.length` at every tier — nothing duplicated, nothing
     * dropped, which is the assertion the reduced-motion and print gates make.
     */
    const slate = story.byKind.about[0];
    const slateIndex = slate ? story.beats.findIndex((beat) => beat.id === slate.id) : -1;

    const chapters = useMemo(
        () => story.spine.chapters.filter((chapter) => chapter.beats.some((i) => i !== slateIndex)),
        [story.spine.chapters, slateIndex],
    );
    const anchors = useMemo(
        () => chapters.map((chapter) => chapterAnchor(chapter, story.beats)),
        [chapters, story.beats],
    );
    const timeline = useMemo(() => buildTimeline(story, chapters), [story, chapters]);

    const activeId = useActiveAnchor(anchors);
    const activeIndex = Math.max(0, anchors.indexOf(activeId ?? ''));
    const activeChapter = chapters[activeIndex];
    const activeClip: Clip | undefined = timeline.clips[activeIndex];

    /**
     * The playhead's position: the true fraction of the film that is behind it.
     *
     * The clip's own start on the real-duration axis, not the chapter index over
     * nine. A bar that moved a ninth per chapter would claim the three-month
     * contract and the four-year degree were the same amount of film, and
     * CREATIVE-SPEC §2.6 is unambiguous: a progress affordance that lies once
     * makes everything else on the page suspect.
     */
    const activeShot = activeChapter ? readShot(shots?.[activeChapter.id]) : readShot(undefined);
    const progress = activeShot.kind === 'cold-open' || !activeClip
        // "The track exists; the playhead has not started." The cold open is the
        // one sequence whose clip has a real position and whose playhead must
        // still read zero, because nothing has been cut yet.
        ? 0
        : activeClip.dated
            ? activeClip.to
            : 1;

    /** The five stems, and which of them the playhead has passed. */
    const skillGroups = useMemo(
        () => story.byKind.skills.map((beat) => ({ id: beat.id.split(':')[1].replace(/^\d+-/, ''), title: beat.title })),
        [story.byKind.skills],
    );
    const granted = useMemo(() => {
        const set = new Set<string>();
        chapters.slice(0, activeIndex + 1).forEach((chapter) => chapter.grants.forEach((g) => set.add(g)));
        return set;
    }, [chapters, activeIndex]);

    // ── A deliberate jump: scroll, then move focus WITHOUT scrolling again ────
    // `preventScroll` is load-bearing. Without it the browser performs its own
    // instant scroll-into-view on focus, which lands a fraction off the smooth
    // scroll already in flight and produces the visible double jump that makes
    // every hand-rolled "jump to chapter" control feel broken.
    const headings = useRef(new Map<string, HTMLElement>());
    const setHeading = useCallback((id: string, element: HTMLElement | null) => {
        if (element) headings.current.set(id, element);
        else headings.current.delete(id);
    }, []);

    const [sheetOpen, setSheetOpen] = useState(false);
    const jump = useCallback(
        (id: string) => {
            document.getElementById(id)?.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'start',
            });
            headings.current.get(id)?.focus({ preventScroll: true });
            setSheetOpen(false);
            if (typeof history !== 'undefined') history.pushState(null, '', `#${id}`);
        },
        [reduceMotion],
    );
    useSequenceKeys(anchors, activeId, jump);

    // The polite announcement. Rendered once and mutated by state rather than
    // mounted per announcement: a live region added to the DOM at the same moment
    // its text appears is frequently never announced, because assistive tech has
    // nothing to diff it against.
    const [announcement, setAnnouncement] = useState('');
    useEffect(() => {
        if (!activeId || !activeChapter) return;
        const lead = activeChapter.leadIndex >= 0 ? story.beats[activeChapter.leadIndex] : undefined;
        setAnnouncement(
            `Sequence ${activeIndex + 1} of ${chapters.length} — ${lead?.org ?? lead?.title ?? activeChapter.id}`,
        );
    }, [activeId, activeIndex, activeChapter, chapters.length, story.beats]);

    /** One chapter's card, composed from the spine, the copy and the shot list. */
    const cardFor = (chapter: StorySpineChapter, variant: 'frame' | 'card') => {
        const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
        const shot: Shot = readShot(shots?.[chapter.id]);
        const anchor = anchors[chapters.indexOf(chapter)];

        /**
         * THE REUSED SHOT, resolved from `SpineChapter.echoes` and from nothing
         * else — no chapter id is named here and no year is typed here.
         *
         * This is the one field CREATIVE-SPEC §4.0 calls the highest-leverage
         * line in the schema, and the test of whether a world rendered it or
         * special-cased it is exactly this: delete `echoes: 'crossing'` from the
         * spine and this block disappears; move it to another chapter and the
         * match cut moves with it, in this world's own language, with no edit
         * here.
         */
        const echoedIndex = chapter.echoes ? chapters.findIndex((c) => c.id === chapter.echoes) : -1;
        const echoed = echoedIndex >= 0 ? chapters[echoedIndex] : undefined;
        const echoedLead = echoed && echoed.leadIndex >= 0 ? story.beats[echoed.leadIndex] : undefined;
        const echo = echoed && echoedLead && lead
            ? {
                sequence: sequenceLabel(echoedIndex, chapters.length),
                from: `${echoedLead.period?.startYear ?? ''} · ${echoedLead.org ?? echoedLead.title}`,
                to: `${lead.period?.startYear ?? ''} · ${lead.org ?? lead.title}`,
            }
            : undefined;

        const index = chapters.indexOf(chapter);
        return (
            <TitleCard
                variant={variant}
                sequence={sequenceLabel(index, chapters.length)}
                chapterName={copy?.[chapter.id]?.chapter}
                name={lead?.org ?? lead?.title ?? chapter.id}
                role={lead?.org ? lead.title : undefined}
                dates={lead?.periodLabel}
                location={lead?.location}
                shot={shot}
                stage={rampStage(index, chapters.length)}
                echo={echo}
                headingId={variant === 'card' ? `${anchor}-heading` : undefined}
                headingRef={
                    variant === 'card'
                        ? (element: HTMLHeadingElement | null) => setHeading(anchor, element)
                        : undefined
                }
            />
        );
    };

    return (
        <main
            data-xp-stage=""
            data-tier={tier}
            data-flow={spec.flow}
            data-shot={activeShot.kind}
            className="tc-stage"
        >
            <p aria-live="polite" role="status" className="tc-sr-only">
                {announcement}
            </p>

            {/* ── THE FRAME. Spectacle, `aria-hidden`, print-hidden, and absent at
                compact where the card lives in the flow instead. It holds the
                burned-in timecode, the ember, the active title card, the track
                and — at cinema only — the mix. */}
            {tier !== 'compact' && (
                <div className="xp-plane-stage tc-frame no-print" data-tc-frame="" aria-hidden>
                    <div className="tc-frame-inner">
                        {/* The burned-in timecode. Absent on the cold open, which
                            is CREATIVE-SPEC §4.3's chapter 0 exactly: "the track
                            exists; the playhead has not started". `YY:MM` and not
                            `HH:MM:SS:FF`, because faking frames on a career is the
                            same lie as faking footage. */}
                        {activeShot.kind !== 'cold-open' && (
                            <p className="tc-burn xp-tnum">
                                <span className="tc-burn-code">{elapsedCode(activeClip, timeline)}</span>
                                <span className="tc-burn-unit">yr:mo</span>
                            </p>
                        )}

                        {/* `key` is the chapter id, so the card REMOUNTS on every
                            cut. That is what makes the entrance, the push-in and
                            the dissolve fire once per sequence instead of once per
                            page load — a CSS animation restarts when its element
                            is created, and nothing else on this page can restart
                            one without a rAF loop or a class toggle in an effect. */}
                        {activeChapter && (
                            <div className="tc-frame-card" key={activeChapter.id}>
                                {cardFor(activeChapter, 'frame')}
                            </div>
                        )}

                        {/* The companion's ember: dormant through the early
                            sequences, lit from the one where he learned to build
                            agentic systems. Four states, one element, no chat —
                            the model itself is the frame's, not this world's. */}
                        <span className="tc-ember" data-lit={granted.has('ai') ? '' : undefined} />

                        <Track
                            timeline={timeline}
                            progress={progress}
                            activeIndex={activeIndex}
                            density={density}
                        />

                        {density >= 3 && <Mix groups={skillGroups} granted={granted} variant="dock" />}
                    </div>
                </div>
            )}

            <div className="tc-body">
                {/* ── THE RAIL. Real `<a href>` links inside a
                    `<nav aria-label><ol>` with `aria-current="step"`, so
                    middle-click, copy-link-address and open-in-new-tab all work.
                    Labels are COMPANY NAMES; the poetic name is the subtitle.
                    Rows are a uniform 44px and the DURATION is carried by the bar
                    inside each row — the track keeps the true geometry, and a
                    three-month row is still tappable. */}
                {spec.chrome === 'rail' && (
                    <nav className="tc-rail no-print" aria-label="Career progress">
                        <ol>
                            {chapters.map((chapter, index) => {
                                const clip = timeline.clips[index];
                                const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
                                return (
                                    <li key={chapter.id}>
                                        <a
                                            href={`#${anchors[index]}`}
                                            onClick={() => jump(anchors[index])}
                                            aria-current={anchors[index] === activeId ? 'step' : undefined}
                                            style={{
                                                ['--tc-span' as string]: String(clip.to - clip.from),
                                                ['--tc-stage-color' as string]: `var(--xp-stage-${rampStage(index, chapters.length)})`,
                                            }}
                                        >
                                            <span className="tc-rail-seq xp-tnum" aria-hidden>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <span className="tc-rail-body">
                                                <span className="tc-rail-label">
                                                    {lead?.org ?? lead?.title ?? chapter.id}
                                                </span>
                                                <span className="tc-rail-sub">
                                                    {copy?.[chapter.id]?.chapter}
                                                </span>
                                            </span>
                                            <span className="tc-rail-dur xp-tnum">{durationLabel(clip)}</span>
                                            <span className="tc-rail-bar" aria-hidden />
                                        </a>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                )}

                <div className="xp-plane-flow tc-flow">
                    {/* The slate. The film's one `h1`, and a real beat — same
                        `.xp-beat` class, same `data-beat-id` — so the beat count
                        is exactly `story.beats.length` at every tier. */}
                    {slate && (
                        <header
                            className="xp-beat tc-slate"
                            id={SLATE_ID}
                            data-beat-id={slate.id}
                            style={{ '--xp-beat-index': 0 } as CSSProperties}
                        >
                            <h1 className="tc-slate-name">{slate.title}</h1>
                            <p className="tc-slate-role">
                                {[slate.org, slate.location].filter(Boolean).join(' · ')}
                            </p>
                            {slate.summary && <p className="tc-slate-summary">{slate.summary}</p>}
                        </header>
                    )}

                    <div data-xp-chapters="">
                        {chapters.map((chapter, index) => {
                            const shot = readShot(shots?.[chapter.id]);
                            const beats = chapter.beats.filter((i) => i !== slateIndex);
                            return (
                                <section
                                    key={chapter.id}
                                    id={anchors[index]}
                                    className="tc-sequence"
                                    data-xp-chapter={chapter.id}
                                    data-shot={shot.kind}
                                    aria-labelledby={`${anchors[index]}-heading`}
                                    style={
                                        {
                                            '--beat-weight': chapter.weight,
                                            '--xp-chapter-index': chapter.index,
                                        } as CSSProperties
                                    }
                                >
                                    {/* The card, in the flow, at every tier. At
                                        compact it is the hero; above that the same
                                        four slots render at slug scale beneath the
                                        frame that is showing them large. One
                                        composition, two scales — never a heading
                                        that only exists on one screen size. */}
                                    {cardFor(chapter, 'card')}

                                    {copy?.[chapter.id]?.narration && (
                                        <p className="tc-narration">{copy[chapter.id].narration}</p>
                                    )}

                                    <div className="tc-evidence-group">
                                        {beats.map((beatIndex, position) => (
                                            <Evidence
                                                key={story.beats[beatIndex].id}
                                                beat={story.beats[beatIndex]}
                                                spec={spec}
                                                lead={beatIndex === chapter.leadIndex}
                                                index={position}
                                            />
                                        ))}
                                    </div>

                                    {/* The mix, once and complete, in the end card
                                        at every width that has no room to dock it.
                                        `hud.mobileMode: 'coda-only'` is the field
                                        that says so, and this is the whole of its
                                        implementation. */}
                                    {shot.kind === 'end-card' && density < 3 && (
                                        <Mix groups={skillGroups} granted={new Set(skillGroups.map((g) => g.id))} variant="panel" />
                                    )}

                                    {shot.closing && <p className="tc-closing">{shot.closing}</p>}
                                </section>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── COMPACT CHROME. The 3px top bar the shared chrome specifies,
                drawn here as the cut itself in real proportions, plus the 44px
                pill in the thumb arc and the sheet it opens. The pill is a real
                link to the current sequence, so tapping it re-centres rather than
                doing nothing. */}
            {spec.chrome === 'dots' && (
                <>
                    <div className="tc-strip no-print" aria-hidden style={{ ['--tc-p' as string]: String(progress) }}>
                        {timeline.clips.map((clip, index) => (
                            <span
                                key={clip.id}
                                className="tc-strip-clip"
                                data-state={index <= activeIndex ? 'past' : 'ahead'}
                                style={{
                                    ['--tc-from' as string]: String(clip.from),
                                    ['--tc-span' as string]: String(Math.max(clip.to - clip.from, 0)),
                                }}
                            />
                        ))}
                        <span className="tc-playhead" />
                    </div>

                    <button
                        type="button"
                        className="tc-pill no-print"
                        aria-expanded={sheetOpen}
                        aria-controls="tc-sheet"
                        onClick={() => setSheetOpen((open) => !open)}
                    >
                        <span className="xp-tnum">{`${String(activeIndex + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`}</span>
                        <span className="tc-pill-label">
                            {activeChapter && activeChapter.leadIndex >= 0
                                ? (story.beats[activeChapter.leadIndex].org
                                    ?? story.beats[activeChapter.leadIndex].title)
                                : ''}
                        </span>
                    </button>

                    {/* The sheet carries every company name, sequence number and
                        real duration as TEXT. That is what makes the 3px strip
                        above it decoration rather than the only place the
                        proportions exist. */}
                    <nav
                        id="tc-sheet"
                        className="tc-sheet no-print"
                        aria-label="Career progress"
                        data-open={sheetOpen ? '' : undefined}
                        hidden={!sheetOpen}
                    >
                        <ol>
                            {chapters.map((chapter, index) => {
                                const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
                                return (
                                    <li key={chapter.id}>
                                        <a
                                            href={`#${anchors[index]}`}
                                            onClick={() => jump(anchors[index])}
                                            aria-current={anchors[index] === activeId ? 'step' : undefined}
                                        >
                                            <span className="tc-rail-seq xp-tnum" aria-hidden>
                                                {sequenceLabel(index, chapters.length)}
                                            </span>
                                            <span className="tc-rail-label">
                                                {lead?.org ?? lead?.title ?? chapter.id}
                                            </span>
                                            <span className="tc-rail-dur xp-tnum">
                                                {durationLabel(timeline.clips[index])}
                                            </span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                </>
            )}
        </main>
    );
}
