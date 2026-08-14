import { Box } from '@mui/material';
import { Layout } from '@/components/Layout';
import { SectionRenderer } from '@/components/Resume';
import { HeroSwitcher } from '@/components/Hero';
import Reveal from '@/components/Motion/Reveal';
import { getSiteSections } from '@/lib/content';
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
  // Every section — its title, layout, icon, order and entries — comes from the
  // content/ folder structure. Nothing about the resume is hardcoded here.
  const sections = await getSiteSections();

  // The hero's headline, proof line and highlight tags live in the about entry's
  // frontmatter, not in the component. Located by layout so renaming or
  // reordering the content folders cannot break it.
  const about = sections.find((s) => s.layout === 'about')?.items[0];

  return (
    <Layout>
      {/* Structured data, derived from the same content the page renders. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPersonJsonLd(sections)),
        }}
      />
      {/* Hero — full-width visual lead-in, outside the constrained content box */}
      <HeroSwitcher about={about} />

      {/* Each section arrives on its own as it enters the frame. `Reveal` is a
          no-op under reduced motion and for anything already on screen at mount,
          and the hidden state is applied post-mount — so this HTML is complete
          and opaque for crawlers and for a visitor whose JS never runs. */}
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
        {sections.map((section) => (
          <Reveal key={section.id}>
            <SectionRenderer section={section} />
          </Reveal>
        ))}
      </Box>
    </Layout>
  );
}
