'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Glass carousel for the Experience Center cards. A native horizontal
 * scroll-snap track (touch, trackpad and wheel all work for free) with Liquid
 * Glass prev/next buttons, a dot pager, arrow keys and mouse drag. The card
 * nearest the centre is "chosen": it scales up and the rest recede.
 */
export default function Carousel({ children, label, prev, next, goTo }: {
    children: ReactNode;
    label: string;
    prev: string;
    next: string;
    /** "Go to {n}" */
    goTo: string;
}) {
    const track = useRef<HTMLUListElement>(null);
    const [active, setActive] = useState(0);
    const items = Children.toArray(children);
    const count = items.length;

    const slides = () => Array.from(track.current?.children ?? []) as HTMLElement[];

    const scrollTo = useCallback((i: number) => {
        const t = track.current;
        const s = slides()[Math.max(0, Math.min(count - 1, i))];
        if (!t || !s) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-reduce-motion');
        t.scrollTo({ left: s.offsetLeft - (t.clientWidth - s.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }, [count]);

    // Active = slide whose centre is nearest the track's centre.
    useEffect(() => {
        const t = track.current;
        if (!t) return;
        let raf = 0;
        const measure = () => {
            raf = 0;
            const mid = t.scrollLeft + t.clientWidth / 2;
            let best = 0, bestD = Infinity;
            slides().forEach((s, i) => {
                const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
                if (d < bestD) { bestD = d; best = i; }
                // 0 at centre → 1 one slide away; drives scale/opacity in CSS.
                s.style.setProperty('--hm-off', String(Math.min(1, d / Math.max(1, s.clientWidth))));
            });
            setActive(best);
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
        measure();
        t.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { t.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
    }, [count]);

    // Mouse drag-to-scroll (touch already scrolls natively).
    useEffect(() => {
        const t = track.current;
        if (!t) return;
        let startX = 0, startLeft = 0, dragging = false, moved = false;
        const down = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            dragging = true; moved = false; startX = e.clientX; startLeft = t.scrollLeft;
            t.dataset.dragging = 'true';
        };
        const move = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 4) moved = true;
            t.scrollLeft = startLeft - dx;
        };
        const up = () => {
            if (!dragging) return;
            dragging = false;
            delete t.dataset.dragging;
            if (moved) scrollTo(active);
        };
        // A drag must not also follow the card's link.
        const click = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
        t.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        t.addEventListener('click', click, true);
        return () => {
            t.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            t.removeEventListener('click', click, true);
        };
    }, [active, scrollTo]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); scrollTo(active + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollTo(active - 1); }
    };

    return (
        <div className="hm-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
            <ul ref={track} className="hm-ctrack" onKeyDown={onKey}>
                {items.map((child, i) => (
                    <li key={i} className="hm-cslide" data-active={i === active} aria-roledescription="slide" aria-label={`${i + 1} / ${count}`}>
                        {child}
                    </li>
                ))}
            </ul>
            <div className="hm-cctrl">
                <button type="button" className="hm-cbtn xp-glass hm-press" onClick={() => scrollTo(active - 1)} disabled={active === 0} aria-label={prev}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="hm-cdots xp-glass">
                    {items.map((_, i) => (
                        <button key={i} type="button" className="hm-cdot" aria-current={i === active} aria-label={goTo.replace('{n}', String(i + 1))} onClick={() => scrollTo(i)} />
                    ))}
                </div>
                <button type="button" className="hm-cbtn xp-glass hm-press" onClick={() => scrollTo(active + 1)} disabled={active === count - 1} aria-label={next}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
        </div>
    );
}
