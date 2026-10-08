'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import XpControls from '../../XpControls';
import { fill, label, labelList } from '../../label';
import type { XpContact, XpEntry, XpLabels, XpProfile, XpSkillGroup } from '../../types';

export interface GhRepo {
    slug: string;
    name: string;
    description: string;
    lang: string;
    langVar: string;
    stars: number;
    year: number;
    link?: string;
    topics: string[];
}
export interface GhGraph {
    year: number;
    /** Weekdays with at least one role on record. */
    total: number;
    /** Org names referenced by `cells[].r`. */
    roles: string[];
    cells: ({ m: number; d: number; level: number; r: number[] } | null)[];
}
export interface GhActivity {
    slug: string;
    title: string;
    org: string;
    period: string;
    commits: { hash: string; message: string }[];
}

type Tab = 'overview' | 'repositories' | 'projects' | 'stars';
type Sort = 'name' | 'stars' | 'year';

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function Star() {
    return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>;
}
function RepoIcon() {
    return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>;
}

function RepoCard({ r, l, wide }: { r: GhRepo; l: XpLabels; wide?: boolean }) {
    const name = r.link
        ? <a href={r.link} className="gh-repo-name" target="_blank" rel="noreferrer" aria-label={fill(label(l, 'pinned.open', 'Open {name}'), { name: r.name })}>{r.name}</a>
        : <span className="gh-repo-name">{r.name}</span>;
    return (
        <article className={wide ? 'gh-repo gh-repo--row' : 'gh-repo'}>
            <header className="gh-repo-head">
                <RepoIcon />
                {name}
                <span className="gh-pill">{label(l, 'pinned.public')}</span>
            </header>
            <p className="gh-repo-desc">{r.description}</p>
            {wide && r.topics.length > 0 && (
                <ul className="gh-topics">{r.topics.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
            <footer className="gh-repo-meta">
                {r.lang && <span><i className="gh-dot" style={{ background: r.langVar }} />{r.lang}</span>}
                <span><Star /><span aria-hidden="true">{r.stars}</span><span className="xp-sr">{fill(label(l, 'pinned.stars'), { n: r.stars })}</span></span>
                {wide && r.year > 0 && <span>{fill(label(l, 'repos.updated'), { year: r.year })}</span>}
            </footer>
        </article>
    );
}

/** Small glyphs for achievement badges, cycled deterministically by index. */
const GLYPHS = [
    'M8 1l1.8 4.2L14 7l-4.2 1.8L8 13l-1.8-4.2L2 7l4.2-1.8z',
    'M3 3h10v10H3zM6 6h4v4H6z',
    'M8 1.5l6 3.25v6.5L8 14.5l-6-3.25v-6.5z',
    'M9.5 1L3 9h4.5L6.5 15 13 7H8.5z',
];
function Glyph({ i }: { i: number }) {
    return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d={GLYPHS[i % GLYPHS.length]} /></svg>;
}
function Check() {
    return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>;
}

type Tip = { text: string; x: number; y: number } | null;

function Graph({ graphs, l }: { graphs: GhGraph[]; l: XpLabels }) {
    const [year, setYear] = useState(graphs[0]?.year ?? 0);
    const g = graphs.find((x) => x.year === year) ?? graphs[0];
    const firstValid = g ? g.cells.findIndex(Boolean) : -1;
    const [active, setActive] = useState(firstValid);
    const [tip, setTip] = useState<Tip>(null);
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const months = labelList(l, 'graph.months');
    const days = labelList(l, 'graph.days');
    if (!g) return null;
    const cur = g.cells[active] ? active : firstValid;
    const weeks = Array.from({ length: 53 }, (_, w) => g.cells.slice(w * 7, w * 7 + 7));
    const describe = (c: NonNullable<GhGraph['cells'][number]>) => {
        const date = `${months[c.m] ?? c.m + 1} ${c.d}, ${g.year}`;
        return c.r.length
            ? fill(label(l, 'graph.tooltip'), { roles: c.r.map((k) => g.roles[k]).join(label(l, 'sep')), date })
            : fill(label(l, 'graph.none'), { date });
    };
    const show = (i: number, el: HTMLElement | null) => {
        const c = g.cells[i];
        if (!c || !el) return;
        const w = (el.offsetParent as HTMLElement | null)?.offsetWidth ?? 0;
        const x = el.offsetLeft + el.offsetWidth / 2;
        setTip({ text: describe(c), x: w ? Math.min(Math.max(x, 96), w - 96) : x, y: el.offsetTop });
    };
    const step = (from: number, delta: number) => {
        for (let i = from + delta; i >= 0 && i < g.cells.length; i += delta) if (g.cells[i]) return i;
        return from;
    };
    const onKey = (e: ReactKeyboardEvent, i: number) => {
        const lastValid = g.cells.length - 1 - [...g.cells].reverse().findIndex(Boolean);
        const next = ({
            ArrowRight: () => step(i, 7), ArrowLeft: () => step(i, -7),
            ArrowDown: () => step(i, 1), ArrowUp: () => step(i, -1),
            Home: () => firstValid, End: () => lastValid,
        } as Record<string, () => number>)[e.key]?.();
        if (e.key === 'Escape') { setTip(null); return; }
        if (next === undefined) return;
        e.preventDefault();
        setActive(next);
        const el = refs.current[next];
        el?.focus();
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const pickYear = (y: number) => {
        setYear(y);
        setTip(null);
        setActive(graphs.find((x) => x.year === y)?.cells.findIndex(Boolean) ?? 0);
    };
    return (
        <section className="gh-graph-wrap" aria-labelledby="gh-graph-h">
            <div className="gh-graph-main">
                <h2 className="gh-h2" id="gh-graph-h">{fill(label(l, 'graph.title'), { n: g.total, year: g.year })}</h2>
                <div className="gh-card gh-graph-card">
                    <div className="gh-graph-scroll">
                        <div className="gh-graph" onMouseLeave={() => setTip(null)}>
                            <div className="gh-graph-days" aria-hidden="true">{days.map((d, i) => <span key={i}>{d}</span>)}</div>
                            <div className="gh-graph-body">
                                <div className="gh-graph-months" aria-hidden="true">
                                    {weeks.map((w, i) => {
                                        const c = w.find((x) => x && x.d === 1);
                                        return <span key={i}>{c ? months[c.m] : ''}</span>;
                                    })}
                                </div>
                                <div className="gh-graph-grid" role="grid" aria-label={fill(label(l, 'graph.gridLabel'), { year: g.year })} aria-describedby="gh-graph-help">
                                    {weeks.map((w, wi) => (
                                        <div key={wi} className="gh-week" role="row">
                                            {w.map((c, di) => {
                                                const i = wi * 7 + di;
                                                return c ? (
                                                    <button
                                                        key={di}
                                                        ref={(el) => { refs.current[i] = el; }}
                                                        type="button"
                                                        role="gridcell"
                                                        className={`gh-cell gh-l${c.level}`}
                                                        aria-label={describe(c)}
                                                        tabIndex={i === cur ? 0 : -1}
                                                        onKeyDown={(e) => onKey(e, i)}
                                                        onMouseEnter={(e) => show(i, e.currentTarget)}
                                                        onFocus={(e) => { setActive(i); show(i, e.currentTarget); }}
                                                        onBlur={() => setTip(null)}
                                                        onClick={(e) => show(i, e.currentTarget)}
                                                    />
                                                ) : <span key={di} className="gh-cell gh-cell--empty" role="gridcell" aria-hidden="true" />;
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {tip && (
                                <span className="gh-tip" aria-hidden="true" style={{ left: tip.x, top: tip.y }}>{tip.text}</span>
                            )}
                        </div>
                    </div>
                    <div className="gh-graph-foot">
                        <span id="gh-graph-help" className="gh-graph-help">{label(l, 'graph.help')}</span>
                        <span className="gh-legend" aria-hidden="true">
                            {label(l, 'graph.less')}
                            {[0, 1, 2, 3, 4].map((n) => <i key={n} className={`gh-cell gh-l${n}`} />)}
                            {label(l, 'graph.more')}
                        </span>
                    </div>
                </div>
            </div>
            {graphs.length > 1 && (
                <div className="gh-years" role="group" aria-label={label(l, 'graph.years')}>
                    {graphs.map((x) => (
                        <button
                            key={x.year}
                            type="button"
                            className={x.year === year ? 'gh-year is-active' : 'gh-year'}
                            aria-pressed={x.year === year}
                            aria-label={fill(label(l, 'graph.year'), { year: x.year })}
                            onClick={() => pickYear(x.year)}
                        >{x.year}</button>
                    ))}
                </div>
            )}
        </section>
    );
}

function Activity({ items, l }: { items: GhActivity[]; l: XpLabels }) {
    const [open, setOpen] = useState<Record<string, boolean>>({});
    return (
        <section className="gh-activity">
            <h2 className="gh-h2">{label(l, 'activity.title')}</h2>
            <ol className="gh-timeline">
                {items.map((a) => {
                    const isOpen = !!open[a.slug];
                    return (
                        <li key={a.slug} className="gh-event">
                            <span className="gh-event-dot" aria-hidden="true" />
                            <div className="gh-event-body">
                                <p className="gh-event-period">{a.period}</p>
                                <p className="gh-event-title">
                                    {fill(label(l, 'activity.created'), { n: a.commits.length })}{' '}
                                    <strong>{a.org}</strong> <span className="gh-muted">{label(l, 'activity.sep')} {a.title}</span>
                                </p>
                                {a.commits.length > 0 && (
                                    <button
                                        type="button"
                                        className="gh-btn gh-btn--ghost"
                                        aria-expanded={isOpen}
                                        aria-controls={`gh-c-${a.slug}`}
                                        onClick={() => setOpen((o) => ({ ...o, [a.slug]: !isOpen }))}
                                    >{label(l, isOpen ? 'activity.hide' : 'activity.show')}</button>
                                )}
                                <ul id={`gh-c-${a.slug}`} className="gh-commits" hidden={!isOpen}>
                                    {a.commits.map((c) => (
                                        <li key={c.hash}><code className="xp-mono gh-hash" aria-hidden="true">{c.hash}</code><span>{c.message}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

const TAB_IDS: Tab[] = ['overview', 'repositories', 'projects', 'stars'];

export default function Profile(props: {
    labels: XpLabels;
    introHtml: string;
    profile: XpProfile;
    contact: XpContact[];
    education: XpEntry[];
    skills: XpSkillGroup[];
    repos: GhRepo[];
    graphs: GhGraph[];
    activity: GhActivity[];
    projectsCount: number;
    followers: number;
}) {
    const { labels: l, profile, repos } = props;
    const [tab, setTab] = useState<Tab>('overview');
    const [q, setQ] = useState('');
    const [lang, setLang] = useState('');
    const [sort, setSort] = useState<Sort>('year');
    const [following, setFollowing] = useState(false);
    const search = useRef<HTMLInputElement>(null);
    const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            e.preventDefault();
            search.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const langs = useMemo(() => Array.from(new Set(repos.map((r) => r.lang).filter(Boolean))).sort(), [repos]);
    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return repos
            .filter((r) => !lang || r.lang === lang)
            .filter((r) => !needle || [r.name, r.description, r.lang, ...r.topics].join(' ').toLowerCase().includes(needle))
            .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'stars' ? b.stars - a.stars : b.year - a.year);
    }, [repos, q, lang, sort]);

    const starCount = props.skills.reduce((n, s) => n + s.tags.length, 0);
    const counts: Partial<Record<Tab, number>> = {
        repositories: repos.length,
        projects: props.projectsCount,
        stars: starCount,
    };
    const handle = label(l, 'handle');
    const name = profile.name;
    const sep = label(l, 'sep');
    const links = props.contact.filter((c) => c.url);

    const selectTab = (t: Tab, focus = false) => {
        setTab(t);
        if (focus) tabRefs.current[t]?.focus();
    };
    const onTabKey = (e: ReactKeyboardEvent, i: number) => {
        const n = TAB_IDS.length;
        const next = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
        if (next === undefined) return;
        e.preventDefault();
        selectTab(TAB_IDS[next], true);
    };
    const onSearch = (v: string) => {
        setQ(v);
        if (v && tab !== 'repositories') setTab('repositories');
    };
    const clearFilters = () => {
        setQ('');
        setLang('');
        search.current?.focus();
    };

    const identity = (where: 'top' | 'side') => (
        <div className={`gh-id gh-id--${where}`}>
            <div className="gh-avatar" aria-hidden="true"><span className="xp-display">{initials(name)}</span></div>
            <div className="gh-id-text">
                <h1 className="gh-name xp-display">{name}</h1>
                <p className="gh-handle">{handle}</p>
            </div>
        </div>
    );

    const sidebar = (
        <aside className="gh-side" aria-label={label(l, 'sidebar.label')}>
            {identity('side')}
            <p className="gh-bio">{profile.headline || profile.role}</p>
            <button type="button" className="gh-btn gh-btn--block gh-follow" aria-pressed={following} onClick={() => setFollowing((f) => !f)}>
                {following && <Check />}
                {label(l, 'sidebar.follow')}
            </button>
            <p className="gh-muted gh-followers">{fill(label(l, 'sidebar.followers'), { n: props.followers })}</p>
            <ul className="gh-facts">
                {profile.location && <li><span className="xp-sr">{label(l, 'sidebar.location')}</span>{profile.location}</li>}
                {links.map((c) => (
                    <li key={c.title}><a href={c.url} target="_blank" rel="noreferrer">{c.subtitle || c.title}</a></li>
                ))}
            </ul>
            {profile.highlights.length > 0 && (
                <section className="gh-side-sec" aria-labelledby="gh-ach-h">
                    <h2 className="gh-h3" id="gh-ach-h">{label(l, 'sidebar.achievements')}</h2>
                    <ul className="gh-achievements">
                        {profile.highlights.map((h, i) => (
                            <li key={h}><span className="gh-ach-glyph"><Glyph i={i} /></span><span>{h}</span></li>
                        ))}
                    </ul>
                </section>
            )}
            {props.education.length > 0 && (
                <section className="gh-side-sec" aria-labelledby="gh-org-h">
                    <h2 className="gh-h3" id="gh-org-h">{label(l, 'sidebar.organizations')}</h2>
                    <ul className="gh-orgs">
                        {props.education.map((e) => (
                            <li key={e.slug}>
                                <span className="gh-org-avatar" aria-hidden="true">{initials(e.subtitle || e.title)}</span>
                                <span className="gh-org-text"><strong>{e.subtitle || e.title}</strong><span className="gh-muted">{[e.title, e.period].filter(Boolean).join(sep)}</span></span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </aside>
    );

    return (
        <>
            <header className="gh-top xp-glass">
                <div className="gh-top-in">
                    <span className="gh-wordmark xp-display">{label(l, 'wordmark')}</span>
                    <div className="gh-search" role="search">
                        <label htmlFor="gh-q" className="xp-sr">{label(l, 'search.label')}</label>
                        <input
                            id="gh-q"
                            ref={search}
                            type="search"
                            value={q}
                            placeholder={label(l, 'search.placeholder')}
                            aria-keyshortcuts="/"
                            enterKeyHint="search"
                            autoComplete="off"
                            onChange={(e) => onSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); setQ(''); } }}
                        />
                        {!q && <kbd aria-hidden="true">{label(l, 'search.hint')}</kbd>}
                    </div>
                    <XpControls backLabel={label(l, 'back')} lightLabel={label(l, 'light')} darkLabel={label(l, 'dark')} />
                </div>
            </header>

            {identity('top')}

            <nav className="gh-tabs" aria-label={label(l, 'tabs.label')}>
                <div className="gh-tabs-in" role="tablist" aria-label={label(l, 'tabs.label')}>
                    {TAB_IDS.map((id, i) => {
                        const n = counts[id];
                        return (
                            <button
                                key={id}
                                ref={(el) => { tabRefs.current[id] = el; }}
                                id={`gh-tab-${id}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === id}
                                aria-controls="gh-panel"
                                tabIndex={tab === id ? 0 : -1}
                                className={tab === id ? 'gh-tab is-active' : 'gh-tab'}
                                onClick={() => selectTab(id)}
                                onKeyDown={(e) => onTabKey(e, i)}
                            >
                                {label(l, `tabs.${id}`)}
                                {n !== undefined && <span className="gh-count">{n}</span>}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="gh-page">
                {sidebar}
                <main className="gh-main" id="gh-panel" role="tabpanel" aria-labelledby={`gh-tab-${tab}`}>
                    {tab === 'overview' && (
                        <>
                            <article className="gh-card gh-readme" aria-labelledby="gh-readme-h">
                                <p className="gh-readme-path xp-mono">{fill(label(l, 'readme.path'), { handle })}</p>
                                <h2 className="gh-readme-h xp-display" id="gh-readme-h">{label(l, 'readme.greeting')}</h2>
                                {profile.proof && <p className="gh-readme-lead">{profile.proof}</p>}
                                <h3 className="gh-readme-h3">{label(l, 'readme.about')}</h3>
                                {profile.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                                <div className="gh-readme-intro" dangerouslySetInnerHTML={{ __html: props.introHtml }} />
                            </article>
                            {repos.length > 0 && (
                                <section aria-labelledby="gh-pinned-h">
                                    <h2 className="gh-h2" id="gh-pinned-h">{label(l, 'pinned.title')}</h2>
                                    <div className="gh-pinned">{repos.slice(0, 6).map((r) => <RepoCard key={r.slug} r={r} l={l} />)}</div>
                                </section>
                            )}
                            <Graph graphs={props.graphs} l={l} />
                            <Activity items={props.activity} l={l} />
                        </>
                    )}
                    {tab === 'repositories' && (
                        <section aria-labelledby="gh-tab-repositories">
                            <div className="gh-repo-tools">
                                <label className="gh-select">
                                    <span>{label(l, 'repos.filterLabel')}</span>
                                    <select value={lang} onChange={(e) => setLang(e.target.value)}>
                                        <option value="">{label(l, 'repos.all')}</option>
                                        {langs.map((x) => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                </label>
                                <label className="gh-select">
                                    <span>{label(l, 'repos.sortLabel')}</span>
                                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                                        <option value="year">{label(l, 'repos.sortYear')}</option>
                                        <option value="name">{label(l, 'repos.sortName')}</option>
                                        <option value="stars">{label(l, 'repos.sortStars')}</option>
                                    </select>
                                </label>
                            </div>
                            <p className="gh-muted gh-result" role="status">
                                {list.length > 0
                                    ? fill(label(l, 'repos.count'), { n: list.length })
                                    : q.trim() ? fill(label(l, 'search.empty'), { q: q.trim() }) : label(l, 'repos.none')}
                            </p>
                            {list.length > 0 ? (
                                <div className="gh-repo-list">{list.map((r) => <RepoCard key={r.slug} r={r} l={l} wide />)}</div>
                            ) : (q || lang) && (
                                <div className="gh-empty">
                                    <RepoIcon />
                                    <button type="button" className="gh-btn" onClick={clearFilters}>{label(l, 'search.clear')}</button>
                                </div>
                            )}
                        </section>
                    )}
                    {tab === 'projects' && (
                        <section aria-labelledby="gh-proj-h">
                            <h2 className="gh-h2" id="gh-proj-h">{label(l, 'projectsTab.title')}</h2>
                            <div className="gh-repo-list">
                                {props.activity.map((a) => (
                                    <article key={a.slug} className="gh-repo gh-repo--row">
                                        <header className="gh-repo-head"><span className="gh-repo-name">{a.org}</span></header>
                                        <p className="gh-repo-desc">{[a.title, a.period].filter(Boolean).join(sep)}</p>
                                        <footer className="gh-repo-meta"><span>{fill(label(l, 'projectsTab.items'), { n: a.commits.length })}</span></footer>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                    {tab === 'stars' && (
                        <section aria-labelledby="gh-stars-h">
                            <h2 className="gh-h2" id="gh-stars-h">{label(l, 'starsTab.title')}</h2>
                            <div className="gh-repo-list">
                                {props.skills.map((s) => (
                                    <article key={s.title} className="gh-repo gh-repo--row">
                                        <header className="gh-repo-head"><Star /><span className="gh-repo-name">{s.title}</span></header>
                                        {s.summary && <p className="gh-repo-desc">{s.summary}</p>}
                                        <ul className="gh-topics">{s.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                                        <footer className="gh-repo-meta"><span>{fill(label(l, 'starsTab.count'), { n: s.tags.length })}</span></footer>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}
