'use client';

/**
 * The sky the map is lit against.
 *
 * Overworld is one of the two worlds that supply an `Atmosphere`, and what it
 * supplies is deliberately the least interesting thing on the page: two washes
 * and a gradient. The map is drawn art with a route and nine stations; if the
 * layer BEHIND it also had ideas, the two would compete and the reader would be
 * looking at a picture instead of reading a career.
 *
 * ── Why the sky is here and not in the map ──────────────────────────────────
 * The map is `.xp-plane-stage` — sticky, 38vw at cinema, absent at compact.
 * The sky has to be behind the FLOW too, or a dark navy column would end where
 * the map ends and the page would visibly have two grounds. The frame's
 * atmosphere slot is fixed at `inset: 0` behind everything, which is exactly
 * the shape of a sky.
 *
 * ── What it is allowed to draw from ─────────────────────────────────────────
 * `--xp-atmos-a`, `--xp-atmos-b`, the ground tokens, and `--xp-accent` at ≤0.35
 * alpha. Never `--xp-text`: decoration that reaches for the text token is how a
 * background ends up competing with the words standing on it. The two atmos
 * tokens are declared as `rgba()` in `index.ts` at 6% and 4% precisely so the
 * composite is computable rather than a `color-mix` nobody measured — the sky
 * behind body text resolves to a measured 14.13:1 for `--xp-text` and 6.36:1
 * for `--xp-text-muted`.
 *
 * ── Motion ──────────────────────────────────────────────────────────────────
 * None. Not "stopped under reduced motion" — none at all, in any state. The
 * world's whole motion budget is one scroll-linked custom property on the map,
 * and an ambient loop on a full-viewport layer sitting under every word of the
 * résumé is the single change most likely to make the page uncomfortable to
 * read. It is also `aria-hidden` and print-hidden by the frame, so nothing here
 * has to remember to remove itself.
 */

import { Box } from '@mui/material';
import type { NarrativeTier } from '../types';

export default function OverworldAtmosphere({ tier }: { tier: NarrativeTier }) {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                // The sky: deepest at the top, where the map's far ridge sits,
                // opening toward the ground the flow stands on. One gradient,
                // both stops from the world's own declared ground.
                backgroundImage: `
                    radial-gradient(
                        120% 60% at 78% 0%,
                        var(--xp-atmos-a) 0%,
                        transparent 62%
                    ),
                    linear-gradient(
                        to bottom,
                        var(--xp-bg-alt) 0%,
                        var(--xp-bg) 46%,
                        var(--xp-bg) 100%
                    )
                `,
            }}
        >
            {/* The cool counterweight. A warm light needs a cool ground to be
                warm against, and this is that ground stated as light rather than
                as paint — 4% of the counter hue, low and wide, so the bottom of
                the page reads as distance rather than as a second colour.
                Suppressed at compact: at 390px the whole sky is one screenful
                and a second wash is just a muddier ground. */}
            {tier !== 'compact' && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                            radial-gradient(
                                90% 50% at 12% 100%,
                                var(--xp-atmos-b) 0%,
                                transparent 70%
                            )
                        `,
                    }}
                />
            )}
        </Box>
    );
}
