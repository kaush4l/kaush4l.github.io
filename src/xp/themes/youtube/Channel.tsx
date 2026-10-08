'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import XpControls from '../../XpControls';
import { fill, label, labelObjects } from '../../label';
import type { XpContact, XpEntry, XpLabels, XpProfile, XpSkillGroup } from '../../types';
import { Icon, PlayGlyph } from './Icons';
import type { YtVideo } from './model';
import Watch from './Watch';
import { Thumb } from './Thumb';

type Item = { id: string; label: string; icon?: string };

function Card({ v, l, onOpen, row = false }: { v: YtVideo; l: XpLabels; onOpen: (id: string) => void; row?: boolean }) {
    return (
        <li className={row ? 'yt-card yt-card--row' : 'yt-card'}>
            <a href={`#v=${v.id}`} className="yt-card-link" onClick={(e) => { e.preventDefault(); onOpen(v.id); }}>
                <div className="yt-thumb-wrap">
                    <Thumb v={v} />
                    {v.live && <span className="yt-badge yt-badge--live yt-badge--abs">{label(l, 'video.live')}</span>}
                </div>
                <div className="yt-card-body">
                    {!row && <span className="yt-avatar yt-avatar--sm" aria-hidden="true">{label(l, 'initials')}</span>}
                    <div className="yt-card-text">
                        <h3 className="yt-card-title">{v.title}</h3>
                        <p className="yt-card-meta">{v.channel}</p>
                        <p className="yt-card-meta">{fill(label(l, 'video.meta'), { age: v.age })}</p>
                    </div>
                </div>
            </a>
        </li>
    );
}

export default function Channel({
    labels: l, introHtml, profile, roles, projects, skills, education, contact, since,
}: {
    labels: XpLabels; introHtml: string; profile: XpProfile;
    roles: YtVideo[]; projects: YtVideo[]; skills: XpSkillGroup[]; education: XpEntry[]; contact: XpContact[];
    since?: number;
}) {
    const tabs = labelObjects<Item>(l, 'tabs');
    const guide = labelObjects<Item>(l, 'guide');
    const all = useMemo(() => [...roles, ...projects], [roles, projects]);

    const [tab, setTab] = useState(tabs[0]?.id ?? 'home');
    const [mini, setMini] = useState(false);
    const [q, setQ] = useState('');
    const [chip, setChip] = useState<string>('');
    const [subscribed, setSubscribed] = useState(false);
    const [bell, setBell] = useState(false);
    const [more, setMore] = useState(false);
    const [watching, setWatching] = useState<string | null>(null);

    // Deep link: `#v=<id>` opens the watch view. Hash is read only in effects.
    useEffect(() => {
        const sync = () => {
            const m = window.location.hash.match(/^#v=([\w-]+)$/);
            setWatching(m && all.some((v) => v.id === m[1]) ? m[1] : null);
        };
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, [all]);

    // Return focus to the card that opened the watch view when it closes.
    const opener = useRef<string | null>(null);
    useEffect(() => {
        if (watching || !opener.current) return;
        const id = opener.current;
        opener.current = null;
        document.querySelector<HTMLAnchorElement>(`.yt-main a[href="#v=${id}"]`)?.focus();
    }, [watching]);

    const open = useCallback((id: string) => {
        opener.current = id;
        window.location.hash = `v=${id}`;
        window.scrollTo({ top: 0 });
    }, []);
    const close = useCallback(() => {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
        setWatching(null);
    }, []);

    const group = skills.find((s) => s.title === chip);
    const needle = q.trim().toLowerCase();
    const match = useCallback((v: YtVideo) => {
        if (group) {
            const set = new Set(group.tags.map((t) => t.toLowerCase()));
            if (!v.tags.some((t) => set.has(t.toLowerCase()))) return false;
        }
        if (!needle) return true;
        return [v.title, v.channel, v.summary, ...v.tags, ...v.bullets].join(' ').toLowerCase().includes(needle);
    }, [group, needle]);
    const fRoles = roles.filter(match);
    const fProjects = projects.filter(match);
    const filtered = [...fRoles, ...fProjects];
    const filtering = !!needle || !!group;

    const goGuide = (id: string) => {
        setTab(label(l, `guideTarget.${id}`, id));
        if (watching) close();
    };
    const activeGuide = guide.find((g) => label(l, `guideTarget.${g.id}`, g.id) === tab)?.id;

    const current = watching ? all.find((v) => v.id === watching) : undefined;
    const shelf = (heading: string, list: YtVideo[]) => list.length > 0 && (
        <section className="yt-shelf" aria-label={heading}>
            <h2 className="yt-shelf-h xp-display">{heading}</h2>
            <ul className="yt-grid">{list.map((v) => <Card key={v.id} v={v} l={l} onOpen={open} />)}</ul>
        </section>
    );
    const empty = <p className="yt-empty">{fill(label(l, 'search.empty'), { q: q || chip })}</p>;

    const shorts = (
        <section className="yt-shelf" aria-label={label(l, 'shelves.shorts')}>
            <h2 className="yt-shelf-h xp-display"><Icon name="shorts" /> {label(l, 'shelves.shorts')}</h2>
            <ul className="yt-shorts">
                {skills.map((s, i) => (
                    <li key={s.title} className={`yt-short yt-thumb--${(i % 6) + 1}`}>
                        <button type="button" className="yt-short-btn" aria-pressed={chip === s.title}
                            onClick={() => { setChip(chip === s.title ? '' : s.title); setTab(tabs[1]?.id ?? 'videos'); }}>
                            <span className="yt-short-title xp-display">{s.title}</span>
                            <span className="yt-short-tags">{s.tags.slice(0, 6).map((t) => fill(label(l, 'hashtag'), { tag: t.replace(/\s+/g, '') })).join(' ')}</span>
                            <span className="yt-short-count">{fill(label(l, 'shorts.count'), { n: s.tags.length })}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );

    const playlist = (name: string, count: string, rows: { key: string; title: string; sub?: string; href?: string; meta?: string }[], idx: number) => (
        <li className="yt-pl">
            <div className={`yt-pl-cover yt-thumb--${idx}`} aria-hidden="true">
                <span className="xp-display">{name}</span>
                <span className="yt-pl-count"><Icon name="list" size={18} /> {count}</span>
            </div>
            <h3 className="yt-card-title">{name}</h3>
            <ol className="yt-pl-list">
                {rows.map((r) => (
                    <li key={r.key}>
                        {r.href ? <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{r.title}</a> : <span>{r.title}</span>}
                        {r.sub && <span className="yt-card-meta">{label(l, 'sep')}{r.sub}</span>}
                        {r.meta && <span className="yt-card-meta">{label(l, 'sep')}{r.meta}</span>}
                    </li>
                ))}
            </ol>
        </li>
    );

    const playlists = (
        <section className="yt-shelf" aria-label={label(l, 'shelves.playlists')}>
            <h2 className="yt-shelf-h xp-display">{label(l, 'shelves.playlists')}</h2>
            <ul className="yt-pls">
                {playlist(label(l, 'playlists.education'), fill(label(l, 'playlists.educationCount'), { n: education.length }),
                    education.map((e) => ({ key: e.slug, title: e.title, sub: e.subtitle, meta: e.period })), 3)}
                {playlist(label(l, 'playlists.contact'), fill(label(l, 'playlists.contactCount'), { n: contact.length }),
                    contact.map((c) => ({ key: c.title, title: c.title, sub: c.subtitle, href: c.url })), 5)}
            </ul>
        </section>
    );

    const about = (
        <section className="yt-about" aria-label={label(l, 'about.heading')}>
            <div className="yt-about-main">
                <h2 className="yt-shelf-h xp-display">{label(l, 'about.description')}</h2>
                {profile.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                {profile.highlights.length > 0 && (
                    <>
                        <h3 className="yt-about-h">{label(l, 'about.highlights')}</h3>
                        <p className="yt-hashtags">{profile.highlights.map((h) => <span key={h}>{fill(label(l, 'hashtag'), { tag: h.replace(/\s+/g, '') })}</span>)}</p>
                    </>
                )}
                <h3 className="yt-about-h">{label(l, 'about.links')}</h3>
                <ul className="yt-links">
                    {contact.map((c) => c.url && (
                        <li key={c.title}><a href={c.url} target={c.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer"><Icon name="link" size={18} /><span>{c.title}</span><span className="yt-card-meta">{c.subtitle}</span></a></li>
                    ))}
                </ul>
            </div>
            <aside className="yt-about-side">
                <h3 className="yt-about-h">{label(l, 'about.details')}</h3>
                {profile.location && <p><Icon name="pin" size={18} /> {profile.location}</p>}
                <h3 className="yt-about-h">{label(l, 'about.stats')}</h3>
                <p>{fill(label(l, 'about.statsVideos'), { n: all.length })}</p>
                <p>{fill(label(l, 'about.statsShorts'), { n: skills.length })}</p>
                {since && <p>{fill(label(l, 'about.statsYears'), { year: since })}</p>}
            </aside>
        </section>
    );

    const featured = roles[0];
    let body: React.ReactNode;
    if (filtering && tab !== 'about' && tab !== 'playlists' && tab !== 'shorts') {
        body = (
            <>
                {needle && <p className="yt-results" role="status">{fill(label(l, 'search.results'), { n: filtered.length, q })}</p>}
                {filtered.length ? <ul className="yt-grid">{filtered.map((v) => <Card key={v.id} v={v} l={l} onOpen={open} />)}</ul> : empty}
            </>
        );
    } else if (tab === 'videos') {
        body = <>{shelf(label(l, 'shelves.roles'), roles)}{shelf(label(l, 'shelves.projects'), projects)}</>;
    } else if (tab === 'shorts') body = shorts;
    else if (tab === 'playlists') body = playlists;
    else if (tab === 'about') body = about;
    else {
        body = (
            <>
                {featured && (
                    <section className="yt-featured" aria-label={label(l, 'shelves.featured')}>
                        <a href={`#v=${featured.id}`} className="yt-featured-link" onClick={(e) => { e.preventDefault(); open(featured.id); }}>
                            <div className="yt-thumb-wrap"><Thumb v={featured} big /></div>
                            <div>
                                <p className="yt-eyebrow">{label(l, 'shelves.featured')}</p>
                                <h2 className="yt-featured-title xp-display">{featured.title}</h2>
                                <p className="yt-card-meta">{featured.channel}{label(l, 'sep')}{fill(label(l, 'video.meta'), { age: featured.age })}</p>
                                <p className="yt-featured-sum">{featured.summary}</p>
                            </div>
                        </a>
                    </section>
                )}
                {shelf(label(l, 'shelves.roles'), roles.slice(1))}
                {shorts}
                {shelf(label(l, 'shelves.projects'), projects)}
            </>
        );
    }

    return (
        <div className={`yt${mini ? ' yt--mini' : ''}`}>
            <header className="yt-top xp-glass">
                <div className="yt-top-start">
                    <button type="button" className="yt-icon-btn yt-hamburger" aria-label={label(l, 'aria.guide')} aria-expanded={!mini} aria-controls="yt-guide" onClick={() => setMini(!mini)}>
                        <Icon name="menu" />
                    </button>
                    <a href="#" className="yt-wordmark" aria-label={label(l, 'aria.homeLink')} onClick={(e) => { e.preventDefault(); setTab(tabs[0]?.id ?? 'home'); setQ(''); setChip(''); if (watching) close(); }}>
                        <PlayGlyph />
                        <span className="xp-display">{label(l, 'wordmark')}</span>
                    </a>
                </div>
                <form className="yt-search" role="search" onSubmit={(e) => { e.preventDefault(); if (watching) close(); }}>
                    <label className="xp-sr" htmlFor="yt-q">{label(l, 'aria.search')}</label>
                    <input id="yt-q" type="search" value={q} placeholder={label(l, 'search.placeholder')} onChange={(e) => { setQ(e.target.value); if (tab !== 'home' && tab !== 'videos') setTab(tabs[1]?.id ?? 'videos'); }} autoComplete="off" />
                    <button type="submit" className="yt-search-btn" aria-label={label(l, 'aria.searchButton')}><Icon name="search" size={20} /></button>
                </form>
                <div className="yt-top-end">
                    <span className="yt-avatar yt-avatar--top" aria-hidden="true">{label(l, 'initials')}</span>
                    <XpControls backLabel={label(l, 'back')} lightLabel={label(l, 'light')} darkLabel={label(l, 'dark')} />
                </div>
            </header>

            <nav id="yt-guide" className="yt-guide" aria-label={label(l, 'aria.guideNav')}>
                <ul>
                    {guide.map((g) => (
                        <li key={g.id}>
                            <button type="button" className="yt-guide-item" aria-current={activeGuide === g.id ? 'page' : undefined} onClick={() => goGuide(g.id)}>
                                <Icon name={g.icon ?? 'home'} filled={activeGuide === g.id} />
                                <span>{g.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <p className="yt-guide-sec">{label(l, 'guideSection')}</p>
                <ul className="yt-guide-sub">
                    {skills.map((s) => (
                        <li key={s.title}>
                            <button type="button" className="yt-guide-item" aria-pressed={chip === s.title} onClick={() => { setChip(chip === s.title ? '' : s.title); setTab(tabs[1]?.id ?? 'videos'); if (watching) close(); }}>
                                <span className="yt-dot" aria-hidden="true" /><span>{s.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <main className="yt-main">
                {current ? (
                    <Watch v={current} l={l} upNext={all.filter((v) => v.id !== current.id)} onOpen={open} onClose={close} />
                ) : (
                    <>
                        <div className="yt-banner" aria-hidden="true"><span className="xp-display">{fill(label(l, 'banner'), { name: profile.name, headline: profile.headline || profile.role || profile.name })}</span></div>
                        <section className="yt-head">
                            <span className="yt-avatar yt-avatar--lg" aria-hidden="true">{label(l, 'initials')}</span>
                            <div className="yt-head-text">
                                <h1 className="yt-name xp-display">{profile.name}</h1>
                                <p className="yt-card-meta">
                                    <strong>{label(l, 'handle')}</strong>{label(l, 'sep')}{fill(label(l, 'channel.videoCount'), { n: all.length })}
                                </p>
                                <div className={`yt-desc${more ? ' is-open' : ''}`}>
                                    <p className="yt-desc-role">{profile.headline || profile.role}</p>
                                    <div className="yt-desc-body" dangerouslySetInnerHTML={{ __html: introHtml }} />
                                    {more && profile.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                                    <button type="button" className="yt-more" aria-expanded={more} onClick={() => setMore(!more)}>
                                        {more ? label(l, 'channel.less') : label(l, 'channel.more')}
                                    </button>
                                </div>
                                <div className="yt-sub-row">
                                    <button type="button" className={`yt-subscribe${subscribed ? ' is-on' : ''}`} aria-pressed={subscribed} onClick={() => { setSubscribed(!subscribed); if (subscribed) setBell(false); }}>
                                        {subscribed ? label(l, 'channel.subscribed') : label(l, 'channel.subscribe')}
                                    </button>
                                    {subscribed && (
                                        <button type="button" className="yt-icon-btn yt-bell" aria-pressed={bell} aria-label={label(l, 'aria.bell')} title={label(l, 'aria.bell')} onClick={() => setBell(!bell)}>
                                            <Icon name="bell" filled={bell} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="yt-tabs" role="tablist" aria-label={label(l, 'aria.tabs')}>
                            {tabs.map((t, i) => (
                                <button key={t.id} id={`yt-tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls="yt-panel"
                                    tabIndex={tab === t.id ? 0 : -1} className="yt-tab" onClick={() => setTab(t.id)}
                                    onKeyDown={(e) => {
                                        const k = e.key;
                                        let j = -1;
                                        if (k === 'ArrowRight') j = (i + 1) % tabs.length;
                                        else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
                                        else if (k === 'Home') j = 0;
                                        else if (k === 'End') j = tabs.length - 1;
                                        if (j < 0) return;
                                        e.preventDefault();
                                        setTab(tabs[j].id);
                                        document.getElementById(`yt-tab-${tabs[j].id}`)?.focus();
                                    }}>{t.label}</button>
                            ))}
                        </div>

                        {(tab === 'home' || tab === 'videos') && (
                            <div className="yt-chips" role="group" aria-label={label(l, 'aria.chips')}>
                                <button type="button" className="yt-chip" aria-pressed={!chip} onClick={() => setChip('')}>{label(l, 'chipAll')}</button>
                                {skills.map((s) => (
                                    <button key={s.title} type="button" className="yt-chip" aria-pressed={chip === s.title} onClick={() => setChip(s.title)}>{s.title}</button>
                                ))}
                            </div>
                        )}

                        <div className="yt-body" id="yt-panel" role="tabpanel" aria-labelledby={`yt-tab-${tab}`}>{body}</div>
                    </>
                )}
            </main>

            <nav className="yt-tabbar xp-glass" aria-label={label(l, 'aria.bottomNav')}>
                {guide.map((g) => (
                    <button key={g.id} type="button" className="yt-tabbar-item" aria-current={activeGuide === g.id ? 'page' : undefined} onClick={() => goGuide(g.id)}>
                        <Icon name={g.icon ?? 'home'} filled={activeGuide === g.id} />
                        <span>{g.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
