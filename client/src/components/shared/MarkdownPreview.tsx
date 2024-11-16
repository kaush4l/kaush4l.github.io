import { memo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';

interface LivePreviewProps {
  markdown: string;
}

export const LivePreview = memo(({ markdown }: LivePreviewProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <MarkdownPreview source={markdown} />
    </div>
  );
});

LivePreview.displayName = 'LivePreview';
