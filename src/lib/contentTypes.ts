/**
 * Content item types for markdown-based content system
 */

export interface ContentItem {
    slug: string;
    title: string;
    subtitle?: string;
    period?: string;
    description?: string;
    tags?: string[];  // Alias for tools
    tools?: string[]; // Alias for tags
    quote?: string;
    link?: string;
    contentHtml: string;
    // Extended fields for About / Skills / Contact sections
    category?: string;    // e.g. skill category like 'Languages', 'Cloud'
    icon?: string;        // optional icon name hint
    url?: string;         // contact/project URL
    location?: string;    // used in experience entries
    featured?: boolean;   // pin to top of grid
}

export interface Section {
    id: string;
    name: string;
    items: ContentItem[];
}

/**
 * Render layouts a section can declare in its `_section.md` frontmatter.
 * The page never hardcodes a layout — it reads this value per folder.
 */
export type SectionLayout = 'timeline' | 'grid' | 'skills' | 'about' | 'contact';

/**
 * A fully-resolved content section: identity + presentation metadata + entries.
 * Everything here is derived from the folder name and the folder's `_section.md`,
 * never from hardcoded component logic.
 */
export interface SiteSection {
    id: string;            // slug derived from folder name, e.g. 'experience'
    title: string;         // display title from metadata or derived from folder name
    layout: SectionLayout; // which renderer to use
    icon: string;          // icon registry key, e.g. 'work'
    order: number;         // numeric folder prefix (controls page order)
    items: ContentItem[];  // entries, pre-sorted per the section's `sort` field
}

/** Navigation entry derived from a SiteSection (used by the Sidebar). */
export interface NavItem {
    id: string;
    title: string;
    icon: string;
    href: string;          // e.g. '/#experience'
}

export interface AMAContent {
    slug: string;
    title: string;
    category: 'education' | 'experience' | 'projects' | 'skills' | 'personal';
    topics: string[];
    dateRange?: string;
    contentHtml: string;
}
