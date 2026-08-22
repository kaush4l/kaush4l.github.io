/**
 * The cut, as arithmetic.
 *
 * TIMECODE's one non-negotiable craft claim is that **the track is drawn to
 * real duration** — a three-month contract is visibly a short clip and a
 * two-year role is a long one. The moment the track's geometry is authored by
 * hand it becomes a drawing of a timeline rather than a timeline, and the whole
 * world's argument ("honest proportions are the craft signal") is a decoration.
 *
 * So nothing here is authored. Every number below is derived from the periods
 * `story.ts` already parsed out of `content/`, which means the track cannot
 * disagree with the résumé: rename a role, move a date, and the clip moves with
 * it in the same build. CREATIVE-SPEC §5.4.2 asks for exactly this — stage
 * geometry generated at build time from the spine rather than stored — and this
 * module is that generator, kept out of the Stage so the Stage's render is a
 * `.map` over its result.
 *
 * ── Why months and not days ─────────────────────────────────────────────────
 * `Period` carries a month at best (`content/` writes "March 2020 - May 2022"),
 * so a day-resolution axis would be inventing precision the source does not
 * have. Months are the finest honest unit, and they are integers, which keeps
 * every fraction below exact rather than accumulating float drift across nine
 * clips.
 *
 * ── Why there is still no clock here ────────────────────────────────────────
 * `story.ts` states the rule and this module inherits it: a present engagement
 * is measured against `story.span.endYear` — the furthest year the résumé
 * itself reaches — and never against `Date.now()`. A build in 2027 must produce
 * the same track as a build today, or the static export and the page a reader
 * loaded yesterday tell two different stories about the same career.
 */
import type { Period, Story, StorySpineChapter } from '@/lib/story';

/** An absolute month index, so two periods are comparable with `-`. */
function monthIndex(year: number, month: number | undefined): number {
    // A period with no month is a year label ("2011-2015"). January for a start
    // and December for an end is the widest reading the source supports, and
    // widening is the honest direction: it never claims an engagement was
    // shorter than the document says.
    return year * 12 + ((month ?? 1) - 1);
}

/** The half-open month span of one period, resolved against the story's present. */
function periodSpan(period: Period, presentEnd: number): { start: number; end: number } {
    const start = monthIndex(period.startYear, period.startMonth);
    const end = period.isPresent || period.endYear === null
        ? presentEnd
        : monthIndex(period.endYear, period.endMonth ?? 12) + 1;
    // An engagement recorded as a single point still occupies the frame it was
    // shot in: one month, never zero, or the clip vanishes from the track and
    // the reader loses a chapter they can see in the flow.
    return { start, end: Math.max(end, start + 1) };
}

/**
 * One clip on the cut track: a chapter, drawn where and as long as it happened.
 *
 * `dated: false` is a first-class answer rather than a gap to fill. The coda is
 * not a duration — it is the end card — and drawing it as a clip would put a
 * fabricated length on the one track whose entire claim is that its lengths are
 * real. It is rendered as a mark past the out point instead.
 */
export interface Clip {
    /** The spine chapter's id, so a Stage joins back without a search. */
    id: string;
    /** The employer, school or client. What the rail labels and the sheet read. */
    label: string;
    /** 0-based sequence number. `SEQ 01` is chapter index 1, the cold open is 00. */
    index: number;
    /** Whole months, for the readout. 0 when undated. */
    months: number;
    /** 0 → 1 along the axis. Both are 1 for an undated clip. */
    from: number;
    to: number;
    /** False for a chapter with no dated beat — the end card. */
    dated: boolean;
    /** The authored period string, never a reconstruction (`story.ts`'s rule). */
    periodLabel?: string;
}

/** A project or degree, drawn on the second track beneath the cut. */
export interface BRollClip {
    id: string;
    label: string;
    from: number;
    to: number;
    /** The chapter it belongs to, so B-roll dims with its sequence. */
    chapterId: string;
}

export interface Timeline {
    clips: readonly Clip[];
    bRoll: readonly BRollClip[];
    /** The in and out points, as years, for the track's two end labels. */
    inYear: number;
    outYear: number;
    /** Total months under the axis — the film's running time, honestly. */
    months: number;
}

/**
 * Build the whole track.
 *
 * The CUT track is the chapters' LEAD beats and only those: a chapter is one
 * engagement, and folding its `also` beats into its length would make `crossing`
 * run from 2016 to 2024 because a 2024 side project is filed under it. Those
 * beats are B-ROLL, which is what the second track is for and what
 * CREATIVE-SPEC §4.3 calls them.
 */
export function buildTimeline(story: Story, chapters: readonly StorySpineChapter[]): Timeline {
    // The story's own present: the furthest year the résumé reaches, December.
    // See the no-clock note above — this is the one place a wall clock would
    // have been the obvious and wrong choice.
    const presentEnd = monthIndex(story.span.endYear, 12) + 1;

    const raw = chapters.map((chapter) => {
        const lead = chapter.leadIndex >= 0 ? story.beats[chapter.leadIndex] : undefined;
        const span = lead?.period ? periodSpan(lead.period, presentEnd) : null;
        return {
            id: chapter.id as string,
            label: lead ? (lead.org ?? lead.title) : chapter.id,
            index: chapter.index,
            span,
            periodLabel: lead?.periodLabel,
        };
    });

    const dated = raw.filter((entry) => entry.span !== null);
    // A story with no parsed period anywhere is not a failure state — it is a
    // flat track and a readable page. Returning a degenerate axis rather than
    // dividing by zero is the same posture `parsePeriod` takes toward a string
    // it cannot read: keep going, lose nothing.
    const first = dated.length > 0 ? Math.min(...dated.map((entry) => entry.span!.start)) : 0;
    const last = dated.length > 0 ? Math.max(...dated.map((entry) => entry.span!.end)) : 1;
    const total = Math.max(last - first, 1);
    const fraction = (month: number) => (month - first) / total;

    const clips: Clip[] = raw.map((entry) => ({
        id: entry.id,
        label: entry.label,
        index: entry.index,
        months: entry.span ? entry.span.end - entry.span.start : 0,
        from: entry.span ? fraction(entry.span.start) : 1,
        to: entry.span ? fraction(entry.span.end) : 1,
        dated: entry.span !== null,
        periodLabel: entry.periodLabel,
    }));

    // B-roll: every non-lead beat of every chapter that carries a period. A
    // project with no date is not drawn — an undated clip on a duration track is
    // the one thing this world may not do — and it is not lost either: it is a
    // beat in the flow like any other.
    const bRoll: BRollClip[] = [];
    for (const chapter of chapters) {
        for (const beatIndex of chapter.beats) {
            if (beatIndex === chapter.leadIndex) continue;
            const beat = story.beats[beatIndex];
            if (!beat?.period) continue;
            const span = periodSpan(beat.period, presentEnd);
            bRoll.push({
                id: beat.id,
                label: beat.title,
                from: fraction(span.start),
                to: fraction(span.end),
                chapterId: chapter.id as string,
            });
        }
    }

    return {
        clips,
        bRoll,
        inYear: Math.floor(first / 12),
        outYear: Math.floor((last - 1) / 12),
        months: total,
    };
}

/**
 * The burned-in readout: years and months elapsed since the in point.
 *
 * A real burned-in timecode is `HH:MM:SS:FF`, and faking frames on a career
 * would be the exact failure this world forbids everywhere else — no fake
 * transport, no fake footage. `YY:MM` is the same glyph rhythm carrying a true
 * measurement, which is why the label beside it names its own units instead of
 * letting the reader assume hours.
 */
export function elapsedCode(clip: Clip | undefined, timeline: Timeline): string {
    if (!clip || !clip.dated) return '--:--';
    const elapsed = Math.round(clip.from * timeline.months);
    const years = Math.floor(elapsed / 12);
    const months = elapsed % 12;
    return `${String(years).padStart(2, '0')}:${String(months).padStart(2, '0')}`;
}

/** `2 yr 4 mo`, or `3 mo`. The clip length, in words, for the rail and sheet. */
export function durationLabel(clip: Clip): string {
    if (!clip.dated) return 'end card';
    const years = Math.floor(clip.months / 12);
    const months = clip.months % 12;
    if (years === 0) return `${months} mo`;
    if (months === 0) return `${years} yr`;
    return `${years} yr ${months} mo`;
}
