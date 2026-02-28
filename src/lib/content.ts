import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { ContentItem, Section, AMAContent } from './contentTypes';

const contentDirectory = path.join(process.cwd(), 'content');

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

    const fileNames = fs.readdirSync(sectionPath).filter(f => f.endsWith('.md'));

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
