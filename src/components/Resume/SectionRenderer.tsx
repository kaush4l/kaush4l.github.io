'use client';

/**
 * SectionRenderer — dispatches a content-defined section to the right layout.
 * The home page never names a section or picks a layout: it just maps over
 * `getSiteSections()` and hands each descriptor here. Layout, title, icon and
 * order all come from the section's metadata (`_section.md` + folder name).
 */

import type { SiteSection } from '@/lib/contentTypes';
import { Section, AboutSection, SkillsSection, ContactSection } from '@/components/Resume';
import { SectionIcon } from '@/components/icons';

export default function SectionRenderer({ section }: { section: SiteSection }) {
    const { id, title, layout, icon, items } = section;

    if (items.length === 0) return null;

    switch (layout) {
        case 'about':
            return <AboutSection id={id} title={title} items={items} />;
        case 'skills':
            return <SkillsSection id={id} title={title} items={items} />;
        case 'contact':
            return <ContactSection id={id} title={title} items={items} />;
        case 'grid':
            return <Section id={id} title={title} items={items} variant="grid" icon={<SectionIcon name={icon} />} />;
        case 'timeline':
        default:
            return <Section id={id} title={title} items={items} variant="timeline" icon={<SectionIcon name={icon} />} />;
    }
}
