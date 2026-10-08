'use client';

import { useEffect, useState } from 'react';

/**
 * Post footer: a local-only Like toggle (count starts at the md's honest 0)
 * and Send, which shares a link to the post — native share sheet where the
 * platform has one, clipboard otherwise — and confirms with a toast.
 */
export default function LiReactions({ base, anchor, title, labels }: {
    base: number;
    anchor: string;
    title: string;
    labels: { like: string; liked: string; send: string; reactions: string; copied: string; shareFailed: string };
}) {
    const [liked, setLiked] = useState(false);
    const [toast, setToast] = useState('');
    const n = base + (liked ? 1 : 0);

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(''), 2400);
        return () => window.clearTimeout(t);
    }, [toast]);

    const send = async () => {
        const url = `${location.origin}${location.pathname}#${anchor}`;
        try {
            if (navigator.share) { await navigator.share({ title, url }); return; }
            await navigator.clipboard.writeText(url);
            setToast(labels.copied);
        } catch (err) {
            if ((err as DOMException)?.name !== 'AbortError') setToast(labels.shareFailed);
        }
    };

    return (
        <div className="li-post-foot">
            <p className="li-post-count" aria-live="polite">{labels.reactions.replace('{n}', String(n))}</p>
            <div className="li-post-bar">
                <button type="button" className={`li-react${liked ? ' is-on' : ''}`} aria-pressed={liked} onClick={() => setLiked(!liked)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 21H4V10h3zm2 0h8.5a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 19 10h-5l.8-4.2A1.8 1.8 0 0 0 11.6 5L9 10z" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    <span>{liked ? labels.liked : labels.like}</span>
                </button>
                <button type="button" className="li-react" onClick={send}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    <span>{labels.send}</span>
                </button>
            </div>
            <div className="li-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
        </div>
    );
}
