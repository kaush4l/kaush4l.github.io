'use client';

/**
 * TRUNK's Stage — the two-plane layout, and nothing else.
 *
 * ── Why this file exists at all, and why it is this short ───────────────────
 * The shared `Stage` is a complete, readable, correctly-graded telling: it owns
 * the nine chapters, the beats, the heading outline, the `<nav><ol>` of employer
 * names, the keyboard ladder, the live region, focus management on chapter
 * change, the print structure and the deep-link hashes. Re-implementing any of
 * that here would not make this world more itself; it would make it a second
 * copy of the engine that drifts.
 *
 * So this Stage adds exactly one thing the shared one cannot express: **a second
 * plane**. Two-plane law (§2.1) — a full-height sticky graph beside a flow — is
 * geometry, not configuration, and it is the one place Trunk genuinely differs.
 * Everything else this world says it says through `index.ts`: the palette, the
 * ramp, the near-flat 1.125 display ladder, the nine branch columns, the nine
 * chapter narrations, the three tellings.
 *
 * ── Why the shared Stage is COMPOSED and not forked ─────────────────────────
 * It is imported and rendered as a child. That keeps one implementation of the
 * heading outline and one implementation of the keyboard ladder in the repo, and
 * it means every fix to the engine reaches this world without anybody
 * remembering to port it. A fork would have made this world's accessibility a
 * separate thing to test, which is the failure mode that produces four worlds
 * that pass QA and one that does not.
 *
 * ── Why this is imported STATICALLY from `index.ts` ─────────────────────────
 * The E1 rule is `dynamic(..., { ssr: false })` for anything with a motion
 * timeline. Trunk's timeline is entirely CSS — one `@property` on one `scroll()`
 * timeline — so there is no client-only code here to defer, and deferring would
 * export a page whose whole story arrives a paint late: invisible to a crawler,
 * invisible with JS off. The rule is about JS timelines; this world has none.
 */
import { Box } from '@mui/material';
import { useMemo } from 'react';
import SharedStage from '../Stage';
import type { ChapterId, StageProps } from '../types';
import { TRUNK_BRANCHES } from './branches';
import { buildDag } from './dag';
import TrunkGraph, { TRUNK_LANES } from './Graph';

/**
 * How tall the whole graph is, in px, as a function of how much career there is.
 *
 * A constant would be wrong in both directions: too short and 24 commits stack
 * into an unreadable smear, too tall and the camera crawls. The floor keeps the
 * graph taller than any viewport it will be panned inside, which is what makes
 * the pan a pan rather than a jitter.
 */
function graphHeight(beats: number): number {
    return Math.max(1700, 420 + beats * 88);
}

/**
 * The gap between the graph column and the flow.
 *
 * Deliberately NOT `--xp-gutter`: the flow already pads itself by that token, so
 * reusing it here would double the inset at exactly the width — 390px — where
 * there is least of it to spend.
 */
const COLUMN_GAP = 0;

export default function TrunkStage({ story, tier, reduceMotion }: StageProps) {
    const geo = TRUNK_LANES[tier];

    /**
     * The graph, built once per tier from the resolved spine.
     *
     * `story.spine.chapters` carries `arcStart`/`arcEnd` — the spine's own
     * weight prefix-sums — so the picture is paced by the same numbers the prose
     * is. Nothing here reads the DOM, so this is as valid during the static
     * render as it is after hydration, and the whole DAG ships in the exported
     * HTML.
     */
    const dag = useMemo(
        () =>
            buildDag(
                story.spine.chapters,
                story.beats,
                (id: ChapterId) => TRUNK_BRANCHES[id],
                {
                    lanes: geo.lanes,
                    lane: geo.lane,
                    margin: geo.margin,
                    height: graphHeight(story.beats.length),
                },
            ),
        [story.spine.chapters, story.beats, geo],
    );

    return (
        <Box
            data-xp-trunk=""
            sx={{
                display: 'grid',
                // `auto` for the graph so the column is exactly as wide as the
                // SVG it holds; `minmax(0, 1fr)` for the flow because an
                // intrinsic minimum is how a grid child overflows its container,
                // and horizontal overflow on `body` is a QA failure rather than
                // a cosmetic one.
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                columnGap: `${COLUMN_GAP}px`,
                alignItems: 'stretch',
            }}
        >
            <TrunkGraph dag={dag} tier={tier} />
            <SharedStage story={story} tier={tier} reduceMotion={reduceMotion} />
        </Box>
    );
}
