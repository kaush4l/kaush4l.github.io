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
import { Badge } from "@/components/ui/badge";
import { memo } from 'react';

interface MarkdownEditorProps {
  initialContent: MarkdownContent;
  onSave: (content: MarkdownContent) => void;
}

// Memoize the LivePreview component to prevent unnecessary re-renders
const LivePreview = memo(({ content }: { content: MarkdownContent }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {content.title}
          </h3>
          <p className="text-sm text-muted-foreground">{content.timeline}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {content.tags?.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-6 mt-4">
        <p className="text-foreground/90 text-lg">{content.summary}</p>
        
        {content.takeaways.length > 0 && (
          <div className="bg-accent/5 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-primary">Key Achievements</h4>
            <ul className="list-disc list-inside space-y-2">
              {content.takeaways.map((takeaway, index) => (
                <li key={index} className="text-foreground/80">
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div 
          className="prose prose-sm max-w-none mt-4 prose-headings:text-primary prose-a:text-primary hover:prose-a:text-primary/80"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>
    </div>
  );
});

LivePreview.displayName = 'LivePreview';

export default function MarkdownEditor({ initialContent, onSave }: MarkdownEditorProps) {
  const {
    frontMatter,
    setFrontMatter,
    markdownContent,
    setMarkdownContent,
    parseError,
    parsedContent,
    handleSave
  } = useMarkdownPreview(initialContent, onSave);

  return (
    <div className="space-y-6">
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={frontMatter.title || ''}
                  onChange={(e) => setFrontMatter(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Input
                  value={frontMatter.timeline || ''}
                  onChange={(e) => setFrontMatter(prev => ({ ...prev, timeline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  rows={3}
                  value={frontMatter.summary || ''}
                  onChange={(e) => setFrontMatter(prev => ({ ...prev, summary: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Takeaways (one per line)</Label>
                <Textarea
                  rows={4}
                  className="font-mono text-sm"
                  value={frontMatter.takeaways?.join('\n') || ''}
                  onChange={(e) => setFrontMatter(prev => ({
                    ...prev,
                    takeaways: e.target.value.split('\n').filter(Boolean)
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={frontMatter.tags?.join(', ') || ''}
                  onChange={(e) => setFrontMatter(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
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
        <Card className="p-6">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {parsedContent && <LivePreview content={parsedContent} />}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
