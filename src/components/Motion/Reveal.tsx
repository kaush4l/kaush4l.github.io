'use client';

import { useEffect, useRef } from 'react';
import { onFirstVisible, prefersReducedMotion } from '@/lib/motion';

/**
 * Scroll entrance for a page section.
 *
 * ── Why this is CSS classes and not an animation library ────────────────────
 * There are ~6 of these on the page and each one plays exactly once. A class
 * flip driving a `transform`/`opacity` transition runs entirely on the
 * compositor and costs no JS per frame; an animation instance per section would
 * cost six. `anime.js` earns its place on the hero, where the choreography is
 * a real timeline. Here it would be ceremony.
 *
 * ── Why the hidden state is applied in an effect ────────────────────────────
 * `is-armed` (the hidden state) is added by JS *after* mount. So the static
 * export's HTML — what a crawler, a reader-mode extension, or a visitor with a
 * failed JS bundle sees — contains fully-opaque content. Content that is
 * invisible until JS proves otherwise is the single most common way a
 * scroll-reveal turns into a blank page.
 *
 * `is-done` drops `will-change` once the section has arrived, so a long page
 * does not hold a compositor layer open for every section it has already shown.
 */
export default function Reveal({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    /** Milliseconds of hold before this section starts, for a staggered group. */
    delay?: number;
}) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        // If it is already on screen at mount (above the fold on a short
        // viewport), arming it would hide content the visitor can already see
        // and then fade it back in — a flash, not an entrance.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) return;

        el.classList.add('is-armed');
        if (delay) el.style.transitionDelay = `${delay}ms`;

        // Index the section's own children so they cascade rather than arriving
        // as one block. Capped at 8: past that the tail is longer than the
        // reader's patience, and the last card would still be fading in after
        // they have scrolled past it.
        const inner = el.firstElementChild;
        if (inner) {
            Array.from(inner.children).forEach((child, i) => {
                (child as HTMLElement).style.setProperty('--i', String(Math.min(i, 8)));
            });
        }

        let timer = 0;
        const disarm = onFirstVisible(el, () => {
            el.classList.add('is-in');
            // 700ms transition + the hold; then release the compositor hint.
            timer = window.setTimeout(() => el.classList.add('is-done'), 760 + delay);
        });

        return () => {
            disarm();
            window.clearTimeout(timer);
            el.classList.remove('is-armed');
            el.style.transitionDelay = '';
        };
    }, [delay]);

    return (
        <div ref={ref} className="reveal">
            {children}
        </div>
    );
}
