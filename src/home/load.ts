import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getCenter, getExperiences, getResume } from '@/xp/load';
import type { XpPalette } from '@/xp/types';
import type { HomeData, SceneView } from './types';

/**
 * Build-time loader for `/`. All presentation lives in content/home/home.md;
 * the résumé and the Experience Center list are reused from the xp loader so
 * there is exactly one reading of content/.
 */
const FILE = path.join(process.cwd(), 'content', 'home', 'home.md');

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown, fb = '') => (typeof v === 'string' || typeof v === 'number' ? String(v) : fb);
const num = (v: unknown, fb: number) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const SAFE_KEY = /^[a-z0-9-]+$/i;
const SAFE_VALUE = /^[^;{}<>]+$/;
function strMap(v: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(obj(v))) {
        const s = str(val);
        if (SAFE_KEY.test(k) && s && SAFE_VALUE.test(s)) out[k] = s;
    }
    return out;
}
function palette(v: unknown): XpPalette {
    const light = strMap(obj(v).light);
    return { light, dark: { ...light, ...strMap(obj(v).dark) } };
}

export async function getHome(): Promise<HomeData> {
    const { data } = matter(fs.readFileSync(FILE, 'utf8'));
    const d = data as Obj;
    const s = obj(d.scene);
    const fig = obj(d.figure);
    const views: SceneView[] = (Array.isArray(s.views) ? s.views : []).map((v: unknown) => {
        const o = obj(v);
        return { id: str(o.id), label: str(o.label, str(o.id)), azimuth: num(o.azimuth, 0), elevation: num(o.elevation, 15), distance: num(o.distance, 3.6) };
    }).filter((v) => v.id);
    if (!views.length) throw new Error('content/home/home.md: scene.views must list at least one view');
    const colors = obj(s.colors);
    const light = strMap(colors.light);
    const [center, experiences] = await Promise.all([getCenter(), getExperiences()]);
    return {
        config: {
            title: str(d.title),
            eyebrow: str(d.eyebrow),
            scene: {
                defaultView: views.some((v) => v.id === str(s.defaultView)) ? str(s.defaultView) : views[0].id,
                autoRotate: s.autoRotate === true,
                autoRotateSpeed: num(s.autoRotateSpeed, 0.6),
                views,
                screenLines: (Array.isArray(obj(s.screen).lines) ? (obj(s.screen).lines as unknown[]) : []).map((x) => str(x)),
                colors: { light, dark: { ...light, ...strMap(colors.dark) } },
                figure: { src: str(fig.src, '/home/figure.png'), alt: str(fig.alt), height: num(fig.height, 1) },
                framing: { offsetX: num(obj(s.framing).offsetX, 0.18), minAspect: num(obj(s.framing).minAspect, 1.2) },
                macScale: num(s.macScale, 1.3),
                labels: obj(d.sceneLabels),
            },
            labels: { nav: d.nav, hero: d.hero, sections: d.sections, footer: d.footer },
            palette: palette(d.palette),
            tokens: strMap(d.tokens),
        },
        resume: await getResume(center.sources),
        experiences: experiences.map(({ id, title, card, palette }) => ({ id, title, card, palette })),
    };
}
