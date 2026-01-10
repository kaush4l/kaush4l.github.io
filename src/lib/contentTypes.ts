/**
 * Content item types for markdown-based content system
 */

export interface ContentItem {
    slug: string;
    title: string;
    subtitle?: string;
    period?: string;
    description?: string;
    tags?: string[];
    tools?: string[]; // Alias for tags
    quote?: string;
    link?: string;
    contentHtml: string;
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
