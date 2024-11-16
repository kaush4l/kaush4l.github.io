import { Badge } from "@/components/ui/badge";
import type { MarkdownContent } from '@/lib/markdown';

interface MarkdownDisplayProps {
  content: MarkdownContent;
}

export function MarkdownDisplay({ content }: MarkdownDisplayProps) {
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
}
