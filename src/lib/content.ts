import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { ContentItem, Section, AMAContent, SiteSection, SectionLayout, NavItem } from './contentTypes';

const contentDirectory = path.join(process.cwd(), 'content');

/**
 * Files that describe a section or document a folder are NOT content entries.
 * Entry files are plain `NN-name.md`; anything starting with `_` (e.g. the
 * `_section.md` metadata file) or a README is excluded.
 */
function isEntryFile(fileName: string): boolean {
    if (!fileName.endsWith('.md')) return false;
    if (fileName.startsWith('_')) return false;
    if (fileName.toLowerCase() === 'readme.md') return false;
    return true;
}

/** Title-case a folder slug: `cloud-devops` -> `Cloud Devops`. */
function humanize(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Default icon registry key per known section id; falls back to a generic key. */
const DEFAULT_SECTION_ICON: Record<string, string> = {
    education: 'school',
    experience: 'work',
    projects: 'code',
    about: 'person',
    skills: 'build',
    contact: 'contact',
};

/**
 * Strip HTML tags safely (handles edge cases better than a simple regex).
 * Used to extract plain-text snippets for the LLM system prompt.
 */
export function stripHtml(htmlStr: string): string {
    // Replace common block tags with a space to preserve word boundaries
    return htmlStr
        .replace(/<\/(p|li|h[1-6]|blockquote|div)>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Parse a single markdown file and return a ContentItem.
 */
async function parseMarkdownFile(fullPath: string): Promise<ContentItem> {
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);
    const slug = path.basename(fullPath).replace(/\.md$/, '');

    const processedContent = await remark()
        .use(html)
        .process(matterResult.content);
    const contentHtml = processedContent.toString();

    return {
        slug,
        contentHtml,
        title: matterResult.data.title || slug,
        subtitle: matterResult.data.subtitle,
        period: matterResult.data.period,
        description: matterResult.data.description,
        // Support both 'tags' and 'tools' frontmatter keys
        tags: matterResult.data.tags,
        tools: matterResult.data.tools,
        quote: matterResult.data.quote,
        link: matterResult.data.link,
        // Extended fields
        category: matterResult.data.category,
        icon: matterResult.data.icon,
        url: matterResult.data.url,
        location: matterResult.data.location,
        featured: matterResult.data.featured ?? false,
    } as ContentItem;
}

/**
 * Get all content items from a section folder.
 * Sorted descending by slug by default (newest / highest index first).
 */
export async function getContent(section: string, ascending = false): Promise<ContentItem[]> {
    const sectionPath = path.join(contentDirectory, section);

    if (!fs.existsSync(sectionPath)) {
        return [];
    }

    const fileNames = fs.readdirSync(sectionPath).filter(isEntryFile);

    const allContentData = await Promise.all(
        fileNames.map((fileName) =>
            parseMarkdownFile(path.join(sectionPath, fileName))
        )
    );

    return allContentData.sort((a, b) =>
        ascending ? a.slug.localeCompare(b.slug) : b.slug.localeCompare(a.slug)
    );
}

/**
 * Convenience wrappers for each named section
 */
export const getExperience = () => getContent('02-experience');
export const getProjects   = () => getContent('03-projects');
export const getEducation  = () => getContent('01-education', true);
export const getAbout      = () => getContent('04-about', true);
export const getSkills     = () => getContent('05-skills', true);
export const getContact    = () => getContent('06-contact', true);

// ─── Metadata-driven sections ─────────────────────────────────────────────────

interface SectionMeta {
    title: string;
    layout: SectionLayout;
    icon: string;
    sort: 'asc' | 'desc';
}

const VALID_LAYOUTS: SectionLayout[] = ['timeline', 'grid', 'skills', 'about', 'contact'];

/**
 * Read a section's `_section.md` frontmatter, falling back to defaults derived
 * from the folder name. This is the single source of truth for how a section is
 * presented — no section styling or ordering is hardcoded in components.
 */
function readSectionMeta(folderName: string, id: string): SectionMeta {
    const defaults: SectionMeta = {
        title: humanize(id),
        layout: 'timeline',
        icon: DEFAULT_SECTION_ICON[id] ?? 'folder',
        sort: 'asc',
    };

    const metaPath = path.join(contentDirectory, folderName, '_section.md');
    if (!fs.existsSync(metaPath)) return defaults;

    const { data } = matter(fs.readFileSync(metaPath, 'utf8'));
    return {
        title: typeof data.title === 'string' ? data.title : defaults.title,
        layout: VALID_LAYOUTS.includes(data.layout) ? (data.layout as SectionLayout) : defaults.layout,
        icon: typeof data.icon === 'string' ? data.icon : defaults.icon,
        sort: data.sort === 'desc' ? 'desc' : data.sort === 'asc' ? 'asc' : defaults.sort,
    };
}

/**
 * Resolve every content folder into a fully-described section: identity,
 * presentation metadata, and pre-sorted entries. The home page renders purely
 * from this list, so adding/removing/reordering a section is a folder change.
 */
export async function getSiteSections(): Promise<SiteSection[]> {
    if (!fs.existsSync(contentDirectory)) return [];

    const dirs = fs.readdirSync(contentDirectory, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d+-/.test(d.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    return Promise.all(
        dirs.map(async (dir) => {
            const id = dir.name.replace(/^\d+-/, '');
            const order = parseInt(dir.name.match(/^(\d+)-/)?.[1] ?? '0', 10);
            const meta = readSectionMeta(dir.name, id);
            const items = await getContent(dir.name, meta.sort === 'asc');
            return { id, order, title: meta.title, layout: meta.layout, icon: meta.icon, items };
        }),
    );
}

/** Navigation derived from sections — keeps the sidebar in sync with content. */
export async function getNav(): Promise<NavItem[]> {
    const sections = await getSiteSections();
    return sections
        .filter((s) => s.items.length > 0)
        .map((s) => ({ id: s.id, title: s.title, icon: s.icon, href: `/#${s.id}` }));
}

/**
 * Get all sections with their content
 */
export async function getAllSections(): Promise<Section[]> {
    const dirs = fs.readdirSync(contentDirectory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && /^\d+-/.test(dirent.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const sections = await Promise.all(
        dirs.map(async (dir) => {
            const items = await getContent(dir.name);
            // Extract display name from folder (e.g., "01-education" -> "Education")
            const name = dir.name
                .replace(/^\d+-/, '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase());

            return {
                id: dir.name.replace(/^\d+-/, ''),
                name,
                items,
            };
        })
    );

    return sections;
}

/**
 * Get AMA knowledge base content
 */
export async function getAMAContent(): Promise<AMAContent[]> {
    const amaPath = path.join(contentDirectory, 'ama');

    if (!fs.existsSync(amaPath)) {
        return [];
    }

    const fileNames = fs.readdirSync(amaPath).filter(f => f.endsWith('.md') && f !== 'README.md');

    const allContent = await Promise.all(
        fileNames.map(async (fileName) => {
            const slug = fileName.replace(/\.md$/, '');
            const fullPath = path.join(amaPath, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const matterResult = matter(fileContents);

            const processedContent = await remark()
                .use(html)
                .process(matterResult.content);
            const contentHtml = processedContent.toString();

            return {
                slug,
                title: matterResult.data.title || slug,
                category: matterResult.data.category || 'personal',
                topics: matterResult.data.topics || [],
                dateRange: matterResult.data.dateRange,
                contentHtml,
            } as AMAContent;
        })
    );

    return allContent.sort((a, b) => a.slug.localeCompare(b.slug));
}
