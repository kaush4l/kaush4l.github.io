'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Disclosure menu for the profile's "More" actions: a real button that
 * toggles a list of links, closes on Escape / outside press / focus leaving,
 * and hands focus back to the button when dismissed from the keyboard.
 */
export default function LiMore({ label, ariaLabel, children }: { label: string; ariaLabel: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const btn = useRef<HTMLButtonElement>(null);
    const id = useId();

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        root.current?.querySelector<HTMLElement>('a')?.focus();
        return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    return (
        <div className="li-more" ref={root} onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
            <button ref={btn} type="button" className="li-btn li-btn-ghost" aria-label={ariaLabel} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{label}</button>
            <ul id={id} className="li-more-menu" hidden={!open} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>{children}</ul>
        </div>
    );
}
