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

export interface AMAContent {
    slug: string;
    title: string;
    category: 'education' | 'experience' | 'projects' | 'skills' | 'personal';
    topics: string[];
    dateRange?: string;
    contentHtml: string;
}
