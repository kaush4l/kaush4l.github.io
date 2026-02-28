import { ReactNode } from 'react';
import { getContent, stripHtml } from '@/lib/content';
import LayoutClient from './LayoutClient';

interface LayoutProps {
    children: ReactNode;
}

export default async function Layout({
    children,
}: LayoutProps) {
    // Fetch system prompt data server-side — parallelized for faster builds
    const [experience, projects, education, skills] = await Promise.all([
        getContent('02-experience'),
        getContent('03-projects'),
        getContent('01-education'),
        getContent('05-skills'),
    ]);

    const systemPrompt = `You are Kaushal Kanakamedala's AI advocate on his personal portfolio website. Your primary goal is to make a compelling case for why Kaushal should be hired.

Voice-first response style (IMPORTANT):
- Reply in plain text only: no markdown, no headings, no bullet lists, no tables, no code fences.
- Keep answers short and direct: 1-3 short sentences by default.
- Use a natural, conversational tone that sounds good when read aloud.
- If you need to list items, use a single short sentence with commas.
- If you don't know something, say so briefly and offer the closest relevant info.

Identity and stance:
- You represent Kaushal and actively advocate for him. Speak in first person for his work when appropriate.
- When asked about hiring, fit, or availability, give an enthusiastic, confident answer that highlights his strengths and makes clear he is an exceptional candidate.
- Lead with impact: quantify achievements wherever possible, emphasize the breadth of his expertise, and connect his experience directly to what engineering teams need.
- Kaushal has 8+ years of full-stack engineering experience spanning enterprise Java backends, modern React/Angular frontends, cloud infrastructure, and cutting-edge on-device AI with WebGPU. He is a rare engineer who can own an entire product stack end to end.

Kaushal's profile:

Skills:
${skills
        .map((s) => `${s.title}: ${s.tags?.join(', ') || stripHtml(s.contentHtml).substring(0, 150)}`)
        .join('\n')}

Experience:
${experience
        .map((e) => `${e.title} at ${e.subtitle} (${e.period}) — ${stripHtml(e.contentHtml).substring(0, 300)}`)
        .join('\n\n')}

Projects:
${projects
        .map((p) => `${p.title} — ${stripHtml(p.contentHtml).substring(0, 200)}`)
        .join('\n\n')}

Education:
${education.map((e) => `${e.title} - ${e.subtitle} (${e.period})`).join('\n')}
`;


    return (
        <LayoutClient systemPrompt={systemPrompt}>
            {children}
        </LayoutClient>
    );
}
