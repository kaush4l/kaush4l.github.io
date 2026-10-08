/**
 * Experience Center types.
 *
 * Every experience is ONE markdown file in `content/experiences/`. Its
 * frontmatter is the whole configuration (renderer, copy, palette, layout
 * tokens); its body is the intro paragraph. The code only knows how to draw a
 * `theme` — which résumé it draws, in what words and colours, is data.
 */

/** A free-form, md-authored bag of strings / numbers / nested maps. */
export type XpLabels = Record<string, unknown>;

/** `{ light: { bg: '#fff', … }, dark: { … } }` — keys become `--xp-<key>`. */
export interface XpPalette {
    light: Record<string, string>;
    dark: Record<string, string>;
}

export interface XpCard {
    tagline: string;
    blurb: string;
}

export interface XpConfig {
    /** URL slug: the file name without `.md` (or `id:` when declared). */
    id: string;
    /** Renderer key — must exist in `src/xp/registry.ts`. */
    theme: string;
    order: number;
    title: string;
    /** Rendered intro body (HTML from the md body). */
    introHtml: string;
    card: XpCard;
    palette: XpPalette;
    /** Non-colour tokens (radius, widths, gaps) — become `--xp-<key>`. */
    tokens: Record<string, string>;
    /** Every other word on the page. Read through `label()`. */
    labels: XpLabels;
}

export interface XpCenter {
    title: string;
    eyebrow: string;
    introHtml: string;
    navLabel: string;
    backLabel: string;
    openLabel: string;
    lightLabel: string;
    darkLabel: string;
    /** Header icon tooltip on the résumé page. */
    hint: string;
    /** résumé role → content section id (folder name without number). */
    sources: Record<'profile' | 'experience' | 'projects' | 'skills' | 'education' | 'contact', string>;
    palette: XpPalette;
    tokens: Record<string, string>;
}

export interface XpEntry {
    slug: string;
    title: string;
    subtitle?: string;
    period?: string;
    location?: string;
    link?: string;
    tags: string[];
    /** First paragraph, plain text. */
    summary: string;
    /** `<li>` items, plain text. */
    bullets: string[];
    html: string;
    /** Start year parsed from `period`, for sorting/grouping. */
    year?: number;
}

export interface XpSkillGroup {
    title: string;
    tags: string[];
    summary: string;
}

export interface XpContact {
    title: string;
    subtitle?: string;
    url?: string;
    icon?: string;
}

export interface XpProfile {
    name: string;
    role: string;
    location?: string;
    headline?: string;
    proof?: string;
    highlights: string[];
    summary: string;
    paragraphs: string[];
    html: string;
}

export interface XpResume {
    profile: XpProfile;
    experience: XpEntry[];
    projects: XpEntry[];
    skills: XpSkillGroup[];
    education: XpEntry[];
    contact: XpContact[];
}

export interface XpThemeProps {
    config: XpConfig;
    resume: XpResume;
}
