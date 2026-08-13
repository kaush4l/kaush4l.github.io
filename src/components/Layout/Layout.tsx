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

    // Footer data is derived from the same content folders as everything else —
    // no second copy of the email address or the owner's name lives in a component.
    const emailUrl = sections
        .flatMap((section) => section.items)
        .find((item) => item.url?.startsWith('mailto:'))?.url;
    // Sections are located by the `layout` they declare, never by a hardcoded id.
    const aboutSection = sections.find((section) => section.layout === 'about');
    const contactSection = sections.find((section) => section.layout === 'contact');

    const owner = aboutSection?.items[0]?.title;

    // The one closing statement the page ends on (K2/F4) — authored in
    // `content/06-contact/_section.md`. If the content doesn't declare it, the
    // footer renders no statement rather than falling back to a literal.
    const footerStatement = contactSection?.statement;

    // The chat's entry-point prompts (F2) travel the same Layout → LayoutClient
    // path as the system prompt, and are authored in `content/01-about/_section.md`.
    const suggestedPrompts = aboutSection?.prompts;

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
        <LayoutClient
            systemPrompt={systemPrompt}
            suggestedPrompts={suggestedPrompts}
            nav={nav}
            footer={{ statement: footerStatement, emailUrl, owner }}
        >
            {children}
        </LayoutClient>
    );
}
