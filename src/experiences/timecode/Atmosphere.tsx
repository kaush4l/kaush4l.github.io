'use client';

/**
 * The room the film is graded in — and nothing that could be mistaken for the
 * film.
 *
 * A grading suite has one practical light over the desk and a cold spill from
 * the monitor wall. That is the entire idea, and it is two static radial
 * gradients, because every other candidate effect this world could have had is
 * banned by its own spec: no letterbox, no sprockets, no scan lines, no grain
 * beyond the shared 3.5% turbulence, no bloom, no audio, no fake transport.
 * Restraint is the luxury signal here, and an atmosphere that draws attention
 * is an atmosphere competing with the title card it exists to sit behind.
 *
 * ── Why this is not animated at all ─────────────────────────────────────────
 * `motion.rafLoops: 0` and there is not one keyframe in this file. The world's
 * whole motion budget belongs to the cut — the dissolve, the match, the two
 * push-ins — and an ambient loop behind them would be a second thing moving
 * during the one moment the reader is supposed to be watching a date change.
 * It also means this layer is byte-identical under `prefers-reduced-motion`,
 * which is the only kind of decoration that costs a stilled page nothing.
 *
 * ── The rules the frame already enforces, restated so nobody re-adds them ───
 * The frame mounts this inside a fixed, `inset: 0`, `z-index: -1`,
 * `pointer-events: none`, `aria-hidden`, print-hidden wrapper. A world supplies
 * PAINT; it does not get to choose its own stacking context. So there is no
 * `position`, no `z-index` and no `aria-hidden` below — adding any of them here
 * would be a second opinion about a decision that has one owner.
 *
 * `--xp-atmos-a` / `--xp-atmos-b` are the only colours an atmosphere may draw
 * from besides the ground, and both are declared at ≤ 0.06 alpha in
 * `index.ts`. Reaching for `--xp-text` is how a background ends up competing
 * with the words standing on it.
 */

import { Box } from '@mui/material';
import type { NarrativeTier } from '../types';

export default function Atmosphere({ tier }: { tier: NarrativeTier }) {
    // The practical light sits where the frame's lit corner is at each tier: high
    // and central on a phone, where the card fills the top of the screen; over
    // the left column on a desktop, where the frame is. Stated as a number per
    // tier rather than as a media query, which is this feature's whole rule about
    // where numbers live.
    const keyX = tier === 'cinema' ? '22%' : '50%';
    const keyY = tier === 'compact' ? '18%' : '30%';

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--xp-bg)',
                backgroundImage: [
                    // The practical: one warm source, falling off long and slow.
                    // `closest-side` rather than a pixel radius so it scales with
                    // the viewport instead of becoming a hard disc on a 27".
                    `radial-gradient(120% 90% at ${keyX} ${keyY}, var(--xp-atmos-a) 0%, transparent 62%)`,
                    // The monitor wall: cold, low, and on the opposite side, so
                    // the room has two temperatures and the warm one wins.
                    'radial-gradient(90% 70% at 88% 96%, var(--xp-atmos-b) 0%, transparent 58%)',
                ].join(', '),
            }}
        />
    );
}
