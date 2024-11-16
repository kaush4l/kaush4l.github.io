import { useEffect, useState } from 'react';
import { ResumeCard } from './ResumeCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent, parseMarkdown } from '@/lib/markdown';
import useSWR, { mutate } from 'swr';

interface MainContentProps {
  section: string;
}

const prefetchContent = async () => {
  const sections = ['contact', 'work-experience', 'education', 'projects'];
  await Promise.all(
    sections.map(async (section) => {
      const key = `/api/content/${section}`;
      await mutate(key, fetch(key).then(r => r.json()), false);
    })
  );
};

export function MainContent({ section }: MainContentProps) {
  const { data: content, error } = useSWR<string[]>(
    `/api/content/${section}`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    }
  );

  const [parsedContent, setParsedContent] = useState<MarkdownContent[]>([]);

  // Prefetch all content on mount
  useEffect(() => {
    prefetchContent();
  }, []);

  useEffect(() => {
    let isActive = true;
    
    const updateContent = async () => {
      if (!content || !isActive) return;
      
      // Clear content immediately when section changes
      setParsedContent([]);
      
      try {
        const parsed = content.map(md => parseMarkdown(md));
        if (isActive) {
          setParsedContent(parsed);
        }
      } catch (error) {
        console.error('Error parsing content:', error);
        if (isActive) {
          setParsedContent([]);
        }
      }
    };
    
    updateContent();
    
    return () => {
      isActive = false;
      setParsedContent([]); // Ensure cleanup
    };
  }, [content, section]);

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Error loading content: {error.message}
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 capitalize">
          {section.replace('-', ' ')}
        </h2>
        <div className="space-y-6">
          {parsedContent.map((item, index) => (
            <ResumeCard key={index} content={item} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
