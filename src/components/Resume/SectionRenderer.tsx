'use client';

/**
 * SectionRenderer — dispatches a content-defined section to the right layout.
 * The home page never names a section or picks a layout: it just maps over
 * `getSiteSections()` and hands each descriptor here. Layout, title, icon,
 * accent and order all come from the section's metadata (`_section.md` +
 * folder name).
 */

import type { SiteSection } from '@/lib/contentTypes';
import { Section, AboutSection, SkillsSection, ContactSection } from '@/components/Resume';

export default function SectionRenderer({ section }: { section: SiteSection }) {
    const { id, title, layout, icon, accent, items, intro } = section;

    if (items.length === 0) return null;

    const common = { id, title, icon, accent, items };

    switch (layout) {
        case 'about':
            return <AboutSection {...common} />;
        case 'skills':
            return <SkillsSection {...common} />;
        case 'contact':
            return <ContactSection {...common} intro={intro} />;
        case 'grid':
            return <Section {...common} variant="grid" intro={intro} />;
        case 'timeline':
        default:
            return <Section {...common} variant="timeline" intro={intro} />;
    }
}
