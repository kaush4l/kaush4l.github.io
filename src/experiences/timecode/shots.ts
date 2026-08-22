/**
 * What one sequence is, as data — and the single boundary where this world's
 * `stageProps` stops being `unknown`.
 *
 * `WorldProps` is `Readonly<Record<string, unknown>>` on purpose: the shape is
 * the world's own and only this world's Stage reads it, so a wider type in
 * `types.ts` would be a lie about who the audience is. The price is that
 * somebody has to narrow it, and the rule that keeps that from spreading is
 * that it happens **once, here**, at the module boundary — never inline in a
 * render, and never with a cast at three call sites that can drift apart.
 *
 * `readShot` is total: an id with no entry returns the neutral shot rather than
 * `undefined`, so a chapter added to the spine tomorrow renders as a plain title
 * card instead of crashing the world it was not written for.
 */
import type { WorldProps } from '../types';

/**
 * The camera vocabulary, per sequence — literal here rather than metaphorical,
 * which CREATIVE-SPEC §4.3 names as this world's one legitimate claim to
 * cinematic language.
 *
 * `cut` is the neutral shot and the default. Every other value changes exactly
 * one thing about how the card is composed or how it arrives, and the Stage
 * switches on this string in one place.
 */
export type ShotKind =
    /** The cold open. No timecode burned in yet; the playhead has not started. */
    | 'cold-open'
    /** A straight cut to a composed title card. The neutral shot. */
    | 'cut'
    /** Deliberately quiet: straight cuts only, `saturate(0.65)`, text at 0.86. */
    | 'quiet'
    /** The metric replaces itself in the identical position over 720ms linear. */
    | 'dissolve'
    /** The only rapid section: the evidence arrives at a shorter stagger. */
    | 'burst'
    /** The ember ignites in the frame corner; the AI stem enters the mix. */
    | 'ignition'
    /** The reused shot. Rendered from `SpineChapter.echoes`, never from an id. */
    | 'match'
    /** A calm landing. No dissolve, no accent. */
    | 'landing'
    /** The end card. The mix resolves; nothing follows it. */
    | 'end-card';

export interface Shot {
    kind: ShotKind;
    /**
     * The one metric burned into the card, already in the world's own words.
     *
     * ONE. A title card with three numbers on it is a slide, and this world's
     * stated risk is becoming nine slides. `from` is set only on the dissolve
     * sequence, where the card holds on the old value and the new one replaces
     * it in the identical position — the dissolve *is* the measurement.
     */
    metric?: { from?: string; to: string };
    /**
     * The push-in, and it is `true` on exactly two sequences in the whole film.
     *
     * The spine declares `camera: 'push'` on three chapters; CREATIVE-SPEC §4.3
     * caps the move at two uses. Both statements are kept: the spine's camera is
     * the chapter's INTENT and stays untouched, and this flag is TIMECODE's own
     * budget for the move. A world that spent it three times would have spent it
     * on nothing, because a move used everywhere is not a move.
     */
    push?: boolean;
    /** The mono line under the rule, when the sequence needs one. */
    caption?: string;
    /** The closing line, on the end card only. */
    closing?: string;
}

const NEUTRAL: Shot = { kind: 'cut' };

/** Narrow one chapter's `stageProps` entry. Total, and the only cast in the world. */
export function readShot(props: WorldProps | undefined): Shot {
    if (!props) return NEUTRAL;
    const kind = props.kind;
    if (typeof kind !== 'string') return NEUTRAL;
    return props as unknown as Shot;
}
