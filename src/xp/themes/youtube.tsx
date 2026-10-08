import type { XpEntry, XpLabels, XpThemeProps } from '../types';
import { fill, label } from '../label';
import Channel from './youtube/Channel';
import type { YtVideo } from './youtube/model';
import './youtube.css';

/**
 * YouTube-style channel. The server side turns the résumé into "videos" —
 * durations from tenure and ages computed deterministically from the md
 * reference month (`labels.now`) — so nothing in render depends on the clock.
 */

const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

type Ym = { y: number; m: number };

function parseNow(s: string): Ym {
    const m = s.match(/^(\d{4})-(\d{1,2})$/);
    return m ? { y: Number(m[1]), m: Number(m[2]) } : { y: 2000, m: 1 };
}

function parsePoint(s: string, end: boolean, now: Ym): Ym | null {
    const t = s.trim().toLowerCase();
    if (!t) return null;
    if (/present|now|current/.test(t)) return now;
    const y = t.match(/(19|20)\d{2}/)?.[0];
    if (!y) return null;
    const mon = Object.keys(MONTHS).find((k) => t.includes(k));
    return { y: Number(y), m: mon ? MONTHS[mon] : end ? 12 : 1 };
}

function span(period: string | undefined, now: Ym) {
    if (!period) return null;
    const [a, b] = period.split(/\s*[-–—]\s*/);
    const start = parsePoint(a ?? '', false, now);
    if (!start) return null;
    const end = parsePoint(b ?? a ?? '', true, now) ?? start;
    const live = /present|now|current/i.test(b ?? '');
    const months = Math.max(1, (end.y - start.y) * 12 + (end.m - start.m) + 1);
    const ago = Math.max(0, (now.y - end.y) * 12 + (now.m - end.m));
    return { months, ago, live };
}

function toVideo(e: XpEntry, kind: 'role' | 'project', i: number, l: XpLabels, now: Ym): YtVideo {
    const s = span(e.period, now);
    let age = '';
    if (s) {
        if (s.live) age = label(l, 'video.liveAge');
        else if (s.ago >= 24) age = fill(label(l, 'video.ageYears'), { n: Math.floor(s.ago / 12) });
        else if (s.ago >= 12) age = label(l, 'video.ageYear');
        else if (s.ago >= 1) age = fill(label(l, 'video.ageMonths'), { n: s.ago });
        else age = label(l, 'video.ageNew');
    }
    const duration = s
        ? fill(label(l, 'video.duration'), { y: Math.floor(s.months / 12), mm: String(s.months % 12).padStart(2, '0'), m: s.months % 12 })
        : '';
    return {
        id: `${kind === 'role' ? 'r' : 'p'}-${e.slug}`,
        kind,
        title: e.title,
        channel: e.subtitle ?? '',
        period: e.period ?? '',
        location: e.location ?? '',
        link: e.link ?? '',
        summary: e.summary,
        bullets: e.bullets,
        tags: e.tags,
        age,
        duration,
        live: !!s?.live,
        thumb: (i % 6) + 1,
        sortKey: s ? (now.y * 12 + now.m) - s.ago : 0,
    };
}

export default function YoutubeTheme({ config, resume }: XpThemeProps) {
    const l = config.labels;
    const now = parseNow(label(l, 'now'));
    const roles = resume.experience.map((e, i) => toVideo(e, 'role', i, l, now));
    const projects = resume.projects.map((e, i) => toVideo(e, 'project', i + roles.length, l, now));
    const byRecent = (a: YtVideo, b: YtVideo) => b.sortKey - a.sortKey || a.title.localeCompare(b.title);
    roles.sort(byRecent);
    projects.sort(byRecent);
    const years = [...resume.experience, ...resume.projects].map((e) => e.year).filter((y): y is number => !!y);
    return (
        <Channel
            labels={l}
            introHtml={config.introHtml}
            profile={resume.profile}
            roles={roles}
            projects={projects}
            skills={resume.skills}
            education={resume.education}
            contact={resume.contact}
            since={years.length ? Math.min(...years) : undefined}
        />
    );
}
