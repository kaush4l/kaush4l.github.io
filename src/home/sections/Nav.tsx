'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useThemeContext } from '@/theme/ThemeProvider';

export type NavItem = { id: string; label: string };

export const reduceMotion = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-reduce-motion'));

/** Smooth-scroll to a hash target (instant under reduced motion) and move focus there. */
export function goTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
}

export default function Nav({ brand, items, resume, resumeHref, menu, close, light, dark, navLabel }: {
    brand: string; items: NavItem[]; resume: string; resumeHref: string;
    menu: string; close: string; light: string; dark: string; navLabel: string;
}) {
    const { isDark, setAppearance } = useThemeContext();
    const [active, setActive] = useState('');
    const [compact, setCompact] = useState(false);
    const [open, setOpen] = useState(false);
    const barRef = useRef<HTMLElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    // Compact state + progress bar (written straight to a CSS var: no re-render per frame).
    useEffect(() => {
        let raf = 0;
        const on = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const max = document.documentElement.scrollHeight - innerHeight;
                barRef.current?.style.setProperty('--hm-progress', String(max > 0 ? Math.min(1, scrollY / max) : 0));
                setCompact(scrollY > 12);
            });
        };
        on();
        addEventListener('scroll', on, { passive: true });
        addEventListener('resize', on);
        return () => { cancelAnimationFrame(raf); removeEventListener('scroll', on); removeEventListener('resize', on); };
    }, []);

    // Scroll-spy: the section whose box contains the viewport's centre line.
    useEffect(() => {
        let raf = 0;
        const spy = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const mid = innerHeight / 2;
                let hit = '';
                for (const i of items) {
                    const r = document.getElementById(i.id)?.getBoundingClientRect();
                    if (r && r.top <= mid && r.bottom > mid) hit = i.id;
                }
                setActive(hit);
            });
        };
        spy();
        addEventListener('scroll', spy, { passive: true });
        addEventListener('resize', spy);
        addEventListener('hashchange', spy);
        return () => { cancelAnimationFrame(raf); removeEventListener('scroll', spy); removeEventListener('resize', spy); removeEventListener('hashchange', spy); };
    }, [items]);

    const shut = useCallback(() => { setOpen(false); toggleRef.current?.focus(); }, []);

    // Sheet: focus trap, Escape, scroll lock, close on desktop resize.
    useEffect(() => {
        if (!open) return;
        const sheet = sheetRef.current;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheet?.querySelector<HTMLElement>('a,button')?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); shut(); return; }
            if (e.key !== 'Tab' || !sheet) return;
            const f = Array.from(sheet.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        const mq = matchMedia('(min-width: 861px)');
        const onMq = () => mq.matches && setOpen(false);
        document.addEventListener('keydown', onKey);
        mq.addEventListener('change', onMq);
        return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); mq.removeEventListener('change', onMq); };
    }, [open, shut]);

    const modeLabel = isDark ? light : dark;
    const links = (inSheet: boolean) => items.map((i) => (
        <li key={i.id}>
            <a href={`#${i.id}`} className="hm-nav-link hm-press" aria-current={active === i.id ? 'location' : undefined}
                onClick={(e) => { if (inSheet) setOpen(false); goTo(e, i.id); }}>{i.label}</a>
        </li>
    ));

    return (
        <>
        <header ref={barRef} className="hm-nav xp-glass" data-compact={compact || undefined}>
            <div className="hm-nav-row">
                <a href="#main" className="hm-brand xp-display hm-press" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); }}>{brand}</a>
                <nav aria-label={navLabel} className="hm-nav-desk"><ul>{links(false)}</ul></nav>
                <div className="hm-nav-tools">
                    {resumeHref && <a href={resumeHref} className="hm-pill hm-press" target="_blank" rel="noreferrer noopener">{resume}</a>}
                    <button type="button" className="xp-glass-btn hm-icon-btn hm-press" onClick={() => setAppearance(isDark ? 'light' : 'dark')} aria-label={modeLabel} title={modeLabel}>
                        {isDark ? (
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />)}</g></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" /></svg>
                        )}
                    </button>
                    <button ref={toggleRef} type="button" className="xp-glass-btn hm-icon-btn hm-burger hm-press"
                        aria-expanded={open} aria-controls="hm-sheet" aria-label={open ? close : menu} onClick={() => setOpen((o) => !o)}>
                        <span className="hm-burger-lines" aria-hidden="true"><span /><span /></span>
                    </button>
                </div>
            </div>
            <span className="hm-progress" aria-hidden="true" />
        </header>
            <div id="hm-sheet" ref={sheetRef} className="hm-sheet xp-glass" role="dialog" aria-modal="true" aria-label={navLabel}
                data-open={open || undefined} inert={!open} hidden={!open}>
                <button type="button" className="xp-glass-btn hm-icon-btn hm-sheet-close hm-press" aria-label={close} onClick={shut}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
                <ul className="hm-sheet-list">{links(true)}</ul>
                {resumeHref && <a href={resumeHref} className="hm-btn hm-btn-primary hm-press" target="_blank" rel="noreferrer noopener">{resume}</a>}
            </div>
        </>
    );
}
