import { getSiteSections } from '@/lib/content';
import { buildResumeCorpus } from '@/lib/resumeContext';
import { scopeCss } from '@/xp/load';
import { getHome } from '@/home/load';
import HomeShell from '@/home/HomeShell';
import HomePage from '@/home/sections/HomePage';
import type { SiteSection } from '@/lib/contentTypes';

/**
 * Person JSON-LD, derived entirely from the content folders — no hardcoded
 * résumé facts. The site already models `worksFor`, `alumniOf`, `knowsAbout`
 * and `sameAs` in typed frontmatter; this just emits what is already there.
 *
 * Layout is the discriminator rather than the folder name, so renaming or
 * reordering a section (as `03-experience` → `02-…` did) cannot break this.
 */
function buildPersonJsonLd(sections: SiteSection[]) {
  const byLayout = (layout: SiteSection['layout']) =>
    sections.find((s) => s.layout === layout);
  const byId = (id: string) => sections.find((s) => s.id === id);

  const about = byLayout('about')?.items[0];
  const contact = byLayout('contact')?.items ?? [];
  const skills = byLayout('skills')?.items ?? [];
  const experience = byId('experience')?.items ?? [];
  const education = byId('education')?.items ?? [];

  // Contact entries carry `url`; mailto: is an email, everything else is a profile.
  const emailEntry = contact.find((c) => c.url?.startsWith('mailto:'));
  const profiles = contact
    .map((c) => c.url)
    .filter((url): url is string => Boolean(url) && !url!.startsWith('mailto:'));

  // Employer/school live in `subtitle` — the same field the timeline promotes.
  const orgNames = (items: typeof experience, type: 'Organization' | 'EducationalOrganization') =>
    Array.from(new Set(items.map((i) => i.subtitle).filter(Boolean)))
      .map((name) => ({ '@type': type, name }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: about?.title,
    jobTitle: about?.subtitle,
    homeLocation: about?.location ? { '@type': 'Place', name: about.location } : undefined,
    email: emailEntry?.url?.replace(/^mailto:/, ''),
    sameAs: profiles.length ? profiles : undefined,
    knowsAbout: skills.flatMap((s) => s.tags ?? s.tools ?? []),
    worksFor: orgNames(experience, 'Organization'),
    alumniOf: orgNames(education, 'EducationalOrganization'),
  };
}

export default async function Home() {
  // Résumé content comes from content/0*-*; every word, colour and camera angle
  // of the page itself comes from content/home/home.md.
  const [sections, data] = await Promise.all([getSiteSections(), getHome()]);
  const prompts = sections.find((s) => s.layout === 'about')?.prompts;
  return (
    <HomeShell resumeCorpus={buildResumeCorpus(sections)} suggestedPrompts={prompts}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPersonJsonLd(sections)) }}
      />
      <div className="xp hm">
        <style dangerouslySetInnerHTML={{ __html: scopeCss('.hm', data.config.palette, data.config.tokens) }} />
        <HomePage data={data} />
      </div>
    </HomeShell>
  );
}
