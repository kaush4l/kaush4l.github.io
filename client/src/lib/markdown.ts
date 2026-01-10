import { marked } from 'marked';

export interface MarkdownContent {
  title: string;
  timeline: string;
  summary: string;
  takeaways: string[];
  tags?: string[];
  content: string;
}

export const parseMarkdown = (markdown: string): MarkdownContent => {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontMatterRegex);

  if (!match) {
    throw new Error('Invalid markdown format: No front matter found');
  }

  const [_, frontMatter, content] = match;
  const metadata: any = {};

  frontMatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      if (key === 'takeaways') {
        metadata[key] = value
          .replace(/[\[\]]/g, '')
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, ''));
      } else if (key === 'tags') {
        metadata[key] = value
          .replace(/[\[\]]/g, '')
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, ''));
      } else {
        metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });

  const parsedContent = marked(content.trim());

  return {
    title: metadata.title || '',
    timeline: metadata.timeline || '',
    summary: metadata.summary || '',
    takeaways: metadata.takeaways || [],
    tags: metadata.tags || [],
    content: parsedContent
  };
};
