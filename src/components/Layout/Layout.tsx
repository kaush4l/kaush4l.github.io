import { ReactNode } from 'react';
import { getSiteSections, getNav, stripHtml } from '@/lib/content';
import type { SiteSection } from '@/lib/contentTypes';
import LayoutClient from './LayoutClient';

interface LayoutProps {
    children: ReactNode;
}

/** Flatten one section's entries into compact plain text for the system prompt. */
function sectionToText(section: SiteSection): string {
    const lines = section.items.map((item) => {
        const heading = [item.title, item.subtitle].filter(Boolean).join(' — ');
        const meta = [item.period, item.location].filter(Boolean).join(' · ');
        const skills = item.tags ?? item.tools;
        const body = stripHtml(item.contentHtml).trim().slice(0, 400);

        return [
            meta ? `${heading} (${meta})` : heading,
            skills?.length ? `Tags: ${skills.join(', ')}` : '',
            body,
        ].filter(Boolean).join('\n');
    });

    return `## ${section.title}\n${lines.join('\n\n')}`;
}

export default async function Layout({ children }: LayoutProps) {
    // The assistant's knowledge and the site navigation are both derived from the
    // same content folders — there is no second, hardcoded copy to keep in sync.
    const [sections, nav] = await Promise.all([getSiteSections(), getNav()]);

    const knowledge = sections.map(sectionToText).join('\n\n');

    const systemPrompt = `You are Kaushal Kanakamedala's on-device AI assistant. You answer questions about Kaushal's background, skills, projects, and experience using only the information below.

Response style (this is a voice-capable assistant — questions may arrive as audio):
- Reply in plain, natural text: no markdown, headings, bullet lists, tables, or code fences.
- Be short and direct — 1 to 3 sentences by default; expand only when explicitly asked.
- When the input is audio, briefly transcribe what you heard, then answer it.
- If you don't know something, say so briefly and pivot to the closest relevant fact.
- Never invent details; rely only on the knowledge below.

Site knowledge (the single source of truth):
${knowledge}
`;

    return (
        <LayoutClient systemPrompt={systemPrompt} nav={nav}>
            {children}
        </LayoutClient>
    );
}
