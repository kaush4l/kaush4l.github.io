import { memo } from 'react';
import { MarkdownPreviewContent } from '@/components/shared/MarkdownPreviewContent';
import type { MarkdownContent } from '@/lib/markdown';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownPreviewProps {
  content: MarkdownContent;
}

export const MarkdownPreview = memo(({ content }: MarkdownPreviewProps) => {
  const previewContent = `# ${content.title}
*${content.timeline}*

${content.summary}

## Key Achievements
${content.takeaways.map(t => `- ${t}`).join('\n')}

## Tags
${content.tags?.map(t => `#${t}`).join(' ')}

${content.content}`;

  return (
    <Card className="h-full">
      <ScrollArea className="h-[calc(100vh-16rem)] p-6">
        <MarkdownPreviewContent markdown={previewContent} />
      </ScrollArea>
    </Card>
  );
});

MarkdownPreview.displayName = 'MarkdownPreview';
