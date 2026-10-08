/** Line icons drawn in currentColor — no brand marks. */
const P: Record<string, string> = {
    menu: 'M3 6h18M3 12h18M3 18h18',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    shorts: 'M9 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM10.5 9.5v5l4-2.5z',
    subs: 'M4 6h16M6 3h12M3 9h18v12H3zM10 12v6l5-3z',
    you: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
    bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
    like: 'M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1H7',
    dislike: 'M17 14V4h3v10zM17 14l-4 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2l2-7a2 2 0 0 1 2-1h10',
    share: 'M14 5l7 7-7 7v-4c-5 0-8 1-11 5 1-6 4-10 11-11z',
    back: 'M15 5l-7 7 7 7',
    close: 'M6 6l12 12M18 6L6 18',
    link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
    pin: 'M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    list: 'M4 6h12M4 12h12M4 18h8M18 14v6l4-3z',
};

export function Icon({ name, filled = false, size = 24 }: { name: string; filled?: boolean; size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d={P[name] ?? ''} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function PlayGlyph({ size = 28 }: { size?: number }) {
    return (
        <svg className="yt-glyph" viewBox="0 0 28 20" width={size} height={size * 20 / 28} aria-hidden="true">
            <rect width="28" height="20" rx="6" fill="currentColor" />
            <path d="M11 5.5v9l8-4.5z" fill="var(--xp-accent-text)" />
        </svg>
    );
}
