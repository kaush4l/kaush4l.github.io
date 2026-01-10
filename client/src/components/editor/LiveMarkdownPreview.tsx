import { memo, useMemo } from 'react';
import { MarkdownPreviewContent } from '@/components/shared/MarkdownPreviewContent';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MarkdownContent } from '@/lib/markdown';

interface LiveMarkdownPreviewProps {
  content: MarkdownContent;
}

export const LiveMarkdownPreview = memo(({ content }: LiveMarkdownPreviewProps) => {
  const previewContent = useMemo(() => {
    const takeawaysSection = content.takeaways?.length > 0
      ? "\n\n## Key Achievements\n" + content.takeaways.map(t => `- ${t}`).join("\n")
      : "";

    const tagsSection = content.tags?.length > 0
      ? "\n\n## Tags\n" + content.tags.map(t => `#${t}`).join(" ")
      : "";

    return `# ${content.title}
*${content.timeline}*

${content.summary}
${takeawaysSection}
${tagsSection}
${content.content}`;
  }, [content]);

  return (
    <Card className="h-full">
      <ScrollArea className="h-[calc(100vh-16rem)] p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownPreviewContent markdown={previewContent} />
        </div>
      </ScrollArea>
    </Card>
  );
});

LiveMarkdownPreview.displayName = 'LiveMarkdownPreview';
