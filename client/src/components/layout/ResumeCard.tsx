import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MarkdownContent } from "@/lib/markdown";
import { useState, useEffect, useMemo, memo } from "react";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DynamicMarkdownEditor } from '../editor/DynamicMarkdownEditor';
import { MarkdownDisplay } from '@/components/shared/MarkdownDisplay';

interface ResumeCardProps {
  content: MarkdownContent;
}

export const ResumeCard = memo(({ content }: ResumeCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState<MarkdownContent>(content);
  const { toast } = useToast();

  // Add cleanup effect
  useEffect(() => {
    return () => {
      setIsEditing(false);
      setLocalContent(content);
    };
  }, [content]);

  // Persist changes in memory
  const handleSave = (updatedContent: MarkdownContent) => {
    setLocalContent(updatedContent);
    toast({
      title: "Changes saved",
      description: "Your changes have been saved successfully.",
    });
    setIsEditing(false);
  };

  // Memoize content to prevent unnecessary re-renders
  const memoizedContent = useMemo(() => localContent, [localContent]);

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Edit Content</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
        <DynamicMarkdownEditor
          initialContent={localContent}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <Card className="w-full mb-6 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <MarkdownDisplay content={memoizedContent} />
      </CardContent>
    </Card>
  );
});

ResumeCard.displayName = 'ResumeCard';
