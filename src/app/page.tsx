import { Box } from '@mui/material';
import { Layout } from '@/components/Layout';
import ModelStatusBanner from '@/components/ModelStatusBanner';
import { Section, AboutSection, SkillsSection, ContactSection } from '@/components/Resume';
import { HeroSwitcher } from '@/components/Hero';
import { getContent, getAbout, getSkills, getContact } from '@/lib/content';

export default async function Home() {
  const [experience, projects, education, about, skills, contact] = await Promise.all([
    getContent('02-experience'),
    getContent('03-projects'),
    getContent('01-education'),
    getAbout(),
    getSkills(),
    getContact(),
  ]);

  return (
    <Layout>
      {/* Hero — full-width, outside constrained box */}
      <HeroSwitcher />

      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
        <ModelStatusBanner />

        <AboutSection items={about} />

        <Section
          id="experience"
          title="Experience"
          items={experience}
          variant="timeline"
        />

        <Section
          id="projects"
          title="Projects"
          items={projects}
          variant="grid"
        />

        <Section
          id="education"
          title="Education"
          items={education}
          variant="timeline"
        />

        <SkillsSection items={skills} />

        <ContactSection items={contact} />
      </Box>
    </Layout>
  );
}
