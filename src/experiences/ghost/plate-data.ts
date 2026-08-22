/**
 * The authored half of the plate — the only numbers in this world a machine
 * could not have derived, and the reason they are here rather than in
 * `geometry.ts` is that `geometry.ts` is allowed to be pure arithmetic.
 *
 * This module is imported by THREE consumers — `index.ts` (which publishes it as
 * `Experience.stageProps`), `geometry.ts` (which turns it into path data) and
 * `Plate.tsx` (which draws the annotations) — and that is the whole point. The
 * config a reviewer reads and the numbers the art is drawn from are one object;
 * they cannot drift, because there is nothing to drift from. CREATIVE-SPEC §5.4
 * calls `stageProps` "the pressure-release valve"; this is that valve with a
 * type on it.
 *
 * ── The one axis this world authors, and what it means ──────────────────────
 * `spread` is the plate's vertical axis: **how far an engagement sits from the
 * first problem** — the IBM Curam SPM eligibility work of 2017. It is not
 * seniority, not salary, not capability, and it is deliberately not "how good
 * was this job", because a plate that ranked employers would be the exact
 * failure §4.1 forbids: no clock, no rank, no medal.
 *
 * That axis is what makes the whole world legible in one glance. The trace
 * climbs away from state-benefits Java into healthcare, cloud, event pipelines
 * and agents — and then, at the seventh gate, it comes back down to the line it
 * started on, because in January 2025 the problem was Curam eligibility rules
 * again. `return` therefore has NO authored `spread` in this file: its altitude
 * is looked up through `SpineChapter.echoes` in `geometry.ts`, which is what
 * makes the convergence one field rather than one special case.
 *
 * ── `signal` ────────────────────────────────────────────────────────────────
 * The one measured fact each gate earned, transcribed from `content/` and never
 * invented here. It is what the table's last column posts and what the plate's
 * third annotation column reads at cinema. Every one of them is checkable
 * against the bullets rendered three inches below it, which is the only reason a
 * summary column like this is honest at all.
 */
import type { ChapterId, NarrativeTier } from '../types';

/**
 * Which gate glyph a chapter is drawn with.
 *
 * `curam` appears exactly twice — at `crossing` and at `return` — and both draw
 * the SAME `<symbol>`, referenced twice. That reuse is the peak's whole visual
 * argument and it costs nothing: the reader recognises the shape before they
 * read the year, which is the only way a rhyme lands in a picture.
 */
export type GateSymbol = 'plain' | 'curam' | 'lane' | 'here' | 'finish';

/**
 * A type ALIAS and not an interface, deliberately: `Experience.stageProps` is
 * typed `Record<ChapterId, Readonly<Record<string, unknown>>>`, and only a type
 * alias gets the implicit index signature that makes it assignable to that. An
 * interface here compiles everywhere except the one line in `index.ts` that
 * matters.
 */
export type GhostChapterProps = {
    /**
     * 0 → 1, distance from the first problem. `undefined` on the chapter that
     * declares `echoes`, whose altitude IS the chapter it echoes.
     */
    readonly spread?: number;
    /** The one measured fact this gate earned. Transcribed, never invented. */
    readonly signal: string;
    readonly symbol: GateSymbol;
};

/**
 * How much of each gate's annotation stack the margin can hold.
 *
 * Published to `--xp-density` by `tokens()` AND read directly by `Plate.tsx`,
 * from this one declaration — a number is a token (CREATIVE-SPEC §5.2) and this
 * is the form the drawing code can read without parsing a computed style.
 *
 *   1  the year only              (compact — a 120px strip has room for a year)
 *   2  the year and the employer  (medium)
 *   3  the year, the employer and the signal (cinema — the full dimension call)
 */
export const GHOST_DENSITY: Readonly<Record<NarrativeTier, number>> = {
    compact: 1,
    medium: 2,
    cinema: 3,
};

export const GHOST_STAGE_PROPS: Readonly<Record<ChapterId, GhostChapterProps>> = {
    // Two degrees, no run yet. Slightly above the start line rather than on it:
    // coursework is not the problem, it is the approach to it.
    origin: { spread: 0.12, signal: 'B.Tech · M.S.', symbol: 'plain' },
    // The datum. Every altitude on this plate is measured from here.
    crossing: { spread: 0.0, signal: 'boilerplate −40%', symbol: 'curam' },
    trials: { spread: 0.34, signal: 'HIPAA · SSO + MFA', symbol: 'plain' },
    depth: { spread: 0.62, signal: '4s → under 100ms', symbol: 'plain' },
    // The multi-lane section. One gate only, and the world's single ambient loop.
    scale: { spread: 0.8, signal: '10M+ events per hour', symbol: 'lane' },
    // The furthest the line ever gets from the first problem, and the gate that
    // carries the one warm mark on a cold plate.
    ignition: { spread: 1.0, signal: '100GB+ indexed', symbol: 'here' },
    // No `spread`. See the header: this altitude is `echoes`, resolved.
    return: { signal: 'Curam SPM, again', symbol: 'curam' },
    mastery: { spread: 0.55, signal: 'WCAG 2.1 AA', symbol: 'finish' },
    // A flat run-out past the finish rule. The coda is the plate being read, not
    // another engagement, so it neither climbs nor falls.
    coda: { spread: 0.55, signal: 'five groups resolved', symbol: 'plain' },
};
