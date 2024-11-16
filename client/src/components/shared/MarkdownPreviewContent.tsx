import { memo, useMemo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { useTheme } from '@/components/theme/ThemeProvider';

interface MarkdownPreviewContentProps {
  markdown: string;
}

export const MarkdownPreviewContent = memo(({ markdown }: MarkdownPreviewContentProps) => {
  const { theme } = useTheme();
  
  const previewProps = useMemo(() => ({
    source: markdown,
    wrapperElement: {
      'data-color-mode': theme.appearance === 'dark' ? 'dark' : 'light'
    } as const,
    style: {
      backgroundColor: 'transparent'
    }
  }), [markdown, theme.appearance]);
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <MarkdownPreview {...previewProps} />
    </div>
  );
});

MarkdownPreviewContent.displayName = 'MarkdownPreviewContent';
