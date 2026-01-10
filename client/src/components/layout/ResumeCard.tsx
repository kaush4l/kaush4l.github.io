import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MarkdownContent } from "@/lib/markdown";
import { useState, useEffect, useCallback, memo } from "react";
import { Edit, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DynamicMarkdownEditor } from '../editor/DynamicMarkdownEditor';
import { MarkdownDisplay } from '@/components/shared/MarkdownDisplay';
import { useLocation } from 'wouter';

interface ResumeCardProps {
  content: MarkdownContent;
  initialEditMode?: boolean;
}

export const ResumeCard = memo(({ content, initialEditMode = false }: ResumeCardProps) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const { toast } = useToast();
  const [location] = useLocation();

  // Reset state when content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Reset editing state when initialEditMode changes
  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  // Update handler
  const handleContentUpdate = useCallback(async (updatedContent: MarkdownContent) => {
    try {
      const section = location.split('/')[1] || 'contact';
      const filename = `${section}1.md`; // Adjust filename based on your naming convention
      
      // Reconstruct markdown content
      const markdown = `---
title: "${updatedContent.title}"
timeline: "${updatedContent.timeline}"
summary: "${updatedContent.summary}"
takeaways:
${updatedContent.takeaways.map(t => `  - "${t}"`).join('\n')}
tags: [${updatedContent.tags?.map(t => `"${t}"`).join(', ')}]
---

${updatedContent.content}`;

      // Save to file
      const response = await fetch(`/api/content/${section}/${filename}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: markdown }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      // Update local state
      setLocalContent(updatedContent);
      toast({
        title: "Changes saved",
        description: "Your changes have been saved successfully.",
      });
      
      if (!initialEditMode) {
        setIsEditing(false);
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        variant: "destructive",
        title: "Error saving changes",
        description: "Please try again later.",
      });
    }
  }, [location, initialEditMode, toast]);

  if (isEditing) {
    const editorContent = (
      <div className="space-y-4">
        <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Edit Content
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
            {!initialEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setIsFullscreen(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
        <DynamicMarkdownEditor
          initialContent={localContent}
          onSave={handleContentUpdate}
        />
      </div>
    );

    if (isFullscreen) {
      return (
        <div className="fixed inset-0 bg-background z-50 overflow-auto p-6">
          {editorContent}
        </div>
      );
    }

    return editorContent;
  }

  return (
    <Card className="w-full mb-6 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row justify-end">
        {!initialEditMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <MarkdownDisplay content={localContent} />
      </CardContent>
    </Card>
  );
});

ResumeCard.displayName = 'ResumeCard';
