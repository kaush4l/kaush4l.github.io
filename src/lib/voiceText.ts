export function stripMarkdownForSpeech(input: string): string {
    if (!input) return '';

    let text = input;

    // Remove code fences completely but keep inner content if present.
    text = text.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, '$1');

    // Inline code.
    text = text.replace(/`([^`]+)`/g, '$1');

    // Headings.
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');

    // Blockquotes.
    text = text.replace(/^\s*>\s?/gm, '');

    // Bullets / numbered lists (keep content).
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');

    // Bold / italics.
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Links: [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

    // Horizontal rules
    text = text.replace(/^\s*([-*_]){3,}\s*$/gm, '');

    // Collapse whitespace.
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}
