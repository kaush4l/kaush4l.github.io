'use client';

import { useEffect, useRef, useState } from 'react';
import { fill, label } from '../../label';
import type { XpLabels } from '../../types';
import { Thumb } from './Thumb';
import { Icon } from './Icons';
import type { YtVideo } from './model';

const TICK = 100;
const CHAPTER_MS = 4000;

/**
 * Watch page. The "player" plays the entry's bullets as chapters: a progress
 * bar sweeps through them. Under reduced motion it steps chapter by chapter
 * with no sweep.
 */
export default function Watch({ v, l, upNext, onOpen, onClose }: {
    v: YtVideo; l: XpLabels; upNext: YtVideo[]; onOpen: (id: string) => void; onClose: () => void;
}) {
    const chapters = v.bullets.length ? v.bullets : [v.summary];
    const n = chapters.length;
    const [playing, setPlaying] = useState(false);
    const [t, setT] = useState(0); // 0..n, chapter-units
    const [vote, setVote] = useState<'' | 'like' | 'dislike'>('');
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState('');
    const reduced = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);

    // Reset when a new video is opened (render-time state adjustment).
    const [shown, setShown] = useState(v.id);
    if (shown !== v.id) {
        setShown(v.id); setPlaying(false); setT(0); setVote(''); setOpen(false);
    }

    useEffect(() => { heading.current?.focus(); }, [v.id]);

    useEffect(() => {
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            || document.documentElement.hasAttribute('data-reduce-motion');
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            const el = e.target as HTMLElement | null;
            if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
            onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (!playing) return;
        const step = reduced.current ? CHAPTER_MS : TICK;
        const id = window.setInterval(() => {
            setT((prev) => {
                const next = reduced.current ? Math.floor(prev) + 1 : prev + TICK / CHAPTER_MS;
                if (next >= n) { setPlaying(false); return n; }
                return next;
            });
        }, step);
        return () => window.clearInterval(id);
    }, [playing, n]);

    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(() => setToast(''), 2400);
        return () => window.clearTimeout(id);
    }, [toast]);

    const chapter = Math.min(n - 1, Math.floor(t));
    const pct = (t / n) * 100;

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setToast(label(l, 'watch.copied'));
        } catch {
            setToast(label(l, 'watch.copyFailed'));
        }
    };

    const toggle = () => {
        if (!playing && t >= n) setT(0);
        setPlaying(!playing);
    };

    return (
        <div className="yt-watch">
            <div className="yt-watch-main">
                <button type="button" className="yt-watch-back" onClick={onClose} aria-label={label(l, 'aria.closeWatch')}>
                    <Icon name="back" size={20} /><span>{label(l, 'watch.back')}</span>
                </button>
                <div className={`yt-player yt-thumb--${v.thumb}${playing ? ' is-playing' : ''}`}>
                    <div className="yt-player-stage">
                        <p className="yt-player-chapter-n">{fill(label(l, 'watch.chapterOf'), { n: chapter + 1, total: n })}</p>
                        <p className="yt-player-chapter" aria-live="polite">{t > 0 ? chapters[chapter] : label(l, 'watch.playHint')}</p>
                        <p className="yt-player-title xp-display">{v.title}</p>
                    </div>
                    <button type="button" className="yt-player-toggle" onClick={toggle} aria-label={playing ? label(l, 'aria.pause') : label(l, 'aria.play')}>
                        <span className="yt-player-icon" aria-hidden="true">
                            {playing
                                ? <svg viewBox="0 0 24 24" width="32" height="32"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /></svg>
                                : <svg viewBox="0 0 24 24" width="32" height="32"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
                        </span>
                    </button>
                    <div className="yt-progress" aria-hidden="true">
                        <div className="yt-progress-fill" style={{ width: `${pct}%` }} />
                        {chapters.map((_, i) => i > 0 && <span key={i} className="yt-progress-gap" style={{ left: `${(i / n) * 100}%` }} />)}
                    </div>
                    {v.duration && <span className="yt-badge yt-badge--player">{v.duration}</span>}
                </div>

                <h1 className="yt-watch-title xp-display" tabIndex={-1} ref={heading}>{v.title}</h1>
                <div className="yt-watch-bar">
                    <div className="yt-watch-chan">
                        <span className="yt-avatar yt-avatar--sm" aria-hidden="true">{label(l, 'initials')}</span>
                        <div>
                            <p className="yt-watch-chan-name">{v.channel}</p>
                            <p className="yt-card-meta">{v.period}</p>
                        </div>
                    </div>
                    <div className="yt-actions">
                        <div className="yt-pill-group">
                            <button type="button" className="yt-pill" aria-pressed={vote === 'like'} aria-label={label(l, 'aria.like')} onClick={() => setVote(vote === 'like' ? '' : 'like')}>
                                <Icon name="like" filled={vote === 'like'} size={20} /><span>{label(l, 'watch.like')}</span>
                            </button>
                            <button type="button" className="yt-pill" aria-pressed={vote === 'dislike'} aria-label={label(l, 'aria.dislike')} onClick={() => setVote(vote === 'dislike' ? '' : 'dislike')}>
                                <Icon name="dislike" filled={vote === 'dislike'} size={20} />
                            </button>
                        </div>
                        <button type="button" className="yt-pill" onClick={share}><Icon name="share" size={20} /><span>{label(l, 'watch.share')}</span></button>
                    </div>
                </div>

                <div className={`yt-descbox${open ? ' is-open' : ''}`}>
                    <p className="yt-descbox-meta">
                        {fill(label(l, 'video.meta'), { age: v.age })}
                        {v.location && <>{label(l, 'sep')}{fill(label(l, 'watch.location'), { place: v.location })}</>}
                    </p>
                    <p>{v.summary}</p>
                    {open && (
                        <>
                            <h2 className="yt-about-h">{label(l, 'watch.chapters')}</h2>
                            <ol className="yt-chapters" aria-label={label(l, 'aria.chapters')}>
                                {chapters.map((c, i) => (
                                    <li key={i}>
                                        <button type="button" className={`yt-chapter${i === chapter && t > 0 ? ' is-on' : ''}`} onClick={() => { setT(i + 0.001); }}>
                                            <span className="yt-chapter-n">{fill(label(l, 'watch.chapter'), { n: i + 1 })}</span>
                                            <span>{c}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            {v.link && <p><a className="yt-link" href={v.link} target="_blank" rel="noreferrer">{label(l, 'watch.open')}</a></p>}
                        </>
                    )}
                    {v.tags.length > 0 && <p className="yt-hashtags">{v.tags.map((tg) => <span key={tg}>{fill(label(l, 'hashtag'), { tag: tg.replace(/\s+/g, '') })}</span>)}</p>}
                    <button type="button" className="yt-more" aria-expanded={open} onClick={() => setOpen(!open)}>
                        {open ? label(l, 'watch.less') : label(l, 'watch.more')}
                    </button>
                </div>
            </div>

            <aside className="yt-upnext" aria-label={label(l, 'aria.upNext')}>
                <h2 className="yt-shelf-h xp-display">{label(l, 'watch.upNext')}</h2>
                <ul>
                    {upNext.map((u) => (
                        <li key={u.id} className="yt-card yt-card--row">
                            <a href={`#v=${u.id}`} className="yt-card-link" onClick={(e) => { e.preventDefault(); onOpen(u.id); }}>
                                <div className="yt-thumb-wrap"><Thumb v={u} /></div>
                                <div className="yt-card-text">
                                    <h3 className="yt-card-title">{u.title}</h3>
                                    <p className="yt-card-meta">{u.channel}</p>
                                    <p className="yt-card-meta">{fill(label(l, 'video.meta'), { age: u.age })}</p>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className="yt-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
        </div>
    );
}
