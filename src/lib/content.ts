import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { ContentItem, SiteSection, SectionLayout, SectionAccent, NavItem } from './contentTypes';

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
        // Education declares `coursework` instead of `tools`: classes taken are not
        // production technologies and must not render in the same chip token.
        coursework: matterResult.data.coursework,
        quote: matterResult.data.quote,
        link: matterResult.data.link,
        // Extended fields
        category: matterResult.data.category,
        icon: matterResult.data.icon,
        url: matterResult.data.url,
        location: matterResult.data.location,
        // The agency an engagement was staffed through — rendered in the meta
        // caption so the client, not the staffing firm, owns the dominant line.
        via: matterResult.data.via,
        featured: matterResult.data.featured ?? false,
        // Hero fields, authored on the about entry (F1).
        headline: matterResult.data.headline,
        proof: matterResult.data.proof,
        highlights: matterResult.data.highlights,
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

// ─── Metadata-driven sections ─────────────────────────────────────────────────

interface SectionMeta {
    title: string;
    layout: SectionLayout;
    icon: string;
    accent: SectionAccent;
    sort: 'asc' | 'desc';
    /** Optional authored copy: passed through untouched when declared. */
    prompts?: string[];
    statement?: string;
    intro?: string;
}

/** Narrow an unknown frontmatter value to a non-empty string array. */
function stringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const strings = value.filter((v): v is string => typeof v === 'string');
    return strings.length > 0 ? strings : undefined;
}

const VALID_LAYOUTS: SectionLayout[] = ['timeline', 'grid', 'skills', 'about', 'contact'];
const VALID_ACCENTS: SectionAccent[] = ['primary', 'secondary'];

/**
 * Read a section's `_section.md` frontmatter, falling back to defaults derived
 * from the folder name. This is the single source of truth for how a section is
 * presented — no section styling or ordering is hardcoded in components.
 */
function readSectionMeta(folderName: string, id: string): SectionMeta {
    const defaults: SectionMeta = {
        title: humanize(id),
        layout: 'timeline',
        icon: 'folder',
        accent: 'primary',
        sort: 'asc',
    };

    const metaPath = path.join(contentDirectory, folderName, '_section.md');
    if (!fs.existsSync(metaPath)) return defaults;

    const { data } = matter(fs.readFileSync(metaPath, 'utf8'));
    return {
        title: typeof data.title === 'string' ? data.title : defaults.title,
        layout: VALID_LAYOUTS.includes(data.layout) ? (data.layout as SectionLayout) : defaults.layout,
        icon: typeof data.icon === 'string' ? data.icon : defaults.icon,
        accent: VALID_ACCENTS.includes(data.accent) ? (data.accent as SectionAccent) : defaults.accent,
        sort: data.sort === 'desc' ? 'desc' : data.sort === 'asc' ? 'asc' : defaults.sort,
        prompts: stringArray(data.prompts),
        statement: typeof data.statement === 'string' ? data.statement : undefined,
        intro: typeof data.intro === 'string' ? data.intro : undefined,
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
            const sorted = await getContent(dir.name, meta.sort === 'asc');
            // `featured` outranks the section's own sort: serial position means the
            // first slots are the only ones reliably read, so the strongest entries
            // are pinned there regardless of filename order.
            const items = [
                ...sorted.filter((i) => i.featured),
                ...sorted.filter((i) => !i.featured),
            ];
            return {
                id,
                order,
                title: meta.title,
                layout: meta.layout,
                icon: meta.icon,
                accent: meta.accent,
                items,
                prompts: meta.prompts,
                statement: meta.statement,
                intro: meta.intro,
            };
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
