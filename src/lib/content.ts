import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { ContentItem, Section, AMAContent } from './contentTypes';

const contentDirectory = path.join(process.cwd(), 'content');

/**
 * Get all content items from a section folder
 */
export async function getContent(section: string): Promise<ContentItem[]> {
    const sectionPath = path.join(contentDirectory, section);

    if (!fs.existsSync(sectionPath)) {
        return [];
    }

    const fileNames = fs.readdirSync(sectionPath).filter(f => f.endsWith('.md'));

    const allContentData = await Promise.all(
        fileNames.map(async (fileName) => {
            const slug = fileName.replace(/\.md$/, '');
            const fullPath = path.join(sectionPath, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const matterResult = matter(fileContents);

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
                tools: matterResult.data.tools,
                quote: matterResult.data.quote,
                link: matterResult.data.link,
            } as ContentItem;
        })
    );

    // Sort by slug descending (Newest/Highest number first)
    return allContentData.sort((a, b) => b.slug.localeCompare(a.slug));
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
