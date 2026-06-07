import { Box } from '@mui/material';
import { Layout } from '@/components/Layout';
import ModelStatusBanner from '@/components/ModelStatusBanner';
import { SectionRenderer } from '@/components/Resume';
import { HeroSwitcher } from '@/components/Hero';
import { getSiteSections } from '@/lib/content';

export default async function Home() {
  // Every section — its title, layout, icon, order and entries — comes from the
  // content/ folder structure. Nothing about the resume is hardcoded here.
  const sections = await getSiteSections();

  return (
    <Layout>
      {/* Hero — full-width visual lead-in, outside the constrained content box */}
      <HeroSwitcher />

      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
        <ModelStatusBanner />

        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </Box>
    </Layout>
  );
}
