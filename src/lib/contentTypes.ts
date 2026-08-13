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
    coursework?: string[]; // education only — classes taken, NOT production tech (rendered as text, never chips)
    quote?: string;
    link?: string;
    contentHtml: string;
    // Extended fields for About / Skills / Contact sections
    category?: string;    // e.g. skill category like 'Languages', 'Cloud'
    icon?: string;        // optional icon name hint
    url?: string;         // contact/project URL
    location?: string;    // used in experience entries
    via?: string;         // experience only — the agency/contract an engagement was staffed through
    featured?: boolean;   // pin to the top of the section, ahead of the section's `sort`
    // ── Hero fields (about entry only) ───────────────────────────────────────
    headline?: string;    // the role line under the name
    proof?: string;       // years · employers · one number
    highlights?: string[];// technology chips shown above the fold
}

/** Palette role a section's chrome resolves against. */
export type SectionAccent = 'primary' | 'secondary';

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
    accent: SectionAccent; // palette role for the section's heading/chrome
    order: number;         // numeric folder prefix (controls page order)
    items: ContentItem[];  // entries: `featured` first, then the section's `sort` field
    // ── Optional passthroughs from `_section.md` ─────────────────────────────
    prompts?: string[];    // chat entry-point questions (about section)
    statement?: string;    // the page's closing line (contact section)
    intro?: string;        // one sentence above the section's entries (contact section)
}

/** Navigation entry derived from a SiteSection (used by the Sidebar). */
export interface NavItem {
    id: string;
    title: string;
    icon: string;
    href: string;          // e.g. '/#experience'
}

