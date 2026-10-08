import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenter, getExperience, getExperiences, getResume, scopeCss } from '@/xp/load';
import { THEMES } from '@/xp/registry';

export const dynamicParams = false;

/** Every md file in content/experiences/ becomes a route at build time. */
export async function generateStaticParams() {
    const all = await getExperiences();
    for (const x of all) {
        if (!THEMES[x.theme]) {
            throw new Error(`content/experiences/${x.id}.md: unknown theme "${x.theme}". Known: ${Object.keys(THEMES).join(', ')}`);
        }
    }
    return all.map((x) => ({ id: x.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const x = await getExperience(id);
    return x ? { title: x.title, description: x.card.blurb || x.card.tagline || undefined } : {};
}

export default async function ExperiencePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const config = await getExperience(id);
    if (!config) notFound();
    const Theme = THEMES[config.theme];
    if (!Theme) notFound();
    const center = await getCenter();
    const resume = await getResume(center.sources);
    return (
        <div className={`xp xp--${config.theme}`} data-xp={config.id}>
            <style dangerouslySetInnerHTML={{ __html: scopeCss(`.xp[data-xp="${config.id}"]`, config.palette, config.tokens) }} />
            <Theme config={config} resume={resume} />
        </div>
    );
}
