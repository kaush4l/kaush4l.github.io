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
/**
 * The deepest-but-shallowest node that looks like a list: the first element in
 * a breadth-first walk with at least `min` element children.
 *
 * Sections here are `heading + wrapper + list`, and the list's depth differs by
 * layout (a grid, a timeline, a stack), so it cannot be addressed by a fixed
 * path. Breadth-first means the outermost qualifying group wins — the cards
 * themselves, not the rows inside one card.
 */
function findRepeatingGroup(root: Element, min = 3, maxDepth = 5): Element | null {
    // SHALLOWEST qualifying group wins, and `min` is 3.
    //
    // Both alternatives were tried and both pick the wrong node. Taking the
    // biggest group anywhere descends past the five skill CARDS into the twelve
    // chips inside one of them. Dropping `min` to 2 stops at an anonymous
    // two-element layout wrapper before reaching any list at all. The entries a
    // reader perceives are the outermost run of three-or-more matching
    // siblings — which is exactly this walk.
    let frontier: Element[] = [root];

    for (let depth = 0; depth < maxDepth && frontier.length; depth += 1) {
        for (const node of frontier) {
            if (node.childElementCount >= min && isHomogeneous(node)) return node;
        }
        frontier = frontier.flatMap((n) => Array.from(n.children));
    }
    return null;
}

/**
 * A "repeating group" means siblings that are the same KIND of thing.
 *
 * Counting children alone picked the wrong node twice: the Contact section has
 * three children — a heading, an intro paragraph and the card row — so the
 * stagger animated `heading → paragraph → all three cards at once`, and the
 * three cards, the actual list, never cascaded. Requiring the children to
 * agree on tag and class finds the list rather than the section.
 */
function isHomogeneous(node: Element): boolean {
    const kids = Array.from(node.children);
    // Tag plus the FIRST class only. Comparing the whole class string was too
    // strict for the one grid that most wanted a cascade: the project cards are
    // siblings that differ by a span modifier (`MuiGrid-grid-md-8` vs `-4`), so
    // a full-string match rejected them and four cards arrived as one block.
    const signature = (el: Element) => `${el.tagName}:${el.classList[0] ?? ''}`;
    const first = signature(kids[0]);
    return kids.every((k) => signature(k) === first);
}

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

        // Index the section's REPEATING GROUP so it cascades rather than
        // arriving as one block.
        //
        // Walking a fixed number of levels down finds the wrong thing: the
        // first two levels are anonymous layout wrappers (a heading box and a
        // body box), so indexing them staggered exactly two elements by 55ms —
        // measurably nothing. Descend instead until a node has enough element
        // children to be the actual list (the cards, the timeline entries), and
        // stagger those.
        const group = findRepeatingGroup(el);
        if (group) {
            group.classList.add('reveal-group');
            Array.from(group.children).forEach((child, i) => {
                // Capped at 8: past that the tail outlasts the reader, and the
                // last card is still fading in after they have scrolled by.
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
