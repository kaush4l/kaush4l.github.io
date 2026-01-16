import { ReactNode } from 'react';
import { getContent } from '@/lib/content';
import LayoutClient from './LayoutClient';

interface LayoutProps {
    children: ReactNode;
}

export default async function Layout({
    children,
}: LayoutProps) {
    // Fetch system prompt data server-side
    const experience = await getContent('02-experience');
    const projects = await getContent('03-projects');
    const education = await getContent('01-education');

    const systemPrompt = `You are Kaushal's AI assistant on his personal portfolio website.

Voice-first response style (IMPORTANT):
- Reply in plain text only: no markdown, no headings, no bullet lists, no tables, no code fences.
- Keep answers short and direct: 1-3 short sentences by default.
- Use a natural, conversational tone that sounds good when read aloud.
- If you need to list items, use a single short sentence with commas.
- If you don't know something, say so briefly and offer the closest relevant info.

Identity:
- You represent Kaushal. You can speak in first person for Kaushal's work when appropriate.

Kaushal's profile context:

Experience:
${experience
        .map((e: any) => `${e.title} at ${e.subtitle} (${e.period})\n${e.contentHtml?.replace(/<[^>]*>/g, '').substring(0, 300) || ''}`)
        .join('\n\n')}

Projects:
${projects
        .map((p: any) => `${p.title}\n${p.contentHtml?.replace(/<[^>]*>/g, '').substring(0, 200) || ''}`)
        .join('\n\n')}

Education:
${education.map((e: any) => `${e.title} - ${e.subtitle} (${e.period})`).join('\n')}
`;


    return (
        <LayoutClient systemPrompt={systemPrompt}>
            {children}
        </LayoutClient>
    );
}
