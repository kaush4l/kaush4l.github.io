'use client';

/**
 * The plate: a blueprint-cold engineering drawing in flat side elevation.
 *
 * Everything here is spectacle, and spectacle in this feature has one rule —
 * *the stage carries no fact that is not also in the flow* (CREATIVE-SPEC §2.1).
 * Every year, employer and measurement drawn on this plate is also a `<th>` in
 * the table two elements down and a `<h2>` in the reading below it, so this
 * subtree is `aria-hidden` and `role="presentation"` and loses nothing when it
 * is removed — which is exactly what print does to it.
 *
 * ── Why the drawing is split in two ─────────────────────────────────────────
 * The geometry is one `<svg preserveAspectRatio="none">` stretched to the
 * plate's box, so a 390×120 strip and a 900×900 elevation are the same drawing
 * at two aspect ratios rather than two drawings. Every stroke in it carries
 * `vector-effect="non-scaling-stroke"`, which is what keeps the hairline exactly
 * 1px at both — and 1px everywhere is this world's entire discipline: *every
 * rule is 1px, never 2px; a blueprint reads through consistency of stroke and a
 * single 2px line breaks it.*
 *
 * Type and glyphs are NOT in that SVG, because non-uniform scaling would squash
 * them. They are HTML positioned in percentages of the same coordinate space,
 * and the glyphs are fixed-size `<svg><use href="#…"/></svg>` instances of
 * symbols defined once. That indirection buys the world's best joke: the gate at
 * `crossing` and the gate at `return` are not similar drawings, they are the
 * SAME `<symbol>` referenced twice, and the reader recognises the shape before
 * they read the year.
 *
 * ── Motion: one scroll timeline, zero frame loops ───────────────────────────
 * Both traces are drawn by `stroke-dashoffset` against one registered
 * `@property --xp-ghost-p` bound to `animation-timeline: scroll(root block)` in
 * `experiences.css`. `pathLength="1000"` normalises both paths, so the CSS needs
 * no measured length and cannot go stale when a date changes. The property's
 * initial value is **1** — fully drawn — so the resting frame with no timeline
 * support, no JavaScript, and under `prefers-reduced-motion` is the FINAL state,
 * which is the rule that makes a scroll-linked stage safe to ship.
 */
import type { CSSProperties } from 'react';
import type { NarrativeTier } from '../types';
import type { Gate, Plate as PlateData } from './geometry';

interface PlateProps {
    plate: PlateData;
    tier: NarrativeTier;
    /** How many annotation lines the margin can hold: 1 / 2 / 3. */
    density: number;
    /** The chapter the reader is inside, or `null` before the first observation. */
    activeGate: string | null;
}

/** View units → a percentage of the plate's box. Both axes, one function. */
function pct(value: number, view: number): string {
    return `${(value / view) * 100}%`;
}

/**
 * The gate glyphs, defined once and referenced by `<use>`.
 *
 * Five glyphs, and colour is never the sole carrier of which one you are looking
 * at: each has a distinct silhouette, each gate also carries an ordinal, and
 * each sits at a fixed position on an axis. That is the §2.4 rule — a stage must
 * stay readable in greyscale, in print, in forced-colors, and for the ~8% of
 * male readers with red-green deficiency.
 */
function GateSymbols() {
    return (
        <svg aria-hidden focusable="false" width={0} height={0} style={{ position: 'absolute' }}>
            <defs>
                {/* A plain checkpoint: a hairline node on the rule. */}
                <symbol id="xp-ghost-gate-plain" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4.5" fill="none" strokeWidth="1" />
                </symbol>
                {/* THE Curam gate. Drawn at `crossing`, drawn again — the same
                    symbol, not a copy of it — at `return`. */}
                <symbol id="xp-ghost-gate-curam" viewBox="0 0 20 20">
                    <path d="M10 2.5 L17.5 10 L10 17.5 L2.5 10 Z" fill="none" strokeWidth="1" />
                    <path d="M10 6.5 L13.5 10 L10 13.5 L6.5 10 Z" fill="none" strokeWidth="1" />
                </symbol>
                {/* The multi-lane section opens here. */}
                <symbol id="xp-ghost-gate-lane" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4.5" fill="none" strokeWidth="1" />
                    <path d="M2 10 H5.5 M14.5 10 H18 M10 2 V5.5 M10 14.5 V18" strokeWidth="1" />
                </symbol>
                {/* The position tick. The one warm mark on a cold plate. */}
                <symbol id="xp-ghost-gate-here" viewBox="0 0 20 20">
                    <path d="M10 3 L15 12 L5 12 Z" fill="none" strokeWidth="1" />
                    <path d="M10 12 V17" strokeWidth="1" />
                </symbol>
                {/* The finish rule. */}
                <symbol id="xp-ghost-gate-finish" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4.5" fill="none" strokeWidth="1" />
                    <path d="M10 1 V19" strokeWidth="1" />
                </symbol>
            </defs>
        </svg>
    );
}

/**
 * One gate's annotation stack, in the dimension-line register a schematic labels
 * tolerances in.
 *
 * `density` decides how many lines the margin can hold — 1 / 2 / 3 by tier,
 * declared once in `plate-data.ts` and published to `--xp-density`. This is the
 * whole reason `density` is a number in config rather than a media query
 * somebody has to find: the same drawing gets terser, not smaller.
 */
function GateAnnotation({
    gate,
    view,
    density,
    active,
    reference,
}: {
    gate: Gate;
    view: number;
    density: number;
    active: boolean;
    reference: number | null;
}) {
    const glyph =
        gate.symbol === 'curam'
            ? 'xp-ghost-gate-curam'
            : gate.symbol === 'lane'
                ? 'xp-ghost-gate-lane'
                : gate.symbol === 'here'
                    ? 'xp-ghost-gate-here'
                    : gate.symbol === 'finish'
                        ? 'xp-ghost-gate-finish'
                        : 'xp-ghost-gate-plain';

    // The gap between the two traces at this gate, as a drawn dimension. It is
    // rendered at every tier and in every motion state, which is what makes the
    // reduced-motion telling complete rather than merely still: the ghost
    // survives as a MEASUREMENT with a number on it, not as an animation.
    const gapTop = Math.min(gate.y, gate.ghostY);
    const gapHeight = Math.abs(gate.ghostY - gate.y);

    return (
        <div
            className="xp-ghost-gate"
            data-gate={gate.id}
            data-symbol={gate.symbol}
            data-active={active ? '' : undefined}
            data-echo={gate.echoes ? '' : undefined}
            style={
                {
                    left: pct(gate.x, view),
                    '--ghost-gate-top': pct(gate.y, view),
                    // The ramp, by position in the arc. Nine chapters over seven
                    // stops, so the last three share the brightest — and colour
                    // is never the sole carrier: the ordinal, the fixed position
                    // and the distinct glyph all say the same thing.
                    '--ghost-stage': `var(--xp-stage-${Math.min(gate.index + 1, 7)})`,
                } as CSSProperties
            }
        >
            <span className="xp-ghost-gate-glyph">
                <svg viewBox="0 0 20 20" aria-hidden focusable="false">
                    <use href={`#${glyph}`} />
                </svg>
            </span>

            {gapHeight > 0 && (
                <span
                    className="xp-ghost-dim"
                    style={{ top: pct(gapTop, view), height: pct(gapHeight, view) }}
                >
                    {density >= 2 && gate.fromReference !== null && (
                        <span className="xp-ghost-dim-value xp-tnum">{`+${gate.fromReference}`}</span>
                    )}
                </span>
            )}

            <span className="xp-ghost-gate-stack">
                <span className="xp-ghost-gate-ordinal xp-tnum">{gate.ordinal}</span>
                <span className="xp-ghost-gate-year xp-tnum">{gate.year ?? '—'}</span>
                {density >= 2 && <span className="xp-ghost-gate-label">{gate.label}</span>}
                {density >= 3 && <span className="xp-ghost-gate-signal">{gate.signal}</span>}
                {density >= 3 && gate.fromReference !== null && reference !== null && (
                    <span className="xp-ghost-gate-ref xp-tnum">
                        {`REF ${reference} +${gate.fromReference}`}
                    </span>
                )}
            </span>
        </div>
    );
}

export default function Plate({ plate, tier, density, activeGate }: PlateProps) {
    const { view, gates, baselineY, finishX, lanes } = plate;

    return (
        <div
            className="xp-plane-stage xp-ghost-plate"
            aria-hidden="true"
            role="presentation"
            data-tier={tier}
            data-lanes={activeGate === 'scale' ? 'on' : undefined}
            data-peak={activeGate === 'return' ? 'on' : undefined}
        >
            <GateSymbols />

            <svg
                className="xp-ghost-drawing"
                viewBox={plate.viewBox}
                preserveAspectRatio="none"
                aria-hidden
                focusable="false"
            >
                {/* The start line — the datum every altitude on this plate is
                    measured from, and the altitude the reference run stands at
                    when the live trace crosses the finish. */}
                <line
                    className="xp-ghost-baseline"
                    x1={0}
                    y1={baselineY}
                    x2={view}
                    y2={baselineY}
                    vectorEffect="non-scaling-stroke"
                />

                {/* The multi-lane section: forty hairlines, one gate wide, and
                    the only place in the world anything loops. Suppressed unless
                    the reader is in that chapter (`data-lanes`), so the ambient
                    is absent from every screen that is not about it. */}
                <g className="xp-ghost-lanes">
                    {lanes.xs.map((x) => (
                        <line
                            key={x}
                            x1={x}
                            y1={0}
                            x2={x}
                            y2={baselineY}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </g>

                {/* Checkpoint gates as thin vertical rules. Drawn before the
                    traces so a trace always passes in front of its own gate. */}
                <g className="xp-ghost-rules">
                    {gates.map((gate) => (
                        <line
                            key={gate.id}
                            className="xp-ghost-rule"
                            data-active={gate.id === activeGate ? '' : undefined}
                            x1={gate.x}
                            y1={0}
                            x2={gate.x}
                            y2={baselineY}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    <line
                        className="xp-ghost-finish"
                        x1={finishX}
                        y1={0}
                        x2={finishX}
                        y2={baselineY}
                        vectorEffect="non-scaling-stroke"
                    />
                </g>

                {/* The whole track, drawn ahead at low alpha and never revealed
                    — you can read every gate before you move, which is the one
                    thing a progress affordance drawn as a picture usually gets
                    wrong. Two static strokes, one per trace, and neither is
                    bound to the timeline. */}
                <path
                    className="xp-ghost-trace xp-ghost-trace-ahead"
                    d={plate.livePath}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />

                {/* THE REFERENCE RUN. `--xp-text` at 0.38 alpha and never a
                    colour of its own, so it can never fight the live trace for
                    attention — and its trailing stroke is the same path again at
                    a lower alpha, not a second shape to keep in sync. */}
                <path
                    className="xp-ghost-trace xp-ghost-trace-trail"
                    d={plate.ghostPath}
                    pathLength={1000}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
                <path
                    className="xp-ghost-trace xp-ghost-trace-ghost xp-scroll-linked"
                    d={plate.ghostPath}
                    pathLength={1000}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />

                {/* The live trace. One hairline, full opacity, the only lit line
                    on the plate. */}
                <path
                    className="xp-ghost-trace xp-ghost-trace-live xp-scroll-linked"
                    d={plate.livePath}
                    pathLength={1000}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            <div className="xp-ghost-annotations">
                {gates.map((gate) => (
                    <GateAnnotation
                        key={gate.id}
                        gate={gate}
                        view={view}
                        density={density}
                        active={gate.id === activeGate}
                        reference={plate.reference.fromYear}
                    />
                ))}
            </div>
        </div>
    );
}
