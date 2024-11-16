import { useState, useEffect, useCallback } from 'react';
import { MarkdownContent, parseMarkdown } from '@/lib/markdown';
import debounce from 'lodash/debounce';

export function useMarkdownPreview(initialContent: MarkdownContent, onSave?: (content: MarkdownContent) => void) {
  const [frontMatter, setFrontMatter] = useState<Partial<MarkdownContent>>({
    title: initialContent.title,
    timeline: initialContent.timeline,
    summary: initialContent.summary,
    takeaways: initialContent.takeaways,
    tags: initialContent.tags
  });
  const [markdownContent, setMarkdownContent] = useState(initialContent.content);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<MarkdownContent | null>(null);

  const reconstructMarkdown = useCallback(() => {
    const takeawaysStr = frontMatter.takeaways?.length 
      ? frontMatter.takeaways
          .map(takeaway => `  - "${takeaway}"`)
          .join('\n')
      : '';

    return `---
title: "${frontMatter.title || ''}"
timeline: "${frontMatter.timeline || ''}"
summary: "${frontMatter.summary || ''}"
takeaways:
${takeawaysStr}
tags: ${frontMatter.tags ? `[${frontMatter.tags.map(tag => `"${tag}"`).join(', ')}]` : '[]'}
---

${markdownContent}`;
  }, [frontMatter, markdownContent]);

  const parseContent = useCallback(() => {
    try {
      const fullMarkdown = reconstructMarkdown();
      const parsed = parseMarkdown(fullMarkdown);
      setParsedContent({
        ...parsed,
        takeaways: frontMatter.takeaways || []
      });
      setParseError(null);
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      setParseError(error instanceof Error ? error.message : 'Failed to parse markdown');
      setParsedContent(null);
    }
  }, [reconstructMarkdown, frontMatter.takeaways]);

  useEffect(() => {
    let isActive = true;
    const debouncedParse = debounce(() => {
      if (!isActive) return;
      parseContent();
    }, 300);

    debouncedParse();

    return () => {
      isActive = false;
      debouncedParse.cancel();
    };
  }, [frontMatter, markdownContent, parseContent]);

  const handleSave = useCallback(() => {
    if (parsedContent && onSave) {
      const updatedContent = {
        ...parsedContent,
        takeaways: frontMatter.takeaways || []
      };
      onSave(updatedContent);
    }
  }, [parsedContent, frontMatter.takeaways, onSave]);

  return {
    frontMatter,
    setFrontMatter,
    markdownContent,
    setMarkdownContent,
    parseError,
    parsedContent,
    handleSave
  };
}
