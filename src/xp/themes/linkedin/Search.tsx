'use client';

import { useId, useMemo, useState } from 'react';

export interface LiSearchTarget { id: string; title: string; text: string }

/** Filters the profile's sections by text and jumps to the chosen one. */
export default function LiSearch({ targets, label, placeholder, noMatch, jump, results }: {
    targets: LiSearchTarget[]; label: string; placeholder: string; noMatch: string; jump: string; results: string;
}) {
    const [q, setQ] = useState('');
    const listId = useId();
    const hits = useMemo(() => {
        const n = q.trim().toLowerCase();
        return n ? targets.filter((t) => t.title.toLowerCase().includes(n) || t.text.toLowerCase().includes(n)) : [];
    }, [q, targets]);
    const go = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
        const h = el.querySelector<HTMLElement>('h2') ?? el;
        h.tabIndex = -1;
        h.focus({ preventScroll: true });
        setQ('');
    };
    const sub = (t: string, k: string, v: string | number) => t.replace(`{${k}}`, String(v));
    return (
        <form className="li-search" role="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setQ(''); }} onSubmit={(e) => { e.preventDefault(); if (hits[0]) go(hits[0].id); }}>
            <label className="xp-sr" htmlFor={`${listId}-q`}>{label}</label>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input id={`${listId}-q`} type="search" value={q} placeholder={placeholder} autoComplete="off"
                aria-controls={listId}
                onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} />
            {q.trim() !== '' && (
                <div className="li-search-pop" id={listId} onPointerDown={(e) => e.preventDefault()}>
                    <p className="xp-sr" aria-live="polite">{sub(results, 'n', hits.length)}</p>
                    {hits.length === 0 ? <p className="li-search-empty">{sub(noMatch, 'q', q)}</p> : (
                        <ul>{hits.map((h) => (
                            <li key={h.id}><button type="button" onClick={() => go(h.id)} aria-label={sub(jump, 's', h.title)}>{h.title}</button></li>
                        ))}</ul>
                    )}
                </div>
            )}
        </form>
    );
}
