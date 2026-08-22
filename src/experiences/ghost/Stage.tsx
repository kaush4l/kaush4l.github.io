'use client';

/**
 * GHOST TRACE — the world.
 *
 * Two lines on one axis, and the résumé is the table between them. The plate is
 * spectacle and carries no fact that is not also here; the table is the
 * navigation, the HUD and the print output; the flow below is the résumé, whole,
 * at every width.
 *
 * ── Why this Stage is imported STATICALLY, against the stub's own note ──────
 * `index.ts`'s pre-registered comment proposed
 * `dynamic(() => import('./Stage'), { ssr: false })`. That is the E1 rule for a
 * world with a motion timeline, and this world does not have one: it declares
 * `rafLoops: 0`, no canvas, no WebGL, and its only motion is a CSS scroll
 * timeline plus two transitions. `ssr: false` would therefore buy nothing and
 * cost the one thing this world is the featured card FOR — with it, the exported
 * HTML of `/experience/ghost/` contains no story at all: no employment table for
 * a crawler, nothing with JavaScript disabled, and nothing for the CI assertion
 * in CREATIVE-SPEC §2.7.3 that runs the completeness checks under print
 * emulation and with JS off. Statically imported, every gate position, every
 * generated path string and all seven employers are in the HTML a reader
 * downloads, and the world's degraded form really is a well-set employment
 * table. The deviation is deliberate and it is the safer direction.
 *
 * ── The three tellings ──────────────────────────────────────────────────────
 * Same nine chapters, same beat count, three arrangements. The compact one was
 * designed first, because this is the world whose primary artefact is native to
 * a phone:
 *
 *   compact  a 120px instrument strip pinned at the top; then THE TABLE AS THE
 *            PAGE (`hud.mobileMode: 'page'`) with a sticky header row; then the
 *            nine chapters, each beat's evidence one tap away in a disclosure
 *            that is in the DOM and forced open on paper.
 *   medium   the strip becomes a 40svh band; the table docks right at 300px;
 *            bullets come inline.
 *   cinema   full side elevation, sticky 100svh behind the reading; the table
 *            docks right at 380px and IS the rail; three annotation columns.
 *
 * No tier hides a beat. `TellingSpec.show` filters PARTS of a beat and there is
 * no code path below that can skip one — the beat loop is unconditional and
 * `show` is only ever consulted inside a beat.
 */
import { useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { useExperience } from '../ExperienceProvider';
import type { ChapterCopy, StageProps, TellingSpec } from '../types';
import type { Story, StoryBeat, StorySpineChapter } from '@/lib/story';
import { buildPlate, type Gate } from './geometry';
import { GHOST_DENSITY } from './plate-data';
import { markMetrics } from './metrics';
import Plate from './Plate';
import GhostTable from './Table';
import {
    progressFraction,
    useActiveMark,
    useChapterKeys,
    useJump,
    useReadingAnnouncement,
    type Mark,
} from './reading';

const OVERTURE_ID = 'xp-overture';

/**
 * A beat's DOM id, PREFIXED.
 *
 * `beat-` is not decoration. A deep link carries `#beat-experience-04-oracle`
 * and the browser's native fragment scroll fires as soon as an element with that
 * id parses; without the prefix the page could jump to an unstyled position
 * mid-hydration. The colon is replaced rather than escaped because a colon is
 * legal in an id and is a combinator in a selector.
 */
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

function beatMeta(beat: StoryBeat, shows: (part: TellingSpec['show'][number]) => boolean): string[] {
    const parts: string[] = [];
    if (beat.periodLabel) parts.push(beat.periodLabel);
    if (beat.years >= 1) parts.push(beat.years === 1 ? '1 yr' : `${beat.years} yrs`);
    if (beat.era) parts.push(beat.era);
    if (shows('location') && beat.location) parts.push(beat.location);
    return parts;
}

// ─── The echo ───────────────────────────────────────────────────────────────

/**
 * THE CONVERGENCE — one field, rendered in this world's language.
 *
 * There is no `id === 'return'` in this component and no peak-shaped branch
 * anywhere in the world. What exists is: *a chapter that declares `echoes`
 * renders the chapter it names beside itself, under the labels **Then** and
 * **Now**.* A sixth chapter that declared `echoes` tomorrow would get the same
 * pair for free, and deleting the field deletes the peak from the table, from
 * the plate (where the ghost's altitude is looked up through the same field) and
 * from here at once.
 *
 * ── Then and Now, chronology and not judgement ──────────────────────────────
 * The columns are the two dates. The interface never says which line is faster,
 * never shows a clock, a rank or a personal best, and the word this world is
 * most often mistaken for appears nowhere in it.
 *
 * The shared technology is DERIVED — the intersection of the two engagements'
 * own `tags`, computed here rather than asserted. On this résumé that
 * intersection is one word, and it is the word the whole feature exists for. A
 * hand-written "both were Curam" would be a claim; an intersection is evidence.
 */
function ThenNow({
    then,
    now,
    thenChapter,
    nowChapter,
    years,
}: {
    then: StoryBeat;
    now: StoryBeat;
    thenChapter?: ChapterCopy;
    nowChapter?: ChapterCopy;
    years: number | null;
}) {
    const shared = then.tags.filter((tag) =>
        now.tags.some((other) => other.toLowerCase() === tag.toLowerCase()),
    );

    return (
        <div className="xp-ghost-echo xp-ghost-peak">
            <div className="xp-ghost-echo-col">
                <p className="xp-ghost-echo-label">Then</p>
                <p className="xp-ghost-echo-org">{then.org ?? then.title}</p>
                <p className="xp-ghost-echo-dates xp-tnum">{then.periodLabel}</p>
                {thenChapter && <p className="xp-ghost-echo-name">{thenChapter.chapter}</p>}
            </div>

            <div className="xp-ghost-echo-rule" aria-hidden>
                <span className="xp-ghost-echo-span xp-tnum">
                    {years !== null ? `${years} yrs` : '—'}
                </span>
            </div>

            <div className="xp-ghost-echo-col">
                <p className="xp-ghost-echo-label">Now</p>
                <p className="xp-ghost-echo-org">{now.org ?? now.title}</p>
                <p className="xp-ghost-echo-dates xp-tnum">{now.periodLabel}</p>
                {nowChapter && <p className="xp-ghost-echo-name">{nowChapter.chapter}</p>}
            </div>

            {shared.length > 0 && (
                <p className="xp-ghost-echo-shared">
                    <span className="xp-ghost-echo-shared-label">Shared with the reference run</span>
                    {shared.map((tag) => (
                        <span className="xp-ghost-echo-tag" key={tag}>
                            {tag}
                        </span>
                    ))}
                </p>
            )}
        </div>
    );
}

// ─── The beat ───────────────────────────────────────────────────────────────

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

    const bullets = beat.bullets.length > 0 && (
        <ul className="xp-ghost-bullets">
            {beat.bullets.map((bullet, i) => (
                <li key={`${beat.id}:${i}`}>
                    {/* `label` + `text`, never `label` + `html`: the html already
                        contains the label, and rendering both prints it twice. */}
                    {bullet.label && <strong>{`${bullet.label}: `}</strong>}
                    {markMetrics(bullet.text, `${beat.id}-${i}`)}
                </li>
            ))}
        </ul>
    );

    return (
        <article
            className="xp-beat xp-ghost-beat"
            data-beat-id={beat.id}
            data-featured={beat.featured ? '' : undefined}
            style={{ '--xp-beat-index': index % Math.max(spec.beatsInView, 1) } as CSSProperties}
        >
            <p className="xp-ghost-beat-meta xp-tnum">
                <span>{String(beat.chapter).padStart(2, '0')}</span>
                {beat.isPresent && <span className="xp-ghost-present">Present</span>}
            </p>

            {/* The lead beat's name is already the chapter's `<h2>`; repeating it
                as an `<h3>` would put the same string twice in the outline a
                screen-reader user navigates by. Nothing is lost — the `<h2>`
                above carries employer, role AND dates. */}
            {!lead && (
                <h3 className="xp-ghost-beat-title">
                    {beat.link ? (
                        <a href={beat.link} className="xp-ghost-beat-link">
                            {beat.title}
                        </a>
                    ) : (
                        beat.title
                    )}
                </h3>
            )}

            {!lead && shows('org') && beat.org && (
                <p className="xp-ghost-beat-org">
                    {beat.org}
                    {beat.via && <span className="xp-ghost-via">{` · via ${beat.via}`}</span>}
                </p>
            )}

            {!lead && meta.length > 0 && (
                <p className="xp-ghost-beat-dates xp-tnum">{meta.join(' · ')}</p>
            )}

            {shows('summary') && beat.summary && (
                <p className="xp-ghost-summary">{markMetrics(beat.summary, `${beat.id}-s`)}</p>
            )}

            {/* The evidence. At a tier whose `show` includes `bullets` it is
                inline; at compact it is a disclosure — the SAME nodes, one tap
                away, present in the DOM, counted by find-in-page, and forced
                open by the shared print sheet. A shorter telling of the beat,
                never the beat with its evidence deleted. */}
            {bullets &&
                (shows('bullets') ? (
                    bullets
                ) : (
                    <details className="xp-ghost-more">
                        <summary>
                            {`${beat.bullets.length} ${beat.bullets.length === 1 ? 'entry' : 'entries'}`}
                        </summary>
                        {bullets}
                    </details>
                ))}

            {shows('tags') && beat.tags.length > 0 && (
                <ul className="xp-ghost-tags" aria-label="Technologies">
                    {beat.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                    ))}
                </ul>
            )}
        </article>
    );
}

// ─── The chapter ────────────────────────────────────────────────────────────

function Chapter({
    chapter,
    story,
    spec,
    copy,
    echoCopy,
    gate,
    anchorId,
    skipBeatIndex,
    headingLevel,
    headingRef,
    reference,
    coda,
}: {
    chapter: StorySpineChapter;
    story: Story;
    spec: TellingSpec;
    copy?: ChapterCopy;
    echoCopy?: ChapterCopy;
    gate?: Gate;
    anchorId: string;
    skipBeatIndex: number | null;
    headingLevel: 'h1' | 'h2';
    headingRef: (anchor: string, element: HTMLElement | null) => void;
    reference: { fromYear: number | null; years: number | null };
    /** The derived closing line, rendered under the last chapter only. */
    coda?: string;
}) {
    const beatIndices = chapter.beats.filter((beatIndex) => beatIndex !== skipBeatIndex);

    /**
     * The deliberately quiet chapters, derived rather than listed.
     *
     * Two shapes qualify and both are read off the spine: a chapter the spine
     * itself weights light, and THE LANDING — the chapter that follows the one
     * declaring `echoes`, before the coda. That second clause is why chapter 7
     * is quiet even though its weight is 1.0: the shape of this career has to
     * say "the interesting thing was the return", not "behold how high I got",
     * and a landing that arrived as loud as the peak would say the opposite.
     * Quiet is a desaturation and nothing else — never less content, never a
     * smaller type size, and never a chapter that is harder to read.
     */
    const peakIndex = story.spine.chapters.findIndex((candidate) => candidate.echoes);
    const quiet =
        chapter.weight < 0.8 ||
        (peakIndex >= 0 &&
            chapter.index === peakIndex + 1 &&
            chapter.index < story.spine.chapters.length - 1);
    const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
    const headingId = `${anchorId}-heading`;
    const heading = chapterHeading(lead) || chapter.id;
    const Heading = headingLevel;

    // The echoed chapter, resolved. One lookup; no branch on any chapter id.
    const echoed = chapter.echoes
        ? story.spine.chapters.find((candidate) => candidate.id === chapter.echoes)
        : undefined;
    const echoedLead =
        echoed && echoed.leadIndex >= 0 ? story.beats[echoed.leadIndex] : undefined;

    return (
        <section
            id={anchorId}
            className="xp-ghost-chapter"
            data-xp-chapter={chapter.id}
            data-quiet={quiet ? '' : undefined}
            data-peak={chapter.echoes ? '' : undefined}
            aria-labelledby={headingId}
            style={
                {
                    '--beat-weight': chapter.weight,
                    '--xp-chapter-index': chapter.index,
                    // The same ramp stop this chapter's gate is drawn in, so the
                    // ordinal on the plate and the ordinal in the reading are
                    // one colour by construction rather than by coincidence.
                    '--ghost-stage': `var(--xp-stage-${Math.min(chapter.index + 1, 7)})`,
                } as CSSProperties
            }
        >
            <header className="xp-ghost-chapter-head">
                <p className="xp-ghost-chapter-rule xp-tnum" aria-hidden>
                    <span className="xp-ghost-chapter-ordinal">
                        {String(chapter.index + 1).padStart(2, '0')}
                    </span>
                    {/* The dimension call: where this gate sits, and how far it
                        is from the reference run. It is drawn on the plate as a
                        dimension line and stated here as text, so the ghost is
                        INFORMATION rather than motion — which is what makes the
                        reduced-motion and printed tellings complete rather than
                        merely still. */}
                    {gate?.year !== null && gate?.year !== undefined && (
                        <span className="xp-ghost-chapter-dim">
                            {`${gate.year}`}
                            {gate.fromReference !== null && reference.fromYear !== null && (
                                <span className="xp-ghost-chapter-ref">
                                    {` · reference run ${reference.fromYear} +${gate.fromReference}`}
                                </span>
                            )}
                        </span>
                    )}
                </p>

                {/* The poetic name is an EYEBROW and never the heading: an
                    outline made of "The convergence" is unnavigable for exactly
                    the reader who most needs the outline. */}
                {copy?.chapter && <p className="xp-eyebrow xp-ghost-eyebrow">{copy.chapter}</p>}

                <Heading
                    id={headingId}
                    tabIndex={-1}
                    ref={(element: HTMLElement | null) => headingRef(anchorId, element)}
                    className="xp-ghost-heading"
                >
                    {heading}
                </Heading>

                {copy?.narration && <p className="xp-ghost-narration">{copy.narration}</p>}
            </header>

            {echoedLead && lead && (
                <ThenNow
                    then={echoedLead}
                    now={lead}
                    thenChapter={echoCopy}
                    nowChapter={copy}
                    years={reference.years}
                />
            )}

            <div className="xp-ghost-beats" data-in-view={spec.beatsInView}>
                {beatIndices.map((beatIndex, position) => (
                    <Beat
                        key={story.beats[beatIndex].id}
                        beat={story.beats[beatIndex]}
                        index={position}
                        spec={spec}
                        lead={beatIndex === chapter.leadIndex}
                    />
                ))}
            </div>

            {coda && <p className="xp-ghost-coda">{coda}</p>}
        </section>
    );
}

// ─── The stage ──────────────────────────────────────────────────────────────

export default function GhostStage({ story, tier, reduceMotion }: StageProps) {
    const { experience } = useExperience();
    const spec = experience.telling[tier];
    const copy = experience.copy;
    const density = GHOST_DENSITY[tier];

    /**
     * The overture beat, promoted out of `origin`'s `also` list and skipped in
     * the chapter loop, so the rendered beat count stays exactly
     * `story.beats.length` — the number QA asserts is identical at 390, 820 and
     * 1440.
     */
    const overtureBeat = story.byKind.about[0];
    const overtureIndex = overtureBeat
        ? story.beats.findIndex((beat) => beat.id === overtureBeat.id)
        : -1;

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

    /**
     * The plate, generated from the spine and the parsed periods. `useMemo` over
     * a value that is computed once per render of a statically-exported page is
     * not a performance trick — it is what keeps the identity stable so the
     * table and the annotations are never handed two different plates.
     */
    const plate = useMemo(
        () => buildPlate(story, (chapter) => chapterAnchor(chapter, story.beats)),
        [story],
    );

    const marks = useMemo<Mark[]>(() => {
        const chapterMarks = chapters.map((chapter, index) => ({
            id: anchors[index],
            label:
                (chapter.leadIndex >= 0
                    ? story.beats[chapter.leadIndex].org ?? story.beats[chapter.leadIndex].title
                    : undefined) ?? chapter.id,
            beatCount: chapter.beats.filter((beatIndex) => beatIndex !== overtureIndex).length,
        }));
        return overtureBeat
            ? [{ id: OVERTURE_ID, label: overtureBeat.title, beatCount: 1 }, ...chapterMarks]
            : chapterMarks;
    }, [chapters, anchors, story.beats, overtureBeat, overtureIndex]);

    const activeId = useActiveMark(marks);
    const announcement = useReadingAnnouncement(marks, activeId);
    const progress = progressFraction(marks, activeId);

    const headings = useRef(new Map<string, HTMLElement>());
    const setHeading = useCallback((anchor: string, element: HTMLElement | null) => {
        if (element) headings.current.set(anchor, element);
        else headings.current.delete(anchor);
    }, []);
    const jump = useJump(headings, reduceMotion);
    useChapterKeys(marks, activeId, jump, marks.length > 0);

    /** Which gate the plate should light. The overture lights none. */
    const activeGate = useMemo(() => {
        const index = anchors.indexOf(activeId ?? '');
        return index >= 0 ? chapters[index].id : null;
    }, [anchors, activeId, chapters]);

    /**
     * The closing line, derived rather than typed.
     *
     * "Nine years. Seven employers. Two of them were the same problem." is the
     * coda's one sentence in CREATIVE-SPEC §4.0, and both numbers in it are
     * COUNTED here rather than typed: calendar years touched by a work beat, and
     * distinct employers among them. The spec's own "nine" was true when the
     * spec was written and is not true now — which is the whole argument for
     * deriving it. The convention (years TOUCHED, so a current engagement counts
     * the year it is in) is the same one `content/01-about` uses when it says
     * "10 years", so the coda and the bio agree by construction instead of by
     * somebody remembering to update both.
     */
    const coda = useMemo(() => {
        const work = story.byKind.work;
        if (work.length === 0) return undefined;
        const years = work.flatMap((beat) =>
            beat.period ? [beat.period.startYear, beat.period.endYear ?? story.span.endYear] : [],
        );
        if (years.length === 0) return undefined;
        const spanYears = Math.max(...years) - Math.min(...years) + 1;
        const employers = new Set(work.map((beat) => beat.org ?? beat.title)).size;
        return `${spanYears} years. ${employers} employers. Two of them were the same problem.`;
    }, [story]);

    return (
        <main
            className="xp-ghost"
            data-xp-stage=""
            data-tier={tier}
            data-flow={spec.flow}
            data-still={reduceMotion ? '' : undefined}
        >
            {/* Rendered once and mutated, never mounted per announcement: a
                region added to the DOM at the same moment its text appears is
                frequently not announced at all. */}
            <p aria-live="polite" role="status" className="xp-ghost-sr">
                {announcement}
            </p>

            <Plate plate={plate} tier={tier} density={density} activeGate={activeGate} />

            <div className="xp-ghost-body">
                {/* The table is first in DOM after the plate at every tier. At
                    compact that is the whole argument — the first screen is a
                    complete employment history — and above it the grid docks the
                    same markup to the right without re-ordering the document. */}
                <GhostTable
                    gates={plate.gates}
                    activeGate={activeGate}
                    tier={tier}
                    progress={progress}
                    reduceMotion={reduceMotion}
                    onJump={jump}
                    reference={plate.reference}
                />

                <div className="xp-plane-flow xp-ghost-flow">
                    {overtureBeat && (
                        <header
                            id={OVERTURE_ID}
                            className="xp-beat xp-ghost-overture"
                            data-beat-id={overtureBeat.id}
                            style={{ '--xp-beat-index': 0 } as CSSProperties}
                        >
                            <h1 className="xp-ghost-title">{overtureBeat.title}</h1>
                            {overtureBeat.org && (
                                <p className="xp-ghost-overture-meta">
                                    {[overtureBeat.org, overtureBeat.location]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            )}
                            {overtureBeat.summary && (
                                <p className="xp-ghost-summary">
                                    {markMetrics(overtureBeat.summary, 'overture')}
                                </p>
                            )}
                        </header>
                    )}

                    {/* `data-xp-chapters` is what the shared print sheet reorders
                        against: on paper the chapters run reverse-chronologically
                        via `order`, which flips the visual sequence without
                        touching the DOM. */}
                    <div data-xp-chapters="">
                        {chapters.map((chapter, index) => (
                            <Chapter
                                key={chapter.id}
                                chapter={chapter}
                                story={story}
                                spec={spec}
                                copy={copy?.[chapter.id]}
                                echoCopy={chapter.echoes ? copy?.[chapter.echoes] : undefined}
                                gate={plate.gates.find((candidate) => candidate.id === chapter.id)}
                                anchorId={anchors[index]}
                                skipBeatIndex={overtureIndex >= 0 ? overtureIndex : null}
                                headingLevel={!overtureBeat && index === 0 ? 'h1' : 'h2'}
                                headingRef={setHeading}
                                reference={plate.reference}
                                coda={index === chapters.length - 1 ? coda : undefined}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
