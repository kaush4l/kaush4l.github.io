import type { XpEntry, XpThemeProps } from '../types';
import { label, labelList } from '../label';
import Profile, { type GhGraph, type GhRepo, type GhActivity } from './github/Profile';
import './github.css';

/** FNV-1a — deterministic per slug, so static export and hydration agree. */
function hash(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "Aug 2017 - March 2020" → [startMonthIndex, endMonthIndex] in absolute months. */
function span(period: string | undefined, months: string[], present: string, nowY: number, nowM: number): [number, number] | null {
    if (!period) return null;
    const parts = period.split(/\s+-\s+|-(?=\d)|–/).map((p) => p.trim());
    const one = (p: string, end: boolean): number | null => {
        if (p.toLowerCase() === present.toLowerCase()) return nowY * 12 + nowM - 1;
        const y = p.match(/(19|20)\d{2}/)?.[0];
        if (!y) return null;
        const mi = months.findIndex((m) => p.toLowerCase().startsWith(m.toLowerCase().slice(0, 3)));
        return Number(y) * 12 + (mi >= 0 ? mi : end ? 11 : 0);
    };
    const a = one(parts[0], false);
    const b = parts[1] ? one(parts[1], true) : a !== null ? a + (/\b(19|20)\d{2}\b/.test(parts[0]) && !/[a-z]/i.test(parts[0]) ? 11 : 0) : null;
    return a !== null && b !== null ? [a, b] : null;
}

/**
 * Honest graph: a cell is lit only when a role from the résumé covers that
 * month, and only on weekdays. Level = number of overlapping roles (capped at
 * 4). No random noise, no invented per-day counts.
 */
function graphFor(year: number, spans: { a: number; b: number; org: string }[]): GhGraph {
    const first = new Date(Date.UTC(year, 0, 1));
    const offset = first.getUTCDay();
    const roles: string[] = [];
    const cells: GhGraph['cells'] = [];
    let total = 0;
    for (let i = 0; i < 53 * 7; i++) {
        const d = new Date(Date.UTC(year, 0, 1 + i - offset));
        if (d.getUTCFullYear() !== year) { cells.push(null); continue; }
        const abs = year * 12 + d.getUTCMonth();
        const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const on = weekend ? [] : spans.filter((s) => abs >= s.a && abs <= s.b).map((s) => s.org);
        const r = on.map((o) => {
            let k = roles.indexOf(o);
            if (k < 0) k = roles.push(o) - 1;
            return k;
        });
        if (r.length) total++;
        cells.push({ m: d.getUTCMonth(), d: d.getUTCDate(), level: Math.min(4, r.length), r });
    }
    return { year, cells, total, roles };
}

function toRepo(p: XpEntry): GhRepo {
    const h = hash(p.slug);
    const lang = p.tags[0] ?? '';
    return {
        slug: p.slug,
        name: slugify(p.title) || p.slug,
        description: p.summary || p.subtitle || '',
        lang,
        langVar: `var(--xp-lang-${slugify(lang)}, var(--xp-brand-${(h % 4) + 1}))`,
        // Honest count, not a fabricated metric: one star per shipped highlight.
        stars: p.bullets.length,
        year: p.year ?? 0,
        link: p.link,
        topics: p.tags.slice(1, 5),
    };
}

/**
 * GitHub-style profile. All derivation (repos, highlights, graph, commit ids)
 * happens here at build time; the client only filters, toggles and hovers.
 */
export default function GithubTheme({ config, resume }: XpThemeProps) {
    const l = config.labels;
    const months = labelList(l, 'graph.months');
    const present = label(l, 'graph.present', 'Present');
    const nowY = Number(label(l, 'graph.presentYear', '2026'));
    const nowM = Number(label(l, 'graph.presentMonth', '1'));

    const spans = resume.experience.flatMap((e) => {
        const s = span(e.period, months, present, nowY, nowM);
        return s ? [{ a: s[0], b: s[1], org: e.subtitle || e.title }] : [];
    });
    const years = Array.from(new Set(spans.flatMap(({ a, b }) => {
        const out: number[] = [];
        for (let y = Math.floor(a / 12); y <= Math.floor(b / 12); y++) out.push(y);
        return out;
    }))).sort((a, b) => b - a);
    const graphs = years.map((y) => graphFor(y, spans));

    const repos = resume.projects.map(toRepo);
    const activity: GhActivity[] = [...resume.experience]
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
        .map((e) => ({
            slug: e.slug,
            title: e.title,
            org: e.subtitle ?? '',
            period: e.period ?? '',
            commits: e.bullets.map((b, i) => ({
                hash: hash(`${e.slug}:${i}`).toString(16).padStart(8, '0').slice(0, 7),
                message: b,
            })),
        }));

    return (
        <Profile
            labels={l}
            introHtml={config.introHtml}
            profile={resume.profile}
            contact={resume.contact}
            education={resume.education}
            skills={resume.skills}
            repos={repos}
            graphs={graphs}
            activity={activity}
            projectsCount={resume.experience.length}
            followers={resume.experience.length}
        />
    );
}
