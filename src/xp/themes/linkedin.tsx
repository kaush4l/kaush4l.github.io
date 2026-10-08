import type { ReactNode } from 'react';
import type { XpEntry, XpThemeProps } from '../types';
import { fill, label, labelList, labelObjects } from '../label';
import XpControls from '../XpControls';
import LiSearch, { type LiSearchTarget } from './linkedin/Search';
import LiExpand from './linkedin/Expand';
import LiCarousel from './linkedin/Carousel';
import LiReactions from './linkedin/Reactions';
import LiMore from './linkedin/More';
import './linkedin.css';

/**
 * The résumé as a professional-network profile page. Structure lives here;
 * every word comes from `content/experiences/linkedin.md` labels and every
 * colour from its palette (as `--xp-*`).
 */

type NavItem = { id: string; label: string; icon: string; href: string };
type Person = { name: string; headline: string; href: string };

const ICONS: Record<string, ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    network: <><circle cx="8" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.6" /><path d="M2.5 20a5.5 5.5 0 0 1 11 0zM14 20a4.5 4.5 0 0 1 8 0z" /></>,
    jobs: <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.5 0h3V4.5h-3z" />,
    message: <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z" />,
    bell: <path d="M12 3a6 6 0 0 1 6 6v4l2 3H4l2-3V9a6 6 0 0 1 6-6zm-2 15h4a2 2 0 0 1-4 0z" />,
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Aug 2017 - March 2020" → months between (inclusive). Words in `present` mean today. */
function monthsIn(period: string | undefined, present: string[]): number | null {
    if (!period) return null;
    const parts = period.split(/\s+[-–—]\s+|\s+to\s+/i);
    const parse = (s: string | undefined): number | null => {
        if (!s) return null;
        const t = s.trim().toLowerCase();
        if (present.some((p) => t.includes(p.toLowerCase()))) {
            const d = new Date();
            return d.getFullYear() * 12 + d.getMonth();
        }
        const y = t.match(/(19|20)\d{2}/);
        if (!y) return null;
        const m = MONTHS.findIndex((mm) => t.includes(mm));
        return Number(y[0]) * 12 + (m < 0 ? 0 : m);
    };
    const a = parse(parts[0]);
    const b = parse(parts[1]) ?? a;
    if (a === null || b === null) return null;
    return Math.max(1, b - a + 1);
}

function duration(total: number, L: XpThemeProps['config']['labels']): string {
    const y = Math.floor(total / 12);
    const m = total % 12;
    const ys = y === 0 ? '' : y === 1 ? label(L, 'experience.year', '1 yr') : fill(label(L, 'experience.years', '{n} yrs'), { n: y });
    const ms = m === 0 ? '' : m === 1 ? label(L, 'experience.month', '1 mo') : fill(label(L, 'experience.months', '{n} mos'), { n: m });
    return [ys, ms].filter(Boolean).join(' ');
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const Dot = ({ L }: { L: XpThemeProps['config']['labels'] }) => <span aria-hidden="true" className="li-dot">{label(L, 'dot', '·')}</span>;

function Section({ id, title, children, className = '' }: { id: string; title: string; children: ReactNode; className?: string }) {
    return (
        <section id={id} className={`li-card li-section ${className}`} aria-labelledby={`${id}-h`}>
            <h2 id={`${id}-h`} className="xp-display li-h2">{title}</h2>
            {children}
        </section>
    );
}

function Role({ e, i, L }: { e: XpEntry; i: number; L: XpThemeProps['config']['labels'] }) {
    const total = monthsIn(e.period, labelList(L, 'experience.present'));
    const company = e.subtitle ?? e.title;
    const first = e.bullets.slice(0, 2);
    const rest = e.bullets.slice(2);
    return (
        <li className="li-role">
            <span className={`li-logo li-brand-${(i % 3) + 1}`} role="img" aria-label={fill(label(L, 'experience.logoLabel', '{company} logo'), { company })}>
                {company.trim()[0]?.toUpperCase()}
            </span>
            <div className="li-role-body">
                <h3 className="li-h3">{e.title}</h3>
                <p className="li-role-co">{company}</p>
                {e.period && (
                    <p className="li-meta">{e.period}{total !== null && <><Dot L={L} />{duration(total, L)}</>}</p>
                )}
                {e.location && <p className="li-meta">{e.location}</p>}
                {e.summary && <p className="li-role-sum">{e.summary}</p>}
                {e.bullets.length > 0 && (
                    <LiExpand mode="list" more={fill(label(L, 'showMore', 'Show {n} more'), { n: rest.length })} less={label(L, 'showLess', 'Show less')}
                        extra={rest.length ? <ul className="li-bullets">{rest.map((b) => <li key={b}>{b}</li>)}</ul> : undefined}>
                        <ul className="li-bullets">{first.map((b) => <li key={b}>{b}</li>)}</ul>
                    </LiExpand>
                )}
                {e.tags.length > 0 && <p className="li-role-skills"><strong>{label(L, 'experience.skills', 'Skills:')}</strong> {e.tags.join(label(L, 'experience.tagSep', ', '))}</p>}
            </div>
        </li>
    );
}

export default function LinkedinTheme({ config, resume }: XpThemeProps) {
    const L = config.labels;
    const { profile, experience, projects, skills, education, contact } = resume;
    const posts = profile.paragraphs.length > 1 ? profile.paragraphs.slice(1) : profile.paragraphs;
    // Only offer nav destinations that this résumé actually renders.
    const rendered = new Set(['li-top', 'li-about', 'li-experience', 'li-skills', 'li-contact',
        ...(projects.length ? ['li-featured'] : []), ...(posts.length ? ['li-activity'] : []),
        ...(education.length ? ['li-education'] : []), ...(labelList(L, 'interests.items').length ? ['li-interests'] : [])]);
    const nav = labelObjects<NavItem>(L, 'nav').filter((n) => rendered.has(n.href.replace(/^#/, '')));
    const sr = label(L, 'srSep', ': ');
    const people = labelObjects<Person>(L, 'rail.people');
    const s = (k: string, fb: string) => label(L, `sections.${k}`, fb);
    const email = contact.find((c) => c.url?.startsWith('mailto:'));
    const profileLink = contact.find((c) => c.url && !c.url.startsWith('mailto:') && c.icon === 'linkedin') ?? contact.find((c) => c.url && !c.url.startsWith('mailto:'));

    // Endorsements: how many roles list the skill among their tools.
    const usage = new Map<string, number>();
    for (const e of experience) for (const t of e.tags) usage.set(t.toLowerCase(), (usage.get(t.toLowerCase()) ?? 0) + 1);
    const endorse = (n: number) => n === 0 ? label(L, 'skills.none', '') : n === 1 ? label(L, 'skills.usedOnce', '') : fill(label(L, 'skills.used', '{n}'), { n });

    // Career span, derived from the earliest role to today — never a typed-in number.
    const present = labelList(L, 'experience.present');
    const starts = experience.map((e) => (e.period && present[0] ? monthsIn(`${e.period.split(/\s+[-–—]\s+|\s+to\s+/i)[0]} - ${present[0]}`, present) : null)).filter((m): m is number => m !== null);
    const spanYears = starts.length ? Math.floor(Math.max(...starts) / 12) : 0;

    const base = Number(label(L, 'activity.baseReactions', '0')) || 0;
    const reactLabels = {
        like: label(L, 'activity.like', 'Like'), liked: label(L, 'activity.liked', 'Liked'),
        send: label(L, 'activity.send', 'Send'), reactions: label(L, 'activity.reactions', '{n}'),
        copied: label(L, 'activity.copied', ''), shareFailed: label(L, 'activity.shareFailed', ''),
    };

    const targets: LiSearchTarget[] = [
        { id: 'li-about', title: s('about', 'About'), text: profile.paragraphs.join(' ') },
        { id: 'li-featured', title: s('featured', 'Featured'), text: projects.map((p) => `${p.title} ${p.subtitle ?? ''} ${p.tags.join(' ')}`).join(' ') },
        { id: 'li-activity', title: s('activity', 'Activity'), text: posts.join(' ') },
        { id: 'li-experience', title: s('experience', 'Experience'), text: experience.map((e) => `${e.title} ${e.subtitle ?? ''} ${e.location ?? ''} ${e.tags.join(' ')}`).join(' ') },
        { id: 'li-education', title: s('education', 'Education'), text: education.map((e) => `${e.title} ${e.subtitle ?? ''}`).join(' ') },
        { id: 'li-skills', title: s('skills', 'Skills'), text: skills.map((g) => `${g.title} ${g.tags.join(' ')}`).join(' ') },
        { id: 'li-contact', title: s('contact', 'Contact'), text: contact.map((c) => `${c.title} ${c.subtitle ?? ''}`).join(' ') },
    ];

    const navLinks = (cls: string) => nav.map((n) => (
        <a key={n.id} href={n.href} className={cls}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">{ICONS[n.icon] ?? ICONS.home}</svg>
            <span>{n.label}</span>
        </a>
    ));

    return (
        <>
            <header className="li-top xp-glass">
                <div className="li-top-in">
                    <a href="#li-top" className="li-wordmark xp-display" aria-label={label(L, 'wordmarkLabel', config.title)}>{label(L, 'wordmark', config.title)}</a>
                    <LiSearch targets={targets} label={label(L, 'search.label', 'Search')} placeholder={label(L, 'search.placeholder', '')}
                        noMatch={label(L, 'search.noMatch', '')} jump={label(L, 'search.jump', '{s}')} results={label(L, 'search.results', '{n}')} />
                    <nav className="li-nav" aria-label={label(L, 'navLabel', '')}>{navLinks('li-nav-item')}</nav>
                    <XpControls backLabel={label(L, 'back', 'Back')} lightLabel={label(L, 'light', 'Light')} darkLabel={label(L, 'dark', 'Dark')} />
                </div>
            </header>

            <div className="li-page" id="li-top">
                <main className="li-main">
                    <section className="li-card li-profile" aria-label={profile.name}>
                        <div className="li-banner" role="img" aria-label={label(L, 'profile.bannerLabel', '')} />
                        <div className="li-profile-body">
                            <span className="li-avatar xp-display" role="img" aria-label={fill(label(L, 'profile.avatarLabel', '{name}'), { name: profile.name })}>{initials(profile.name)}</span>
                            <h1 className="xp-display li-name">{profile.name}</h1>
                            <p className="li-headline">{profile.headline ?? profile.role}</p>
                            <p className="li-meta">
                                {profile.location}
                                {profile.location && email && <Dot L={L} />}
                                {email && <a className="li-inline" href="#li-contact">{label(L, 'profile.contactInfo', '')}</a>}
                            </p>
                            {spanYears > 0 && <p className="li-conn">{fill(label(L, 'profile.span', '{n}'), { n: spanYears })}</p>}
                            <div className="li-actions">
                                {profileLink?.url && <a className="li-btn li-btn-primary" href={profileLink.url} target="_blank" rel="noopener noreferrer">{label(L, 'profile.connect', 'Connect')}</a>}
                                {email?.url && <a className="li-btn li-btn-outline" href={email.url}>{label(L, 'profile.message', 'Message')}</a>}
                                <LiMore label={label(L, 'profile.more', 'More')} ariaLabel={label(L, 'profile.moreLabel', '')}>
                                        {contact.filter((c) => c.url).map((c) => (
                                            <li key={c.title}><a href={c.url} {...(c.url!.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{c.title}{c.subtitle && <small>{c.subtitle}</small>}</a></li>
                                        ))}
                                </LiMore>
                            </div>
                            <div className="li-open">
                                <p className="li-open-title">{label(L, 'profile.openTo.title', '')}</p>
                                <p className="li-open-body">{label(L, 'profile.openTo.body', '')}</p>
                                <a className="li-inline" href="#li-contact">{label(L, 'profile.openTo.cta', '')}</a>
                            </div>
                        </div>
                    </section>

                    <Section id="li-about" title={s('about', 'About')}>
                        <LiExpand mode="clamp" more={label(L, 'seeMore', 'more')} less={label(L, 'seeLess', 'less')}>
                            <div className="li-intro" dangerouslySetInnerHTML={{ __html: config.introHtml }} />
                            {profile.paragraphs.map((p) => <p key={p}>{p}</p>)}
                        </LiExpand>
                    </Section>

                    {projects.length > 0 && (
                        <Section id="li-featured" title={s('featured', 'Featured')}>
                            <LiCarousel prev={label(L, 'featured.prev', '')} next={label(L, 'featured.next', '')} region={label(L, 'featured.region', '')}>
                                {projects.map((p, i) => (
                                    <article key={p.slug} className="li-feat">
                                        <div className={`li-feat-art li-brand-${(i % 3) + 1}`} aria-hidden="true"><span className="xp-display">{p.title}</span></div>
                                        <p className="li-feat-kind">{label(L, 'featured.kind', '')}</p>
                                        <h3 className="li-h3">{p.title}</h3>
                                        {p.subtitle && <p className="li-meta">{p.subtitle}</p>}
                                        <p className="li-feat-sum">{p.summary}</p>
                                        {p.link && <a className="li-inline" href={p.link} target="_blank" rel="noopener noreferrer">{label(L, 'featured.open', '')}<span className="xp-sr">{sr}{p.title}</span></a>}
                                    </article>
                                ))}
                            </LiCarousel>
                        </Section>
                    )}

                    {posts.length > 0 && (
                        <Section id="li-activity" title={s('activity', 'Activity')}>
                            <ul className="li-posts">
                                {posts.map((p, i) => (
                                    <li key={p} id={`li-post-${i + 1}`} className="li-post">
                                        <p className="li-post-by"><strong>{profile.name}</strong> {label(L, 'activity.posted', '')}</p>
                                        <p className="li-post-text">{p}</p>
                                        <LiReactions base={base} anchor={`li-post-${i + 1}`} title={profile.name} labels={reactLabels} />
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    <Section id="li-experience" title={s('experience', 'Experience')}>
                        <ol className="li-roles">{experience.map((e, i) => <Role key={e.slug} e={e} i={i} L={L} />)}</ol>
                    </Section>

                    {education.length > 0 && (
                        <Section id="li-education" title={s('education', 'Education')}>
                            <ol className="li-roles">
                                {education.map((e, i) => (
                                    <li key={e.slug} className="li-role">
                                        <span className={`li-logo li-brand-${((i + 1) % 3) + 1}`} aria-hidden="true">{(e.subtitle ?? e.title).trim()[0]?.toUpperCase()}</span>
                                        <div className="li-role-body">
                                            <h3 className="li-h3">{e.title}</h3>
                                            {e.subtitle && <p className="li-role-co">{e.subtitle}</p>}
                                            {e.period && <p className="li-meta">{e.period}</p>}
                                            {e.summary && <p className="li-role-sum">{e.summary}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    )}

                    <Section id="li-skills" title={s('skills', 'Skills')}>
                        {skills.map((g) => (
                            <div key={g.title} className="li-skill-group">
                                <h3 className="li-h3">{fill(label(L, 'skills.group', '{title}'), { title: g.title })}</h3>
                                <ul className="li-skills">
                                    {g.tags.map((t) => {
                                        const n = usage.get(t.toLowerCase()) ?? 0;
                                        return (
                                            <li key={t} className="li-skill">
                                                <span className="li-skill-name">{t}</span>
                                                <span className="li-meta">{endorse(n)}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </Section>

                    {labelList(L, 'interests.items').length > 0 && (
                        <Section id="li-interests" title={s('interests', 'Interests')}>
                            <p className="li-meta">{label(L, 'interests.title', '')}</p>
                            <ul className="li-chips">{labelList(L, 'interests.items').map((t) => <li key={t}>{t}</li>)}</ul>
                        </Section>
                    )}

                    <Section id="li-contact" title={s('contact', 'Contact')}>
                        <ul className="li-contact">
                            {contact.map((c) => (
                                <li key={c.title}>
                                    {c.url ? <a href={c.url} {...(c.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><strong>{c.title}</strong><span className="li-meta">{c.subtitle}</span></a>
                                        : <span><strong>{c.title}</strong><span className="li-meta">{c.subtitle}</span></span>}
                                </li>
                            ))}
                        </ul>
                    </Section>
                </main>

                <aside className="li-rail">
                    <section className="li-card li-rail-card">
                        <h2 className="li-rail-h">{label(L, 'rail.languageTitle', '')}</h2>
                        <p className="li-meta">{label(L, 'rail.language', '')}</p>
                        <hr />
                        <h2 className="li-rail-h">{label(L, 'rail.urlTitle', '')}</h2>
                        <p className="li-meta li-url">{label(L, 'rail.url', '')}</p>
                    </section>
                    {people.length > 0 && (
                        <section className="li-card li-rail-card">
                            <h2 className="li-rail-h xp-display">{label(L, 'rail.peopleTitle', '')}</h2>
                            <ul className="li-people">
                                {people.map((p, i) => (
                                    <li key={p.href}>
                                        <span className={`li-logo li-logo-sm li-brand-${(i % 3) + 1}`} aria-hidden="true">{p.name.trim()[0]}</span>
                                        <div>
                                            <p className="li-people-name">{p.name}</p>
                                            <p className="li-meta">{p.headline}</p>
                                            <a className="li-btn li-btn-outline li-btn-sm" href={p.href}>{label(L, 'rail.view', '')}<span className="xp-sr">{sr}{p.name}</span></a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>

            <nav className="li-tabbar xp-glass" aria-label={label(L, 'tabLabel', '')}>{navLinks('li-tab')}</nav>
        </>
    );
}
