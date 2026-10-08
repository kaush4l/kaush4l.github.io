import Link from 'next/link';
import type { Metadata } from 'next';
import { getCenter, getExperiences, scopeCss } from '@/xp/load';
import XpControls from '@/xp/XpControls';

export async function generateMetadata(): Promise<Metadata> {
    const center = await getCenter();
    return { title: center.title, description: center.eyebrow || undefined };
}

/**
 * The Experience Center: one card per md file in `content/experiences/`.
 * Each card is painted with ITS experience's palette (the same scoped
 * custom properties that experience's page uses), so the shelf previews every
 * world honestly in both light and dark without a single colour written here.
 */
export default async function ExperienceCenter() {
    const [center, experiences] = await Promise.all([getCenter(), getExperiences()]);
    const css = [
        scopeCss('.xp-center', center.palette, center.tokens),
        ...experiences.map((x) => scopeCss(`.xpc-card[data-xp="${x.id}"]`, x.palette, {})),
    ].join('');
    return (
        <div className="xp xp-center">
            <style dangerouslySetInnerHTML={{ __html: css }} />
            <header className="xpc-bar xp-glass">
                <Link href="/" className="xpc-brand xp-display">{center.navLabel}</Link>
                <XpControls
                    backHref="/"
                    backLabel={center.backLabel}
                    lightLabel={center.lightLabel}
                    darkLabel={center.darkLabel}
                />
            </header>
            <main>
                <section className="xpc-hero" aria-labelledby="xpc-title">
                    {center.eyebrow && <p className="xpc-eyebrow">{center.eyebrow}</p>}
                    <h1 id="xpc-title" className="xpc-title xp-display">{center.title}</h1>
                    <div className="xpc-intro" dangerouslySetInnerHTML={{ __html: center.introHtml }} />
                </section>
                <ul className="xpc-grid">
                    {experiences.map((x) => (
                        <li key={x.id}>
                            <Link href={`/experience/${x.id}/`} className="xpc-card" data-xp={x.id}
                                style={{ ['--card-bg' as string]: 'var(--xp-bg)', ['--card-fg' as string]: 'var(--xp-text)' }}>
                                <div className="xpc-swatch" aria-hidden="true">
                                    <span className="xpc-swatch-word xp-display">{x.title}</span>
                                    <span className="xpc-swatch-dots">
                                        {Object.keys(x.palette.light).filter((k) => k.startsWith('brand')).map((k) => (
                                            <span key={k} style={{ background: `var(--xp-${k})` }} />
                                        ))}
                                    </span>
                                </div>
                                <div className="xpc-body">
                                    <h2 className="xpc-name xp-display">{x.title}</h2>
                                    {x.card.tagline && <p className="xpc-tagline">{x.card.tagline}</p>}
                                    {x.card.blurb && <p className="xpc-blurb">{x.card.blurb}</p>}
                                    <span className="xpc-open">{center.openLabel} <span aria-hidden="true">→</span></span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
