'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * The light follows the cursor across any surface marked `data-glow`.
 *
 * ── Why this is one component and not a hook per card ───────────────────────
 * There are ~15 glowing surfaces on the page. Fifteen components each with
 * their own `pointermove` listener and their own React state is fifteen
 * subscriptions and fifteen re-renders per mouse move. This is ONE passive
 * listener on the document that walks up from the event target, and it writes
 * the position straight to CSS custom properties — so the glow never passes
 * through React at all, and moving the mouse re-renders nothing.
 *
 * Writes are coalesced to one per animation frame: `pointermove` can fire
 * faster than the display refreshes, and every extra write is a style
 * invalidation nobody sees.
 *
 * The effect itself is drawn in `cinema.css` off `--gx`/`--gy`. This file only
 * reports where the pointer is; it has no opinion about what that looks like,
 * which is why coder mode can make the same signal much brighter.
 */
export default function PointerGlow() {
    useEffect(() => {
        if (prefersReducedMotion()) return;
        // A glow that tracks a cursor is meaningless without a cursor, and on
        // touch it would fire on every tap and then freeze mid-card.
        if (!window.matchMedia('(pointer: fine)').matches) return;

        let frame = 0;
        let pending: { el: HTMLElement; x: number; y: number } | null = null;
        let active: HTMLElement | null = null;

        const flush = () => {
            frame = 0;
            if (!pending) return;
            const { el, x, y } = pending;
            pending = null;
            el.style.setProperty('--gx', `${x}px`);
            el.style.setProperty('--gy', `${y}px`);
        };

        const onMove = (event: PointerEvent) => {
            const target = event.target as Element | null;
            const surface = target?.closest<HTMLElement>('[data-glow]') ?? null;

            // Left the previous surface: stop lighting it, so a card the cursor
            // has abandoned does not keep a stale hotspot burned into its edge.
            if (active && active !== surface) {
                active.style.removeProperty('--gx');
                active.style.removeProperty('--gy');
            }
            active = surface;
            if (!surface) return;

            const rect = surface.getBoundingClientRect();
            pending = {
                el: surface,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            if (!frame) frame = requestAnimationFrame(flush);
        };

        document.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            document.removeEventListener('pointermove', onMove);
            if (frame) cancelAnimationFrame(frame);
            active?.style.removeProperty('--gx');
            active?.style.removeProperty('--gy');
        };
    }, []);

    return null;
}
