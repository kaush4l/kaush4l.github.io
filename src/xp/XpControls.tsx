'use client';

import Link from 'next/link';
import { useThemeContext } from '@/theme/ThemeProvider';
import { useDefaultSkin } from './useDefaultSkin';

/**
 * The two controls every experience carries, whatever it imitates: a way back
 * to the Experience Center and the site-wide light/dark switch. Themes place
 * this inside their own header so it reads as part of that product's chrome.
 * Rendered as Liquid Glass capsules — the one material that sits on any ground.
 *
 * Labels arrive as props so the md file stays the only source of wording.
 */
export default function XpControls({
    backHref = '/experience/',
    backLabel,
    lightLabel,
    darkLabel,
}: {
    backHref?: string;
    backLabel: string;
    lightLabel: string;
    darkLabel: string;
}) {
    useDefaultSkin();
    const { isDark, setAppearance } = useThemeContext();
    const next = isDark ? 'light' : 'dark';
    return (
        <div className="xp-controls">
            <Link href={backHref} className="xp-glass-btn xp-back" aria-label={backLabel}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="xp-back-text">{backLabel}</span>
            </Link>
            <button
                type="button"
                className="xp-glass-btn xp-mode"
                onClick={() => setAppearance(next)}
                aria-label={isDark ? lightLabel : darkLabel}
                title={isDark ? lightLabel : darkLabel}
            >
                {isDark ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`}/>)}</g></svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>
                )}
            </button>
        </div>
    );
}
