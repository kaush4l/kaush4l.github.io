'use client';

import { useState, type ReactNode } from 'react';

/** "…see more" for clamped text, or "Show N more" for hidden list items. */
export default function LiExpand({ mode, more, less, children, extra }: {
    mode: 'clamp' | 'list'; more: string; less: string; children: ReactNode; extra?: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    if (mode === 'clamp') {
        return (
            <div className={`li-clamp${open ? ' is-open' : ''}`}>
                <div className="li-clamp-body">{children}</div>
                <button type="button" className="li-link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? less : more}</button>
            </div>
        );
    }
    return (
        <>
            {children}
            {extra && open && extra}
            {extra && <button type="button" className="li-link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? less : more}</button>}
        </>
    );
}
