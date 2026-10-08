import Link from 'next/link';
import type { XpContact, XpEntry, XpLabels, XpSkillGroup } from '@/xp/types';
import type { HomeData } from '../types';
import { label } from '@/xp/label';
import SectionHead from './SectionHead';

const Arrow = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function Chips({ tags }: { tags: string[] }) {
    if (!tags.length) return null;
    return <ul className="hm-chips">{tags.map((t) => <li key={t} className="hm-chip" data-magnet>{t}</li>)}</ul>;
}

export function Projects({ L, entries }: { L: XpLabels; entries: XpEntry[] }) {
    const open = label(L, 'sections.projects.open');
    return (
        <section id="projects" className="hm-section hm-alt" aria-labelledby="projects-h">
            <div className="hm-wrap">
                <SectionHead id="projects-h" eyebrow={label(L, 'sections.projects.eyebrow')} title={label(L, 'sections.projects.title')} />
                <ul className="hm-bento" data-reveal="stagger">
                    {entries.map((p, i) => {
                        const body = (
                            <>
                                {p.subtitle && <p className="hm-eyebrow">{p.subtitle}</p>}
                                <h3 className="hm-card-title xp-display">{p.title}</h3>
                                {p.summary && <p className="hm-card-text">{p.summary}</p>}
                                <Chips tags={p.tags} />
                                {p.link && <span className="hm-more">{open} <Arrow /></span>}
                            </>
                        );
                        return (
                            <li key={p.slug} className={i === 0 ? 'hm-bento-wide' : undefined}>
                                {p.link ? (
                                    <a href={p.link} target="_blank" rel="noreferrer noopener" className="hm-card hm-proj hm-press" data-tilt>{body}</a>
                                ) : (
                                    <div className="hm-card hm-proj" data-tilt>{body}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

export function Skills({ L, groups }: { L: XpLabels; groups: XpSkillGroup[] }) {
    return (
        <section id="skills" className="hm-section" aria-labelledby="skills-h">
            <div className="hm-wrap">
                <SectionHead id="skills-h" eyebrow={label(L, 'sections.skills.eyebrow')} title={label(L, 'sections.skills.title')} />
                <div className="hm-skills" data-reveal="stagger">
                    {groups.map((g) => (
                        <div key={g.title} className="hm-card hm-skill">
                            <h3 className="hm-card-title">{g.title}</h3>
                            {g.summary && <p className="hm-card-text">{g.summary}</p>}
                            <Chips tags={g.tags} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function Education({ L, entries }: { L: XpLabels; entries: XpEntry[] }) {
    return (
        <section id="education" className="hm-section hm-alt" aria-labelledby="education-h">
            <div className="hm-wrap">
                <SectionHead id="education-h" eyebrow={label(L, 'sections.education.eyebrow')} title={label(L, 'sections.education.title')} />
                <ul className="hm-edu" data-reveal="stagger">
                    {entries.map((e) => (
                        <li key={e.slug} className="hm-card hm-edu-card" data-tilt>
                            {e.period && <p className="hm-eyebrow">{e.period}</p>}
                            <h3 className="hm-card-title xp-display">{e.title}</h3>
                            {e.subtitle && <p className="hm-role-co">{e.subtitle}</p>}
                            {e.location && <p className="hm-meta"><span>{e.location}</span></p>}
                            {e.summary && <p className="hm-card-text">{e.summary}</p>}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export function Center({ L, experiences }: { L: XpLabels; experiences: HomeData['experiences'] }) {
    const open = label(L, 'sections.experiences.open');
    return (
        <section id="experiences" className="hm-section" aria-labelledby="experiences-h">
            <div className="hm-wrap">
                <SectionHead id="experiences-h" eyebrow={label(L, 'sections.experiences.eyebrow')} title={label(L, 'sections.experiences.title')} />
                <ul className="hm-xgrid" data-reveal="stagger">
                    {experiences.map((x) => (
                        <li key={x.id}>
                            <Link href={`/experience/${x.id}/`} className="hm-xcard hm-press" data-xp={x.id} data-tilt>
                                <span className="hm-xswatch" aria-hidden="true">
                                    <span className="xp-display">{x.title}</span>
                                    <span className="hm-xdots">
                                        {Object.keys(x.palette.light).filter((k) => k.startsWith('brand')).map((k) => (
                                            <span key={k} style={{ background: `var(--xp-${k})` }} />
                                        ))}
                                    </span>
                                </span>
                                <span className="hm-xbody">
                                    <span className="hm-card-title xp-display">{x.title}</span>
                                    {x.card.tagline && <span className="hm-xtag">{x.card.tagline}</span>}
                                    {x.card.blurb && <span className="hm-card-text">{x.card.blurb}</span>}
                                    <span className="hm-more">{open} <Arrow /></span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export function Contact({ L, contact }: { L: XpLabels; contact: XpContact[] }) {
    return (
        <section id="contact" className="hm-section hm-contact" aria-labelledby="contact-h">
            <div className="hm-wrap">
                <SectionHead id="contact-h" eyebrow={label(L, 'sections.contact.eyebrow')} title={label(L, 'sections.contact.title')} />
                {label(L, 'sections.contact.lead') && <p className="hm-lead hm-contact-lead" data-reveal>{label(L, 'sections.contact.lead')}</p>}
                <ul className="hm-rows" data-reveal="stagger">
                    {contact.filter((c) => c.url).map((c) => {
                        const external = !c.url!.startsWith('mailto:');
                        return (
                            <li key={c.url}>
                                <a href={c.url} className="hm-row xp-glass hm-press" data-tilt
                                    {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
                                    <span className="hm-row-text">
                                        <span className="hm-row-title xp-display">{c.title}</span>
                                        {c.subtitle && <span className="hm-row-sub">{c.subtitle}</span>}
                                    </span>
                                    <span className="hm-row-icon" aria-hidden="true"><Arrow /></span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
