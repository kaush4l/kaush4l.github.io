import { getContent, getAllSections, getAMAContent } from '@/lib/content';
import { Layout } from '@/components/Layout';
import AMAClient from './AMAClient';

export default async function AMAPage() {
    // Fetch Resume Context
    const experience = await getContent('02-experience');
    const projects = await getContent('03-projects');
    const education = await getContent('01-education');

    // Construct System Prompt
    const systemPrompt = `You are an intelligent, honest, and sincere AI assistant for Kaushal Kanakamedala's personal website.
    
    Here is Kaushal's Resume Context:
    
    ## Experience
    ${experience.map(e => `- ${e.title} at ${e.subtitle} (${e.period})`).join('\n')}
    
    ## Projects
    ${projects.map(p => `- ${p.title}: ${p.contentHtml.replace(/<[^>]*>/g, '')}`).join('\n')}
    
    ## Education
    ${education.map(e => `- ${e.title} at ${e.subtitle} (${e.period})`).join('\n')}
    
    YOUR GOAL:
    - Answer questions about Kaushal sincerely and honestly.
    - If asked about projects, highlight relevant work.
    - If the user provides a job description (via image or text), match Kaushal's skills to it.
    - Be crisp, clear, and personalized.
    - Do not invent facts. If you don't find it in the context, say so politely.
    `;

    return (
        <Layout>
            <AMAClient initialSystemPrompt={systemPrompt} />
        </Layout>
    );
}

