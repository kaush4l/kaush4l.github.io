import { Box } from '@mui/material';
import { Layout } from '@/components/Layout';
import { Section } from '@/components/Resume';
import { getContent } from '@/lib/content';

export default async function Home() {
  const experience = await getContent('02-experience');
  const projects = await getContent('03-projects');
  const education = await getContent('01-education');

  const sections = [
    { id: 'experience', title: 'Experience', items: experience, variant: 'timeline' as const },
    { id: 'projects', title: 'Projects', items: projects, variant: 'grid' as const },
    { id: 'education', title: 'Education', items: education, variant: 'timeline' as const },
  ];

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {sections.map((section) => (
          <Section
            key={section.id}
            id={section.id}
            title={section.title}
            items={section.items}
            variant={section.variant}
          />
        ))}
      </Box>
    </Layout>
  );
}
