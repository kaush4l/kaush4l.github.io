'use client';

import { useEffect } from 'react';
import { reduceMotion } from './Nav';

/**
 * The page's one motion engine, wired by data attributes so sections stay
 * server components:
 *  - [data-reveal]          spring in (translate + blur + opacity) when seen;
 *    [data-reveal=stagger]  staggers its direct children instead.
 *  - [data-scrub]           heading scale/fade with scroll (JS fallback when
 *                           CSS `animation-timeline: view()` is unsupported).
 *  - [data-timeline]        `--hm-tl` 0..1 fills the experience rail.
 *  - [data-tilt]            ≤6° tilt + specular highlight (hover devices only).
 *  - [data-magnet]          chips lean toward the pointer.
 * Everything no-ops under reduced motion; content is visible without JS.
 */
export default function Motion() {
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.hm');
        if (!root) return;
        const still = reduceMotion();
        const cleanups: (() => void)[] = [];

        // Reveal — one shared observer.
        const reveal = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (still) {
            reveal.forEach((el) => el.setAttribute('data-shown', ''));
        } else {
            root.setAttribute('data-motion', '');
            reveal.forEach((el) => {
                if (el.dataset.reveal === 'stagger') Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 8))));
            });
            const io = new IntersectionObserver((entries) => {
                for (const en of entries) if (en.isIntersecting) { en.target.setAttribute('data-shown', ''); io.unobserve(en.target); }
            }, { threshold: 0 });
            reveal.forEach((el) => io.observe(el));
            cleanups.push(() => io.disconnect(), () => root.removeAttribute('data-motion'));
        }

        // Scroll-linked: heading scrub fallback + timeline fill.
        const cssScrub = CSS.supports('animation-timeline: view()');
        const scrub = cssScrub || still ? [] : Array.from(root.querySelectorAll<HTMLElement>('[data-scrub]'));
        const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-timeline]'));
        let raf = 0;
        const frame = () => {
            const vh = innerHeight;
            // Safety net for instant jumps (hash links, scrollIntoView): show anything on screen.
            if (!still) for (const el of reveal) {
                if (el.hasAttribute('data-shown')) continue;
                const r = el.getBoundingClientRect();
                if (r.top < vh) el.setAttribute('data-shown', '');
            }
            for (const h of scrub) {
                const r = h.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.45)));
                h.style.setProperty('--hm-scrub', p.toFixed(3));
            }
            for (const l of lines) {
                const r = l.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / Math.max(1, r.height)));
                l.style.setProperty('--hm-tl', p.toFixed(3));
            }
        };
        const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
        frame();
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('hashchange', onScroll);
        const late = setTimeout(frame, 1200);
        cleanups.push(() => clearTimeout(late));
        cleanups.push(() => removeEventListener('hashchange', onScroll));
        addEventListener('resize', onScroll);
        cleanups.push(() => { cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); });

        // Pointer reactions — hover-capable fine pointers only.
        if (!still && matchMedia('(hover: hover) and (pointer: fine)').matches) {
            const onMove = (e: PointerEvent) => {
                const t = e.target as Element | null;
                const card = t?.closest<HTMLElement>('[data-tilt]');
                if (card && root.contains(card)) {
                    const r = card.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                    const max = r.width > 520 ? 3 : 6;
                    card.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
                    card.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`);
                    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
                    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
                    card.setAttribute('data-hot', '');
                }
                const chip = t?.closest<HTMLElement>('[data-magnet]');
                if (chip && root.contains(chip)) {
                    const r = chip.getBoundingClientRect();
                    chip.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
                    chip.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
                }
            };
            const onOut = (e: PointerEvent) => {
                const t = e.target as Element | null;
                const to = e.relatedTarget as Node | null;
                const card = t?.closest<HTMLElement>('[data-tilt]');
                if (card && !(to && card.contains(to))) { card.removeAttribute('data-hot'); card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); }
                const chip = t?.closest<HTMLElement>('[data-magnet]');
                if (chip && !(to && chip.contains(to))) { chip.style.removeProperty('--tx'); chip.style.removeProperty('--ty'); }
            };
            root.addEventListener('pointermove', onMove, { passive: true });
            root.addEventListener('pointerout', onOut, { passive: true });
            cleanups.push(() => { root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerout', onOut); });
        }
        return () => cleanups.forEach((c) => c());
    }, []);
    return null;
}
