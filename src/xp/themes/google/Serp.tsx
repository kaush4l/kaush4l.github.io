'use client';

import { useId, useMemo, useRef, useState } from 'react';
import XpControls from '../../XpControls';
import { fill, label, labelObjects } from '../../label';
import type { XpEntry, XpThemeProps } from '../../types';

type Section = 'experience' | 'projects' | 'skills' | 'education';

interface Result {
    key: string;
    section: Section;
    crumb: string;
    title: string;
    href?: string;
    snippet: string;
    sitelinks: string[];
    date?: string;
    haystack: string;
}

const SECTIONS: Section[] = ['experience', 'projects', 'skills', 'education'];

interface Seps { crumb: string; title: string; meta: string }

function entryResult(section: Section, e: XpEntry, crumb: string, host: string, sep: Seps): Result {
    const meta = [e.subtitle, e.location].filter(Boolean).join(sep.meta);
    return {
        key: `${section}-${e.slug}`,
        section,
        crumb: [host, crumb, e.slug].filter(Boolean).join(sep.crumb),
        title: meta ? `${e.title}${sep.title}${meta}` : e.title,
        href: e.link,
        snippet: e.summary || e.bullets[0] || '',
        sitelinks: e.bullets.slice(0, 4),
        date: e.period,
        haystack: [e.title, e.subtitle, e.location, e.summary, ...e.bullets, ...e.tags].join(' ').toLowerCase(),
    };
}

function Wordmark({ text, className }: { text: string; className?: string }) {
    return (
        <span className={`xp-display gx-word ${className ?? ''}`} aria-hidden="true">
            {[...text].map((ch, i) => <span key={i} className={`gx-b${(i % 4) + 1}`}>{ch}</span>)}
        </span>
    );
}

export default function Serp({ config, resume }: XpThemeProps) {
    const L = config.labels;
    const t = (p: string, fb = '') => label(L, p, fb);
    const name = resume.profile.name;
    const host = t('host');
    const initialQuery = t('search.query', name);

    const tabs = labelObjects<{ id: string; label: string }>(L, 'tabs.items');
    const [query, setQuery] = useState(initialQuery);
    const [tab, setTab] = useState(tabs[0]?.id ?? 'all');
    const [open, setOpen] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [more, setMore] = useState(false);
    const uid = useId();
    const sep: Seps = { crumb: t('sep.crumb', ' › '), title: t('sep.title', ' — '), meta: t('sep.meta', ' · ') };

    const all = useMemo<Result[]>(() => {
        const out: Result[] = [];
        for (const s of ['experience', 'projects', 'education'] as const) {
            for (const e of resume[s]) out.push(entryResult(s, e, t(`crumbs.${s}`, s), host, sep));
        }
        resume.skills.forEach((g, i) => out.push({
            key: `skills-${i}`,
            section: 'skills',
            crumb: [host, t('crumbs.skills', 'skills')].filter(Boolean).join(sep.crumb),
            title: g.title,
            snippet: g.summary || g.tags.join(sep.meta),
            sitelinks: [],
            haystack: [g.title, g.summary, ...g.tags].join(' ').toLowerCase(),
        }));
        // Order: experience, projects, skills, education — like the résumé.
        return SECTIONS.flatMap((s) => out.filter((r) => r.section === s));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resume, host]);

    // The prefilled query is the person's name: it matches "everything".
    const terms = query.trim().toLowerCase() === initialQuery.trim().toLowerCase()
        ? []
        : query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = all.filter((r) =>
        (tab === 'all' || r.section === tab) && terms.every((w) => r.haystack.includes(w)));
    const seconds = (0.21 + results.length * 0.017).toFixed(2);

    const onTabKey = (e: React.KeyboardEvent, i: number) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        let n = i;
        if (d) n = (i + d + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        else return;
        e.preventDefault();
        setTab(tabs[n].id);
        tabRefs.current[n]?.focus();
    };

    const paa = labelObjects<{ q: string; source: string }>(L, 'paa.questions').map(({ q, source }) => {
        let answer: string[] = [];
        if (source === 'profile') answer = [resume.profile.summary];
        else if (source === 'experience' || source === 'projects' || source === 'education') {
            answer = resume[source].map((e) => [e.title, e.subtitle, e.period].filter(Boolean).join(sep.meta));
        }
        return { q: fill(q, { name: name.split(' ')[0] || name }), answer: answer.filter(Boolean) };
    }).filter((x) => x.answer.length);

    const related = [...new Set(resume.skills.flatMap((g) => g.tags))].slice(0, 8);
    const current = resume.experience[0];
    const pager = { head: t('pager.head', 'G'), vowel: t('pager.vowel', 'o'), tail: t('pager.tail', 'gle') };

    const search = (q: string) => { setQuery(q); setTab(tabs[0]?.id ?? 'all'); };
    const tabIndex = Math.max(0, tabs.findIndex((x) => x.id === tab));
    const goTab = (i: number) => {
        setTab(tabs[i].id);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    };

    const panel = (
        <aside className="gx-panel" aria-label={t('panel.label')}>
            <h2 className="xp-display gx-panel-name">{name}</h2>
            {resume.profile.role && <p className="gx-panel-role">{resume.profile.role}</p>}
            {resume.profile.summary && <p className="gx-panel-sum" data-open={more}>{resume.profile.summary}</p>}
            <button
                type="button"
                className="gx-more"
                aria-expanded={more}
                aria-controls={`${uid}-more`}
                onClick={() => setMore(!more)}
            >
                <span>{fill(t(more ? 'panel.less' : 'panel.more'), { name: name.split(' ')[0] || name })}</span>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div id={`${uid}-more`} className="gx-panel-more" data-open={more}><div className="gx-panel-more-inner">
            <h3 className="xp-display gx-h3">{t('panel.facts')}</h3>
            <dl className="gx-facts">
                {resume.profile.location && <div><dt>{t('panel.born')}{t('sep.fact', ': ')}</dt><dd>{resume.profile.location}</dd></div>}
                {resume.profile.role && <div><dt>{t('panel.role')}{t('sep.fact', ': ')}</dt><dd>{resume.profile.role}</dd></div>}
                {current && <div><dt>{t('panel.current')}{t('sep.fact', ': ')}</dt><dd>{[current.subtitle ?? current.title, current.period].filter(Boolean).join(sep.meta)}</dd></div>}
                {resume.profile.proof && <div><dt>{t('panel.proof')}{t('sep.fact', ': ')}</dt><dd>{resume.profile.proof}</dd></div>}
            </dl>
            {resume.profile.highlights.length > 0 && <>
                <h3 className="xp-display gx-h3">{t('panel.highlights')}</h3>
                <ul className="gx-chips">
                    {resume.profile.highlights.map((h) => (
                        <li key={h}><button type="button" className="gx-chip" onClick={() => search(h)}>{h}</button></li>
                    ))}
                </ul>
            </>}
            {resume.contact.some((c) => c.url) && <>
                <h3 className="xp-display gx-h3">{t('panel.profiles')}</h3>
                <ul className="gx-profiles">
                    {resume.contact.filter((c) => c.url).map((c) => (
                        <li key={c.title}>
                            <a href={c.url} target={c.url!.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                                <span className="gx-avatar" aria-hidden="true">{c.title.charAt(0)}</span>
                                <span>{c.title}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </>}
            </div></div>
        </aside>
    );

    return (
        <div className="gx">
            <header className="gx-head xp-glass">
                <div className="gx-head-row">
                    <a href="#gx-main" className="gx-logo" aria-label={t('wordmark', name)}><Wordmark text={t('wordmark', name)} /></a>
                    <form
                        className="gx-search"
                        role="search"
                        aria-label={t('search.form')}
                        onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); setTab(tabs[0]?.id ?? 'all'); }}
                    >
                        <label htmlFor={`${uid}-q`} className="xp-sr">{t('search.label')}</label>
                        <input
                            id={`${uid}-q`}
                            ref={inputRef}
                            type="search"
                            value={query}
                            placeholder={t('search.placeholder')}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Escape') return;
                                e.preventDefault();
                                if (query) setQuery(''); else inputRef.current?.blur();
                            }}
                            autoComplete="off"
                            enterKeyHint="search"
                        />
                        {query && (
                            <button type="button" className="gx-icon" aria-label={t('search.clear')} onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            </button>
                        )}
                        <button type="submit" className="gx-icon gx-submit" aria-label={t('search.submit')}>
                            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15 15l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </button>
                    </form>
                    <div className="gx-controls">
                        <XpControls backLabel={t('back')} lightLabel={t('light')} darkLabel={t('dark')} />
                    </div>
                </div>
                <div className="gx-tabs" role="tablist" aria-label={t('tabs.label')}>
                    {tabs.map((x, i) => (
                        <button
                            key={x.id}
                            ref={(el) => { tabRefs.current[i] = el; }}
                            type="button"
                            role="tab"
                            id={`${uid}-tab-${x.id}`}
                            aria-selected={tab === x.id}
                            aria-controls={`${uid}-panel`}
                            tabIndex={tab === x.id ? 0 : -1}
                            className="gx-tab"
                            onClick={() => setTab(x.id)}
                            onKeyDown={(e) => onTabKey(e, i)}
                        >{x.label}</button>
                    ))}
                </div>
            </header>

            <div className="gx-body">
                {panel}
                <main id="gx-main" className="gx-main">
                    <p className="gx-stats" aria-live="polite">{fill(t('stats'), { n: results.length, s: seconds })}</p>
                    <section
                        id={`${uid}-panel`}
                        role="tabpanel"
                        aria-labelledby={`${uid}-tab-${tab}`}
                    >
                        <h2 className="xp-sr">{t('results')}</h2>
                        {results.length === 0 ? (
                            <div className="gx-empty">
                                <p>{fill(t('empty'), { q: query })}</p>
                                <p>{t('emptyHint')}</p>
                                <button type="button" className="gx-chip" onClick={() => { search(''); inputRef.current?.focus(); }}>{t('search.clear')}</button>
                            </div>
                        ) : (
                            <ol className="gx-results">
                                {results.map((r) => (
                                    <li key={r.key} className="gx-result">
                                        <div className="gx-crumb">
                                            <span className="gx-favicon" aria-hidden="true">{r.title.charAt(0)}</span>
                                            <span className="gx-crumb-text">{r.crumb}</span>
                                        </div>
                                        <h3 className="gx-title">
                                            {r.href
                                                ? <a href={r.href} target="_blank" rel="noopener noreferrer">{r.title}</a>
                                                : <span>{r.title}</span>}
                                        </h3>
                                        <p className="gx-snippet">
                                            {r.date && <span className="gx-date">{r.date}{t('sep.date', ' — ')}</span>}
                                            {r.snippet}
                                        </p>
                                        {r.sitelinks.length > 0 && (
                                            <ul className="gx-sitelinks" aria-label={t('sitelinks')}>
                                                {r.sitelinks.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    {paa.length > 0 && (
                        <section className="gx-paa" aria-labelledby={`${uid}-paa`}>
                            <h2 id={`${uid}-paa`} className="xp-display gx-h2">{t('paa.title')}</h2>
                            {paa.map((p, i) => {
                                const isOpen = open === i;
                                return (
                                    <div key={i} className="gx-q" data-open={isOpen}>
                                        <h3>
                                            <button
                                                type="button"
                                                id={`${uid}-q-${i}`}
                                                aria-expanded={isOpen}
                                                aria-controls={`${uid}-a-${i}`}
                                                onClick={() => setOpen(isOpen ? null : i)}
                                            >
                                                <span>{p.q}</span>
                                                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </button>
                                        </h3>
                                        <div id={`${uid}-a-${i}`} className="gx-a" role="region" aria-labelledby={`${uid}-q-${i}`} inert={!isOpen}>
                                            <div className="gx-a-inner">
                                                {p.answer.length === 1 ? <p>{p.answer[0]}</p> : <ul>{p.answer.map((a) => <li key={a}>{a}</li>)}</ul>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    {related.length > 0 && (
                        <section className="gx-related" aria-labelledby={`${uid}-rel`}>
                            <h2 id={`${uid}-rel`} className="xp-display gx-h2">{t('related.title')}</h2>
                            <ul>
                                {related.map((r) => (
                                    <li key={r}>
                                        <button type="button" className="gx-rel" aria-label={fill(t('related.label'), { q: r })} onClick={() => search(r)}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15 15l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                            <span>{r}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <nav className="gx-pager" aria-label={t('pager.label')}>
                        <span className="xp-display gx-pager-word" aria-hidden="true">
                            <span className="gx-b1">{pager.head}</span>
                            {tabs.map((_, i) => <span key={i} className={`gx-b${(i % 2) + 2}`}>{pager.vowel}</span>)}
                            <span className="gx-b1">{pager.tail}</span>
                        </span>
                        <ol className="gx-pages">
                            {tabs.map((x, i) => (
                                <li key={x.id}>
                                    <button
                                        type="button"
                                        className="gx-page"
                                        aria-current={tab === x.id ? 'page' : undefined}
                                        aria-label={fill(t(tab === x.id ? 'pager.current' : 'pager.page'), { n: i + 1, tab: x.label })}
                                        onClick={() => goTab(i)}
                                    >{i + 1}</button>
                                </li>
                            ))}
                            {tabIndex < tabs.length - 1 && (
                                <li>
                                    <button type="button" className="gx-page gx-next" onClick={() => goTab(tabIndex + 1)}>
                                        <span>{t('pager.next')}</span>
                                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>
                                </li>
                            )}
                        </ol>
                    </nav>
                </main>

            </div>

            <footer className="gx-foot">
                <p className="gx-foot-region">{[t('footer.region'), resume.profile.location].filter(Boolean).join(sep.meta)}</p>
                <p>{t('footer.note')}</p>
            </footer>
        </div>
    );
}
