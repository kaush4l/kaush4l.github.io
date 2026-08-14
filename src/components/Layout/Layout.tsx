import { ReactNode } from 'react';
import { getSiteSections, getNav } from '@/lib/content';
import { buildResumeCorpus } from '@/lib/resumeContext';
import LayoutClient from './LayoutClient';

interface LayoutProps {
    children: ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
    // The assistant's knowledge and the site navigation are both derived from the
    // same content folders — there is no second, hardcoded copy to keep in sync.
    const [sections, nav] = await Promise.all([getSiteSections(), getNav()]);

    // The assistant's knowledge is no longer a flattened, truncated blob baked
    // into a system prompt here. It is a retrieval corpus: every field of every
    // entry, whole, scored per question on the client (`src/lib/resumeContext.ts`).
    // Assembling the prompt at question time is what lets "what's his email" cost
    // a fraction of what "is he right for a staff role" costs, on hardware that
    // belongs to the reader.
    const resumeCorpus = buildResumeCorpus(sections);

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
    // path as the corpus, and are authored in `content/01-about/_section.md`.
    const suggestedPrompts = aboutSection?.prompts;

    return (
        <LayoutClient
            resumeCorpus={resumeCorpus}
            suggestedPrompts={suggestedPrompts}
            nav={nav}
            footer={{ statement: footerStatement, emailUrl, owner }}
        >
            {children}
        </LayoutClient>
    );
}
