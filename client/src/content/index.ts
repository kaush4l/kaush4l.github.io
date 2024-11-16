import type { MarkdownContent } from '@/lib/markdown';
import { parseMarkdown } from '@/lib/markdown';

export async function loadContent(section: string): Promise<MarkdownContent[]> {
  try {
    const response = await fetch(`/api/content/${section}`);
    if (!response.ok) {
      throw new Error('Failed to load content');
    }
    const markdownFiles = await response.json();
    return markdownFiles.map(parseMarkdown);
  } catch (error) {
    console.error('Error loading content:', error);
    return [];
  }
}

// Initial empty content map
const contentMap: Record<string, MarkdownContent[]> = {
  contact: [],
  'work-experience': [],
  education: [],
  projects: []
};

export const content: Record<string, MarkdownContent[]> = contentMap;
export default content;
