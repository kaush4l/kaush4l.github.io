'use client';

import { useId, useState } from 'react';

/** "Show details" — animates via grid-template-rows 0fr→1fr (no measuring). */
export default function Disclosure({ more, less, bullets }: { more: string; less: string; bullets: string[] }) {
    const [open, setOpen] = useState(false);
    const id = useId();
    return (
        <div className="hm-disc" data-open={open || undefined}>
            <button type="button" className="hm-disc-btn hm-press" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
                <span>{open ? less : more}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div id={id} className="hm-disc-panel" inert={!open}>
                <div className="hm-disc-inner">
                    <ul>{bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
            </div>
        </div>
    );
}
