import type { HomeData } from '../types';
import { label } from '@/xp/label';
import { scopeCss } from '@/xp/load';
import DeskScene from '../scene/DeskScene';
import Nav, { type NavItem } from './Nav';
import Motion from './Motion';
import HeroActions from './HeroActions';
import SectionHead from './SectionHead';
import Experience from './Experience';
import { Projects, Skills, Education, Center, Contact } from './Blocks';
import { labelObjects } from '@/xp/label';
import '../home.css';

/**
 * `/` — an Apple product-page reading of the résumé. Server-rendered; the only
 * client islands are the nav, the motion engine, the hero buttons and the
 * role disclosures. Every word is from home.md or the résumé content.
 */
export default function HomePage({ data }: { data: HomeData }) {
    const L = data.config.labels;
    const { profile } = data.resume;
    const items = labelObjects<NavItem>(L, 'nav.items').filter((i) => typeof i.id === 'string');
    const has = (id: string) => items.some((i) => i.id === id);
    const cardCss = data.experiences.map((x) => scopeCss(`.hm .hm-xcard[data-xp="${x.id}"]`, x.palette, {})).join('');
    const [lead, ...rest] = profile.paragraphs.length ? profile.paragraphs : [profile.summary];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: cardCss }} />
            <a className="hm-skip xp-glass-btn" href="#main">{label(L, 'nav.skip')}</a>
            <Nav
                brand={label(L, 'nav.brand', profile.name)}
                items={items}
                resume={label(L, 'nav.resume')}
                resumeHref={label(L, 'nav.resumeHref')}
                menu={label(L, 'nav.menu')}
                close={label(L, 'nav.close')}
                light={label(L, 'nav.light')}
                dark={label(L, 'nav.dark')}
                navLabel={label(L, 'nav.label')}
            />
            <Motion />
            <main id="main" tabIndex={-1}>
                <section className="hm-hero" aria-labelledby="hm-name">
                    <div className="hm-hero-stage"><DeskScene scene={data.config.scene} /></div>
                    <div className="hm-hero-copy">
                        <div className="hm-hero-inner">
                            {data.config.eyebrow && <p className="hm-eyebrow">{data.config.eyebrow}</p>}
                            <h1 id="hm-name" className="hm-name xp-display">{profile.name || data.config.title}</h1>
                            {profile.headline && <p className="hm-headline">{profile.headline}</p>}
                            {profile.proof && <p className="hm-proof">{profile.proof}</p>}
                            <HeroActions
                                primary={label(L, 'hero.primary')}
                                primaryHref={label(L, 'hero.primaryHref', '#experience')}
                                secondary={label(L, 'hero.secondary')}
                            />
                            {profile.highlights.length > 0 && (
                                <ul className="hm-chips hm-hero-chips" aria-label={label(L, 'hero.highlights')}>
                                    {profile.highlights.map((h) => <li key={h} className="hm-chip xp-glass">{h}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                {has('about') && (
                    <section id="about" className="hm-section hm-about" aria-labelledby="about-h">
                        <div className="hm-wrap hm-split">
                            <SectionHead id="about-h" eyebrow={label(L, 'sections.about.eyebrow')} title={label(L, 'sections.about.title')} sticky />
                            <div data-reveal="stagger">
                                {lead && <p className="hm-lead">{lead}</p>}
                                {rest.map((p) => <p key={p} className="hm-para">{p}</p>)}
                            </div>
                        </div>
                    </section>
                )}
                {has('experience') && <Experience L={L} entries={data.resume.experience} />}
                {has('projects') && <Projects L={L} entries={data.resume.projects} />}
                {has('skills') && <Skills L={L} groups={data.resume.skills} />}
                {has('education') && <Education L={L} entries={data.resume.education} />}
                {has('experiences') && <Center L={L} experiences={data.experiences} />}
                {has('contact') && <Contact L={L} contact={data.resume.contact} />}
            </main>
            <footer className="hm-footer">
                <div className="hm-wrap hm-footer-row">
                    <p>{label(L, 'footer.note')}</p>
                    <a href="#main" className="hm-press hm-link">{label(L, 'footer.top')}</a>
                </div>
            </footer>
        </>
    );
}
