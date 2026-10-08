import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { getSiteSections, stripHtml } from '@/lib/content';
import type { ContentItem } from '@/lib/contentTypes';
import type {
    XpCenter, XpConfig, XpContact, XpEntry, XpPalette, XpProfile, XpResume, XpSkillGroup,
} from './types';

/**
 * Build-time loader for the Experience Center.
 *
 * `content/experiences/` holds one `.md` per experience plus `_center.md` for
 * the center page itself. Adding a file there and rebuilding adds a page: the
 * route list (`generateStaticParams`) and the center's cards are both derived
 * from this directory listing, so there is nothing else to register.
 */

const DIR = path.join(process.cwd(), 'content', 'experiences');
const CENTER_FILE = '_center.md';

const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const str = (v: unknown, fb = ''): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : fb);

/** Only plain token-ish values may reach a <style> block. */
const SAFE_KEY = /^[a-z0-9-]+$/i;
const SAFE_VALUE = /^[^;{}<>]+$/;

function stringMap(v: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(obj(v))) {
        const s = str(val);
        if (SAFE_KEY.test(k) && s && SAFE_VALUE.test(s)) out[k] = s;
    }
    return out;
}

function palette(v: unknown): XpPalette {
    const p = obj(v);
    const light = stringMap(p.light);
    // Dark inherits any key it does not override, so a palette is never half-defined.
    return { light, dark: { ...light, ...stringMap(p.dark) } };
}

async function mdToHtml(body: string): Promise<string> {
    if (!body.trim()) return '';
    return String(await remark().use(html).process(body));
}

function readMd(file: string) {
    return matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
}

function listFiles(): string[] {
    if (!fs.existsSync(DIR)) return [];
    return fs.readdirSync(DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');
}

async function toConfig(file: string): Promise<XpConfig> {
    const { data, content } = readMd(file);
    const id = str(data.id, file.replace(/\.md$/, '')).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`content/experiences/${file}: id "${id}" must be kebab-case`);
    if (!str(data.theme)) throw new Error(`content/experiences/${file}: missing required "theme"`);
    const card = obj(data.card);
    return {
        id,
        theme: str(data.theme),
        order: Number(data.order ?? 999),
        title: str(data.title, id),
        introHtml: await mdToHtml(content),
        card: { tagline: str(card.tagline), blurb: str(card.blurb) },
        palette: palette(data.palette),
        tokens: stringMap(data.tokens),
        labels: obj(data.labels),
    };
}

export async function getExperiences(): Promise<XpConfig[]> {
    const all = await Promise.all(listFiles().map(toConfig));
    const seen = new Set<string>();
    for (const c of all) {
        if (seen.has(c.id)) throw new Error(`content/experiences: duplicate id "${c.id}"`);
        seen.add(c.id);
    }
    return all.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function getExperience(id: string): Promise<XpConfig | undefined> {
    return (await getExperiences()).find((c) => c.id === id);
}

const DEFAULT_SOURCES: XpCenter['sources'] = {
    profile: 'about', experience: 'experience', projects: 'projects',
    skills: 'skills', education: 'education', contact: 'contact',
};

export async function getCenter(): Promise<XpCenter> {
    const has = fs.existsSync(path.join(DIR, CENTER_FILE));
    const parsed = has ? readMd(CENTER_FILE) : { data: {}, content: '' };
    const d = parsed.data as Record<string, unknown>;
    return {
        title: str(d.title, 'Experience Center'),
        eyebrow: str(d.eyebrow),
        introHtml: await mdToHtml(parsed.content),
        navLabel: str(d.navLabel, 'Experience Center'),
        backLabel: str(d.backLabel, 'Back'),
        openLabel: str(d.openLabel, 'Open'),
        lightLabel: str(d.lightLabel, 'Switch to light appearance'),
        darkLabel: str(d.darkLabel, 'Switch to dark appearance'),
        hint: str(d.hint, ''),
        sources: { ...DEFAULT_SOURCES, ...stringMap(d.sources) } as XpCenter['sources'],
        palette: palette(d.palette),
        tokens: stringMap(d.tokens),
    };
}

// ─── Résumé normalisation ────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
/** remark-html escapes `&`, quotes etc.; plain-text consumers need them decoded. */
const decode = (t: string) => t.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
const clean = (h: string) => decode(stripHtml(h)).replace(/\s+/g, ' ').trim();

function listItems(h: string): string[] {
    return [...h.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1]));
}

function paragraphs(h: string): string[] {
    return [...h.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1])).filter(Boolean);
}

function toEntry(i: ContentItem): XpEntry {
    const year = i.period?.match(/(19|20)\d{2}/)?.[0];
    return {
        slug: i.slug,
        title: i.title,
        subtitle: i.subtitle,
        period: i.period,
        location: i.location,
        link: i.link ?? i.url,
        tags: i.tools ?? i.tags ?? i.coursework ?? [],
        summary: i.description ?? paragraphs(i.contentHtml)[0] ?? '',
        bullets: listItems(i.contentHtml),
        html: i.contentHtml,
        year: year ? Number(year) : undefined,
    };
}

export async function getResume(sources: XpCenter['sources']): Promise<XpResume> {
    const sections = await getSiteSections();
    const items = (id: string) => sections.find((s) => s.id === id)?.items ?? [];
    const about = items(sources.profile)[0];
    const paras = about ? paragraphs(about.contentHtml) : [];
    const profile: XpProfile = {
        name: about?.title ?? '',
        role: about?.subtitle ?? '',
        location: about?.location,
        headline: about?.headline,
        proof: about?.proof,
        highlights: about?.highlights ?? [],
        summary: paras[0] ?? '',
        paragraphs: paras,
        html: about?.contentHtml ?? '',
    };
    const skills: XpSkillGroup[] = items(sources.skills).map((i) => ({
        title: i.title, tags: i.tags ?? i.tools ?? [], summary: clean(i.contentHtml),
    }));
    const contact: XpContact[] = items(sources.contact).map((i) => ({
        title: i.title, subtitle: i.subtitle, url: i.url ?? i.link, icon: i.icon,
    }));
    return {
        profile,
        experience: items(sources.experience).map(toEntry),
        projects: items(sources.projects).map(toEntry),
        skills,
        education: items(sources.education).map(toEntry),
        contact,
    };
}

/**
 * The md palette + tokens as one scoped stylesheet. Light values sit on the
 * scope; dark values re-declare under `[data-theme="dark"]`, the site-wide
 * appearance attribute ThemeProvider already owns — so every experience follows
 * the visitor's light/dark choice (and the OS default) with no switch of its own.
 */
export function scopeCss(scope: string, p: XpPalette, tokens: Record<string, string>): string {
    const decl = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => `--xp-${k}:${v}`).join(';');
    return `${scope}{${decl(tokens)};${decl(p.light)}}[data-theme="dark"] ${scope}{${decl(p.dark)}}`;
}
