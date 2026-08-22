'use client';

/**
 * The table — this world's rendering of the shared progress affordance
 * (`spineCostume: 'table'`), and simultaneously its HUD.
 *
 * ── Why the primary artefact is a table, and why that is the strong move ────
 * Every gate posts a row: employer, dates, and the one measured fact that
 * chapter earned. The table only ever grows, so accumulated information is
 * monotonic — and the consequence is the most defensible failure mode in the
 * set: **a hiring manager who never scrolls past the first screen still has a
 * complete, tabular, `tabular-nums` employment history in front of them.** If
 * every other pixel of this world fails to load, what is left on the page is a
 * well-set employment table, which is also exactly what it prints as.
 *
 * ── It is a real navigation, not a picture of one ───────────────────────────
 * `<nav aria-label="Career progress">` wrapping a real `<table>` whose employer
 * cells are real `<a href="#beat-…">` links with `aria-current="step"` on the
 * active one — so middle-click, copy-link-address and open-in-new-tab all work.
 * A rail built from `<button onClick>` looks identical and silently breaks all
 * three; that is the defect this file is written against.
 *
 * ── Three tellings of one table ─────────────────────────────────────────────
 * Nothing is dropped at any width; the same four facts are arranged three ways.
 *   compact  the table IS the page (`hud.mobileMode: 'page'`): full-width rows,
 *            employer and dates stacked in one cell, a STICKY HEADER ROW —
 *            added at compact and needed nowhere else, because column labels
 *            must survive scrolling on a phone.
 *   medium   four columns, docked right at 300px.
 *   cinema   four columns, docked right at 380px, acting as the rail.
 *
 * ── Posting ─────────────────────────────────────────────────────────────────
 * A row the reader has reached is set in `--xp-text`; a row ahead of them is set
 * in `--xp-text-muted`. Both are text tokens and both clear their floor by
 * construction (15.37:1 and 7.12:1 on the ground) — the distinction is colour
 * and weight, NEVER legibility, because a row nobody can read yet is a row that
 * was hidden. The 320ms slide is on the signal cell alone and its resting state
 * is the visible one.
 */
import type { CSSProperties } from 'react';
import type { NarrativeTier } from '../types';
import type { Gate } from './geometry';

interface TableProps {
    gates: readonly Gate[];
    /** The chapter the reader is inside. `null` before the first observation. */
    activeGate: string | null;
    tier: NarrativeTier;
    /** The true fraction of beats completed. Never a chapter count. */
    progress: number;
    reduceMotion: boolean;
    onJump: (anchor: string) => void;
    /** `2017 → 2025`, drawn once under the caption as the world's premise. */
    reference: { fromYear: number | null; toYear: number | null; years: number | null };
}

export default function GhostTable({
    gates,
    activeGate,
    tier,
    progress,
    reduceMotion,
    onJump,
    reference,
}: TableProps) {
    const activeIndex = gates.findIndex((gate) => gate.id === activeGate);
    const stacked = tier === 'compact';

    return (
        <nav
            className="xp-ghost-table"
            aria-label="Career progress"
            data-tier={tier}
            style={{ '--ghost-progress': progress } as CSSProperties}
        >
            <div className="xp-ghost-table-head">
                <p className="xp-ghost-table-title">Employment history</p>
                <p className="xp-ghost-table-sub xp-tnum">
                    {`${String(Math.max(activeIndex, 0) + 1).padStart(2, '0')} / ${String(gates.length).padStart(2, '0')}`}
                    {reference.fromYear !== null && reference.toYear !== null && (
                        <>
                            <span aria-hidden> · </span>
                            {`reference run ${reference.fromYear}`}
                            <span aria-hidden>{' → '}</span>
                            {reference.toYear}
                        </>
                    )}
                </p>
                {/* The fill is the TRUE fraction of beats completed, derived from
                    the same array the content comes from. A progress affordance
                    that lies once makes everything else on the page suspect. */}
                <span
                    aria-hidden
                    className="xp-ghost-table-fill"
                    data-still={reduceMotion ? '' : undefined}
                />
            </div>

            <table className="xp-ghost-grid">
                <caption className="xp-ghost-caption">
                    Every gate in run order, with the measurement it earned. The reading below
                    expands each one.
                </caption>
                <thead>
                    <tr>
                        <th scope="col" className="xp-ghost-col-ordinal">
                            Gate
                        </th>
                        <th scope="col">Employer</th>
                        {!stacked && <th scope="col">Dates</th>}
                        <th scope="col">Signal</th>
                    </tr>
                </thead>
                <tbody>
                    {gates.map((gate, index) => {
                        const active = gate.id === activeGate;
                        const posted = activeIndex < 0 ? index === 0 : index <= activeIndex;
                        return (
                            <tr
                                key={gate.id}
                                data-gate={gate.id}
                                data-active={active ? '' : undefined}
                                data-posted={posted ? '' : undefined}
                                data-echo={gate.echoes ? '' : undefined}
                            >
                                <th scope="row" className="xp-ghost-col-ordinal xp-tnum">
                                    {gate.ordinal}
                                </th>
                                <td>
                                    <a
                                        href={`#${gate.anchor}`}
                                        onClick={() => onJump(gate.anchor)}
                                        aria-current={active ? 'step' : undefined}
                                    >
                                        {gate.label}
                                    </a>
                                    {stacked && gate.periodLabel && (
                                        <span className="xp-ghost-stacked-dates xp-tnum">
                                            {gate.periodLabel}
                                        </span>
                                    )}
                                </td>
                                {!stacked && (
                                    <td className="xp-tnum xp-ghost-col-dates">
                                        {gate.periodLabel ?? '—'}
                                    </td>
                                )}
                                <td className="xp-ghost-col-signal xp-tnum">{gate.signal}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </nav>
    );
}
