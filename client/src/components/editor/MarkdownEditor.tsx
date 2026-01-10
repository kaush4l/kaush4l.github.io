import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMarkdownPreview } from '@/hooks/useMarkdownPreview';
import type { MarkdownContent } from '@/lib/markdown';
import { memo, useCallback, useEffect } from 'react';
import { MarkdownPreviewContent } from '@/components/shared/MarkdownPreviewContent';

interface MarkdownEditorProps {
  initialContent: MarkdownContent;
  onSave: (content: MarkdownContent) => void;
}

function MarkdownEditor({ initialContent, onSave }: MarkdownEditorProps) {
  const {
    frontMatter,
    setFrontMatter,
    markdownContent,
    setMarkdownContent,
    parseError,
    parsedContent,
    handleSave,
    rawMarkdown
  } = useMarkdownPreview(initialContent, onSave);

  const handleInputChange = useCallback((field: keyof MarkdownContent, value: string) => {
    setFrontMatter(prev => ({ ...prev, [field]: value }));
  }, [setFrontMatter]);

  const handleTakeawaysChange = useCallback((value: string) => {
    setFrontMatter(prev => ({
      ...prev,
      takeaways: value.split('\n').filter(Boolean)
    }));
  }, [setFrontMatter]);

  const handleTagsChange = useCallback((value: string) => {
    setFrontMatter(prev => ({
      ...prev,
      tags: value.split(',').map(tag => tag.trim()).filter(Boolean)
    }));
  }, [setFrontMatter]);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}
        <Card className="p-6">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={frontMatter.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Input
                  value={frontMatter.timeline || ''}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  rows={3}
                  value={frontMatter.summary || ''}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Takeaways (one per line)</Label>
                <Textarea
                  rows={4}
                  className="font-mono text-sm"
                  value={frontMatter.takeaways?.join('\n') || ''}
                  onChange={(e) => handleTakeawaysChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={frontMatter.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown)</Label>
                <Textarea
                  rows={10}
                  className="font-mono text-sm"
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Enter your markdown content here..."
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="sticky top-0">
        <Card className="h-full">
          <ScrollArea className="h-[calc(100vh-16rem)] p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownPreviewContent markdown={rawMarkdown} />
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

export default memo(MarkdownEditor);
