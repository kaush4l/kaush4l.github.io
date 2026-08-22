'use client';

/**
 * THE CARD. One composition, nine sequences, and the thing this world lives or
 * dies on.
 *
 * CREATIVE-SPEC §4.3 states the risk plainly: "this world lives or dies on a
 * single four-slot card composition (eyebrow / role / rule / mono meta). If the
 * card is merely fine, this becomes nine slides and no amount of motion polish
 * recovers it." So the card is authored ONCE, here, and every sequence in the
 * film is this composition with different words. There is no second card, no
 * per-chapter layout switch and no escape hatch — a title sequence in which the
 * cards are composed differently is not a title sequence, it is a deck.
 *
 * The four slots, top to bottom:
 *
 *   1. EYEBROW   `SEQ 03 · THE DISSOLVE` — mono, 12px, caps, +0.08em, muted.
 *   2. NAME      the employer, display serif, one size in the whole world.
 *   3. ROLE      the title, italic, one step down. The rule sits under it.
 *   4. META      dates bottom-right in tabular mono (CREATIVE-SPEC §4.3's own
 *                instruction), the one metric bottom-left.
 *
 * ── The two variants, and why the difference is semantic and not visual ─────
 * `card`  — the compact telling's chapter header, IN the flow. It carries the
 *           chapter's real `<h2>`, so the heading a screen reader navigates by
 *           reads "Oracle Corporation — Software Engineer, March 2020 - May
 *           2022": employer, role AND dates, all three inside the heading, which
 *           is why the date line is a `<span>` of the `<h2>` rather than a
 *           sibling that merely sits near it.
 * `frame` — spectacle in the sticky plane at medium and cinema, `aria-hidden`,
 *           duplicating a heading the flow beneath it already carries. The
 *           two-plane law: the stage may hold no fact the flow does not.
 *
 * That is the whole difference. The pixels are identical, which is what makes
 * the compact telling a real telling rather than the wide one with things
 * removed.
 *
 * ── No hex literals ─────────────────────────────────────────────────────────
 * Not one colour is named in this file. Every surface, rule and letterform
 * colour is a `--xp-*` token, which is the rule that keeps a sixth world a
 * config object (`CREATIVE-SPEC §5.2`) and which is enforced by lint across
 * `src/experiences/**` outside `index.ts`.
 */

import type { ReactNode, Ref } from 'react';
import type { Shot } from './shots';

export interface TitleCardProps {
    variant: 'frame' | 'card';
    /** `SEQ 03`, `COLD OPEN`, `END CARD`. Never a bare number. */
    sequence: string;
    /** The poetic name, second half of the eyebrow. Never the heading. */
    chapterName?: string;
    /** The employer, school or client — the line a skimmer is scanning for. */
    name: string;
    /** The role. Absent on a chapter whose lead beat has no employer. */
    role?: string;
    /** The authored period string. Rendered, never reconstructed. */
    dates?: string;
    location?: string;
    shot: Shot;
    /**
     * 1–7. Which rung of the candle-count ramp this sequence's ordinal takes.
     *
     * Resolved to a `var(--xp-stage-N)` reference on the element rather than
     * indexed in CSS, because `var(--xp-stage-var(--n))` is not a thing and the
     * alternative — seven near-identical rules — is seven places to get the ramp
     * wrong. The shared Stage resolves its ordinal colour the same way.
     */
    stage: number;
    /** The reused shot's date pair, rendered only where `echoes` is declared. */
    echo?: {
        /** `SEQ 01` — the sequence being re-printed. */
        sequence: string;
        /** `2017 · Esystems Inc`. Hidden until the cut plays; shown beside the
            new one under reduced motion, which is how a press kit shows a match. */
        from: string;
        /** `2025 · NC DHHS`. The card's resting, final state. */
        to: string;
    };
    /** Set on the `<h2>` of the `card` variant so the section can label itself. */
    headingId?: string;
    headingRef?: Ref<HTMLHeadingElement>;
    /** The eyebrow is a `<p>`, never a heading — rendered by the caller in flow. */
    eyebrow?: ReactNode;
}

export default function TitleCard(props: TitleCardProps) {
    // `headingId` and `headingRef` are destructured with the rest rather than
    // read as `props.headingRef` at the JSX. Reaching through `props` for a ref
    // in the render body is what `react-hooks/refs` fails the build on, and it
    // taints the neighbouring `props.headingId` spread in the same element. A
    // ref FORWARDED to a `ref=` attribute is never dereferenced here, so the
    // rule is satisfied by naming it once, up front, with everything else.
    const {
        variant, sequence, chapterName, name, role, dates, location, shot, stage, echo,
        headingId, headingRef,
    } = props;
    const isFrame = variant === 'frame';

    // The heading, and the three strings inside it. `Heading` is an `h2` in the
    // flow and a plain `div` in the frame — the frame must not contribute to the
    // document outline, because a heading nobody can reach is worse than no
    // heading at all.
    const Heading = (isFrame ? 'div' : 'h2') as 'div' | 'h2';

    return (
        <div
            className="tc-card"
            data-variant={variant}
            data-shot={shot.kind}
            data-push={shot.push ? '' : undefined}
            // The ordinal's rung of the ramp, as a number the stylesheet reads.
            // Colour is never the sole carrier here: the eyebrow states `SEQ 03`
            // in words beside it, and the clip holds a fixed position on the
            // track, so the card survives greyscale and forced-colors intact.
            style={{ ['--tc-stage-color' as string]: `var(--xp-stage-${stage})` }}
            {...(isFrame ? { 'aria-hidden': true as const } : null)}
        >
            {/* 1. EYEBROW. A `<p>`, never a heading: an outline made of "The
                Dissolve" and "Reused Shot" is unnavigable for exactly the reader
                who most needs the outline. */}
            <p className="tc-eyebrow xp-tnum">
                <span className="tc-seq">{sequence}</span>
                {chapterName && <span className="tc-chapter-name">{chapterName}</span>}
            </p>

            <Heading
                className="tc-heading"
                {...(headingId ? { id: headingId } : null)}
                {...(isFrame ? null : { tabIndex: -1 })}
                ref={headingRef as Ref<HTMLHeadingElement> | undefined}
            >
                {/* 2. NAME — the employer, at the world's one display size. */}
                <span className="tc-name">{name}</span>
                {/* 3. ROLE — italic, one step down, and the 1px rule sits under
                    the pair. `—` is inside the heading's text so the accessible
                    name reads as one sentence rather than as three fragments. */}
                {role && <span className="tc-role">{role}</span>}
                {/* 4a. The dates, bottom-right in tabular mono. Inside the
                    heading so the `<h2>` reads employer, role AND dates — the
                    string CREATIVE-SPEC §2.7.5 requires. `periodLabel` is what
                    the author wrote; `story.ts` forbids a reconstruction. */}
                {dates && <span className="tc-dates xp-tnum">{dates}</span>}
            </Heading>

            {/* 4b. The one metric, bottom-left, in the shared `.xp-metric` — mono
                600, tabular, accent, in every world identically. One. A card with
                three numbers on it is a slide. */}
            {(shot.metric || location || echo) && (
                <p className="tc-meta">
                    {shot.metric && (
                        <span className="tc-metric">
                            {/* The dissolve, and the only `from` in the film. Both
                                halves are always present so the measurement reads
                                with zero motion; the stylesheet is what makes the
                                old value hand over to the new one in the identical
                                position, and it does it only where motion is
                                welcome. */}
                            {shot.metric.from && (
                                <>
                                    <span className="xp-metric tc-metric-from xp-scroll-linked">{shot.metric.from}</span>
                                    <span className="tc-metric-arrow xp-scroll-linked" aria-hidden>→</span>
                                </>
                            )}
                            <span className="xp-metric tc-metric-to xp-scroll-linked">{shot.metric.to}</span>
                        </span>
                    )}
                    {location && <span className="tc-location">{location}</span>}
                </p>
            )}

            {/* THE REUSED SHOT — rendered from `SpineChapter.echoes` and from no
                other signal. This block contains no chapter id, no year and no
                employer of its own: every string in it was resolved from the
                chapter the spine says this one echoes, which is what makes the
                peak one FIELD rather than bespoke peak code. A sixth world
                declares its own rendering and inherits the fact. */}
            {echo && (
                <div className="tc-echo">
                    <span className="tc-echo-caption">{`reused shot — ${echo.sequence}`}</span>
                    <span className="tc-echo-pair xp-tnum">
                        <span className="tc-echo-from xp-scroll-linked">{echo.from}</span>
                        <span className="tc-echo-to xp-scroll-linked">{echo.to}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
