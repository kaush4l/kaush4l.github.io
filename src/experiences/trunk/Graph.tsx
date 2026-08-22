'use client';

/**
 * The graph plane — `.xp-plane-stage` in this world's language.
 *
 * Two-plane law (CREATIVE-SPEC §2.1): this is the STAGE. It is full-height,
 * sticky, `aria-hidden`, `role="presentation"`, and it carries **no fact that is
 * not also in the flow beside it**. Every label it draws — branch name, hash,
 * the two tags — is either a content slug, a hash of a beat id, or a word from
 * `content/`; there is no sentence in this component and there is no commit
 * message anywhere in this world. That is not modesty, it is the credibility
 * play: an engineer spots a fake DAG instantly and the respect inverts, so this
 * world is exact or it is not shipped.
 *
 * ── Why there is no hex literal in this file ────────────────────────────────
 * CREATIVE-SPEC §5.2 bans `/#[0-9a-fA-F]{3,8}\b/` everywhere under
 * `src/experiences/**` except a world's own `index.ts`. Every colour here is a
 * `var(--xp-*)`, which is what makes forced-colors, print and `prefers-contrast`
 * work on this graph without a single extra rule: the four media queries in
 * `experiences.css` rewrite the tokens and this component never notices.
 *
 * ── Why there is no rAF, no canvas and no `getTotalLength()` ────────────────
 * `pathLength="1"` normalises every stroke's dash arithmetic to 0 → 1, so the
 * draw is `stroke-dashoffset: calc(1 - var(--xp-trunk-walk))` and nothing has to
 * measure anything. One registered `@property` on one `scroll()` timeline feeds
 * the camera pan, the walked trunk, the cherry-pick arc and every node's
 * emission through `calc()` — one timeline, five consumers, zero JS
 * (CREATIVE-SPEC §4.2, and `motion.rafLoops: 0` says so in the config).
 */
import type { CSSProperties } from 'react';
import type { NarrativeTier } from '../types';
import type { TrunkDag } from './dag';

/**
 * The lane geometry each tier draws, as data.
 *
 * Three genuinely different drawings of one graph, never one drawing with lanes
 * hidden. At compact every branch collapses onto a single 1px spine — which is
 * precisely what `git log --graph` looks like in a narrow terminal, and is
 * therefore the honest telling rather than a compromise. The node count, the
 * hash of each node, the two tags and the cherry-pick arc are identical at all
 * three widths; only the horizontal spread and the labels change.
 *
 * It is a lookup and not a base-plus-override for the reason M25 gives about
 * light mode: a base with overrides makes the small one "the big one minus
 * things", which is the exact failure charter non-negotiable 4 forbids.
 */
export const TRUNK_LANES: Readonly<Record<NarrativeTier, {
    lanes: number;
    lane: number;
    margin: number;
    /** Width of the label gutter to the right of the outermost lane. */
    label: number;
    /** Parallax travel in px for the unwalked plane. 0 at compact (§2.3). */
    parallax: number;
}>> = {
    compact: { lanes: 1, lane: 30, margin: 22, label: 0, parallax: 0 },
    medium: { lanes: 3, lane: 34, margin: 24, label: 0, parallax: 48 },
    cinema: { lanes: 5, lane: 44, margin: 26, label: 196, parallax: 120 },
};

export default function TrunkGraph({ dag, tier }: { dag: TrunkDag; tier: NarrativeTier }) {
    const geo = TRUNK_LANES[tier];
    const width = dag.width + geo.label;
    const labels = geo.label > 0;

    return (
        <div
            className="xp-plane-stage xp-trunk-pane"
            aria-hidden
            role="presentation"
            // `--xp-trunk-eye` is where the reading-line bloom sits: the trunk
            // lane, in the pane's own coordinates. Published from here because
            // it is the same number `TRUNK_LANES` already states, and stating it
            // twice — once here, once in CSS — is how a lane and its glow drift.
            style={{ width, minWidth: width, '--xp-trunk-eye': `${geo.margin}px` } as CSSProperties}
        >
            {/* The window the camera pans behind. `overflow: clip` rather than
                `hidden` for the reason SkinAtmosphere documents: an overhanging
                decorative layer still contributes to the document's scroll width
                under `hidden`, and iOS Safari renders that as real horizontal
                scroll. Under reduced motion the pane goes `height: auto` and this
                stops clipping anything — the whole DAG simply stands still. */}
            <div className="xp-trunk-window">
                {/* The one lit element in the world: a 32px radial bloom on the
                    reading line, which the graph pans BENEATH. It is a resting
                    opacity multiplied by `--xp-glow-strength`, never an animated
                    `box-shadow` and never a per-node shadow, so print, reduced
                    motion and forced-colors extinguish it from one declaration
                    and this component needs no branch for any of them. */}
                <div className="xp-trunk-bloom" />

                <svg
                    className="xp-trunk-graph xp-scroll-linked"
                    width={width}
                    height={dag.height}
                    viewBox={`0 0 ${width} ${dag.height}`}
                    // Rendered 1:1 — the viewBox and the attribute sizes agree —
                    // so a 1px hairline is one device-independent pixel and a
                    // node is a circle rather than an ellipse. A stretched
                    // viewBox is how hand-rolled SVG graphs end up with 0.6px
                    // strokes that vanish on Android.
                    style={{
                        '--xp-trunk-h': `${dag.height}px`,
                        '--xp-trunk-at': dag.arcAt,
                        '--xp-trunk-para': `${geo.parallax}px`,
                    } as CSSProperties}
                >
                    {/* PLANE 0.16 — the graph that has not been walked yet.
                        A hairline at 34%, per the palette contract: only the
                        walked path emits. */}
                    <g className="xp-trunk-future">
                        {dag.edges.map((edge) => (
                            <path
                                key={edge.id}
                                d={edge.d}
                                className={
                                    'xp-trunk-edge'
                                    + (edge.lit ? ' is-lit' : '')
                                    + (edge.quiet ? ' is-quiet' : '')
                                    + (edge.ornament ? ' is-ornament' : '')
                                }
                            />
                        ))}
                    </g>

                    {/* PLANE 0.08 — the history the reader has actually walked,
                        drawn over the dim copy of the same trunk. `pathLength=1`
                        makes the dash arithmetic unit-free. */}
                    <path className="xp-trunk-walked" d={dag.spine} pathLength={1} />

                    {/* THE PEAK, and the only amber in the world.
                        `dag.arc` exists because the SPINE declares `echoes` on
                        one chapter; nothing in this world names that chapter.
                        Delete the field and the arc disappears with it — which is
                        the test that this is one rendered field and not bespoke
                        peak code. */}
                    {dag.arc && <path className="xp-trunk-pick" d={dag.arc} pathLength={1} />}

                    {/* PLANE 0 — the commits. */}
                    <g className="xp-trunk-nodes">
                        {dag.nodes.map((node) => (
                            <g
                                key={node.id}
                                className={
                                    'xp-trunk-node'
                                    + (node.lead ? ' is-lead' : '')
                                    + (node.quiet ? ' is-quiet' : '')
                                    + (node.head ? ' is-head' : '')
                                }
                                style={{ '--xp-trunk-t': node.t } as CSSProperties}
                            >
                                <circle cx={node.x} cy={node.y} r={node.r} />
                                {labels && node.lead && (
                                    <text
                                        className="xp-trunk-hash"
                                        x={dag.width}
                                        y={node.y - 5}
                                    >
                                        {node.hash}
                                    </text>
                                )}
                                {labels && node.lead && node.meta && (
                                    <text
                                        className="xp-trunk-meta"
                                        x={dag.width}
                                        y={node.y + 9}
                                    >
                                        {node.meta}
                                    </text>
                                )}
                                {node.tag && (
                                    <text
                                        className="xp-trunk-tag"
                                        x={node.x + node.r + 6}
                                        y={node.y + 4}
                                    >
                                        {node.tag}
                                    </text>
                                )}
                            </g>
                        ))}
                    </g>

                    {/* Branch names, at the fork. The rail beside the story is
                        the real navigable list of these (a `<nav><ol>` of
                        employers, supplied by the shared chrome and never
                        restyled here); this is the same set as a slug, drawn on
                        the graph where an engineer expects to read it. */}
                    {labels && dag.branches.map((branch) => (
                        <text
                            key={branch.id}
                            className={'xp-trunk-branch' + (branch.lit ? ' is-lit' : '')}
                            x={branch.x + 12}
                            y={branch.y - 12}
                        >
                            {branch.name}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
}
