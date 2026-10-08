'use client';

import type { ReactNode } from 'react';
import ChatWidget from '@/components/Chat/ChatWidget';
import { ModelProvider } from '@/context/ModelContext';
import type { ResumeCorpus } from '@/lib/resumeContext';
import { useDefaultSkin } from '@/xp/useDefaultSkin';

/**
 * Keeps the on-device résumé assistant on the redesigned home page without the
 * old MUI app shell (header + drawer). `openChat()` from `@/lib/chatBridge`
 * opens it from anywhere on the page.
 */
export default function HomeShell({ children, resumeCorpus, suggestedPrompts }: {
    children: ReactNode;
    resumeCorpus: ResumeCorpus;
    suggestedPrompts?: string[];
}) {
    useDefaultSkin();
    return (
        <ModelProvider resumeCorpus={resumeCorpus}>
            {children}
            <ChatWidget suggestedPrompts={suggestedPrompts} />
        </ModelProvider>
    );
}
