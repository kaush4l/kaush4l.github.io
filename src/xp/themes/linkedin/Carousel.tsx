'use client';

import { useRef, type ReactNode } from 'react';

/** Horizontal scroll-snap rail with previous/next buttons on pointer devices. */
export default function LiCarousel({ prev, next, region, children }: { prev: string; next: string; region: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const by = (dir: number) => {
        const el = ref.current;
        if (!el) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: still ? 'auto' : 'smooth' });
    };
    return (
        <div className="li-carousel">
            <button type="button" className="li-car-btn li-car-prev" aria-label={prev} onClick={() => by(-1)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
            <div className="li-car-track" ref={ref} tabIndex={0} role="region" aria-label={region}>{children}</div>
            <button type="button" className="li-car-btn li-car-next" aria-label={next} onClick={() => by(1)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
        </div>
    );
}
