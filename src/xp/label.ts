import type { XpLabels } from './types';

function walk(labels: XpLabels, path: string): unknown {
    let cur: unknown = labels;
    for (const key of path.split('.')) {
        if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }
    return cur;
}

/**
 * Read a dotted path out of md-authored labels: `label(l, 'nav.home', 'Home')`.
 * The fallback exists so a half-written md file still renders; the md file is
 * the place to change wording, never the call site.
 */
export function label(labels: XpLabels, path: string, fallback = ''): string {
    const v = walk(labels, path);
    return typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;
}

/** Same as `label`, for md lists of scalars. */
export function labelList(labels: XpLabels, path: string): string[] {
    const v = walk(labels, path);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

/** Same as `label`, for md lists of maps (e.g. `nav: [{ id, label }]`). */
export function labelObjects<T extends Record<string, unknown>>(labels: XpLabels, path: string): T[] {
    const v = walk(labels, path);
    return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : [];
}

/** `"{n} results"` → `"7 results"`. */
export function fill(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
