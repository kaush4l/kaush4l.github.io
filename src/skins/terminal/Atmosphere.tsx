'use client';

import { useModelContext } from '@/context/ModelContext';

/**
 * TERMINAL — the atmosphere.
 *
 * ── Why there is no loop in here ────────────────────────────────────────────
 * The contract bans infinite motion in the reader's periphery, and it is right
 * to: a résumé is read, and anything drifting behind the text competes with the
 * reading. So this layer paints and then stops. It is three static washes —
 * a character-cell grid, a cool key from the upper right, and a vignette —
 * costing zero frames and zero canvases.
 *
 * The one thing that changes does so because the MACHINE changed, not because a
 * timer fired: `data-state` carries the on-device model's real state, and the
 * grid's presence steps up by a few percent while weights are streaming, then
 * settles. It is the same signal the FAB's halo already encodes (`coder.css`
 * reads `data-model-state`), so this is a second channel on one truth rather
 * than a second truth — and it is a slow opacity crossfade on one element, not
 * an animation.
 *
 * Deleting this component costs the page some depth. It costs it no structure,
 * no boundary and no state: every one of those is carried elsewhere.
 */
export default function TerminalAtmosphere() {
    const { llm } = useModelContext();
    const state = llm.error ? 'error' : llm.loading ? 'loading' : llm.ready ? 'ready' : 'idle';

    return (
        <div className="tm-atmos" data-state={state}>
            <div className="tm-atmos-key" />
            <div className="tm-atmos-grid" />
            <div className="tm-atmos-vignette" />
        </div>
    );
}
