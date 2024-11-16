import { useEffect, useState } from 'react';
import { ResumeCard } from './ResumeCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MarkdownContent } from '@/lib/markdown';
import { loadContent } from '@/content';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface MainContentProps {
  section: string;
}

export function MainContent({ section }: MainContentProps) {
  const [sectionContent, setSectionContent] = useState<MarkdownContent[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      try {
        const content = await loadContent(section);
        setSectionContent(content);
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchContent();
  }, [section]);

  return (
    <div className="flex-1 h-screen overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold capitalize bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {section.replace('-', ' ')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                {editMode ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : (
                sectionContent.map((item, index) => (
                  <ResumeCard 
                    key={`${section}-${index}`}
                    content={item}
                    initialEditMode={editMode}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
