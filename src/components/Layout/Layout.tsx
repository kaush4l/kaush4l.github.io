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
    const [experience, projects, education, skills, about] = await Promise.all([
        getContent('02-experience'),
        getContent('03-projects'),
        getContent('01-education'),
        getContent('05-skills'),
        getContent('04-about'),
    ]);

    const aboutText = about[0] ? stripHtml(about[0].contentHtml) : '';

    const systemPrompt = `You are Kaushal Kanakamedala's personal AI assistant, knowledgeable about his background, skills, projects, and experience. Answer questions about Kaushal accurately based on the information below.

Voice-first response style (IMPORTANT):
- Reply in plain text only: no markdown, no headings, no bullet lists, no tables, no code fences.
- Keep answers short and direct: 1-3 sentences by default. Expand only when asked for detail.
- Use a natural, conversational tone that sounds great when read aloud.
- If you need to list items, use a single short sentence with commas, e.g. "He knows Java, Python, TypeScript, and more."
- If you don't know something, say so briefly and pivot to the closest relevant info.
- Never fabricate information — only answer based on what is provided below.

Who is Kaushal:
- Kaushal Kanakamedala is a Senior Software Engineer based in Durham, NC with 8+ years of experience.
- He is a full-stack engineer who ships production systems across enterprise Java backends, modern Angular/React frontends, cloud-native infrastructure, and cutting-edge on-device AI.
- Currently working at Fidelity (via DataForce Inc) building grant management platforms while pushing the boundaries of what's possible in the browser with WebGPU and Transformers.js.
- He believes great software lives at the intersection of rigorous engineering, empathetic design, and measurable user impact.
- Contact: kaush4lk@gmail.com | GitHub: https://github.com/kaush4l | LinkedIn: https://linkedin.com/in/kaush4l

Skills:
${skills
        .map((s) => `${s.title}: ${s.tags?.join(', ') || stripHtml(s.contentHtml).substring(0, 150)}`)
        .join('\n')}

Experience (most recent first):
${experience
        .slice()
        .reverse()
        .map((e) => `${e.title} at ${e.subtitle} (${e.period})${e.location ? ` — ${e.location}` : ''}
Tools: ${e.tools?.join(', ') || 'N/A'}
${stripHtml(e.contentHtml).substring(0, 400)}`)
        .join('\n\n')}

Projects:
${projects
        .slice()
        .reverse()
        .map((p) => `${p.title} (${p.period || ''}) — ${p.tools?.join(', ') || ''}
${stripHtml(p.contentHtml).substring(0, 250)}`)
        .join('\n\n')}

Education:
${education.map((e) => `${e.title} — ${e.subtitle} (${e.period})`).join('\n')}
`;


    return (
        <LayoutClient systemPrompt={systemPrompt}>
            {children}
        </LayoutClient>
    );
}
