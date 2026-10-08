import type { XpEntry, XpLabels } from '@/xp/types';
import { label } from '@/xp/label';
import SectionHead from './SectionHead';
import Disclosure from './Disclosure';

export default function Experience({ L, entries }: { L: XpLabels; entries: XpEntry[] }) {
    const present = label(L, 'sections.experience.present');
    let lastYear: number | undefined;
    return (
        <section id="experience" className="hm-section" aria-labelledby="experience-h">
            <div className="hm-wrap">
                <SectionHead id="experience-h" eyebrow={label(L, 'sections.experience.eyebrow')} title={label(L, 'sections.experience.title')} />
                <ol className="hm-timeline" data-timeline>
                    <span className="hm-tl-rail" aria-hidden="true"><span className="hm-tl-fill" /></span>
                    {entries.map((e) => {
                        const marker = e.year !== undefined && e.year !== lastYear ? e.year : undefined;
                        lastYear = e.year ?? lastYear;
                        return (
                            <li key={e.slug} className="hm-tl-item">
                                {marker !== undefined && <span className="hm-tl-year" aria-hidden="true">{marker}</span>}
                                <span className="hm-tl-dot" aria-hidden="true" />
                                <article className="hm-card hm-role" data-reveal data-tilt>
                                    <header className="hm-role-head">
                                        <div>
                                            <h3 className="hm-role-title">{e.title}</h3>
                                            {e.subtitle && <p className="hm-role-co">{e.subtitle}</p>}
                                        </div>
                                        <p className="hm-meta">
                                            {e.period && <span>{e.period.replace(/present/i, present || 'Present')}</span>}
                                            {e.location && <span>{e.location}</span>}
                                        </p>
                                    </header>
                                    {e.summary && <p className="hm-role-sum">{e.summary}</p>}
                                    {e.tags.length > 0 && <ul className="hm-chips">{e.tags.map((t) => <li key={t} className="hm-chip" data-magnet>{t}</li>)}</ul>}
                                    {e.bullets.length > 0 && (
                                        <Disclosure more={label(L, 'sections.experience.more')} less={label(L, 'sections.experience.less')} bullets={e.bullets} />
                                    )}
                                </article>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
