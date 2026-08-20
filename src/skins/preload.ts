import type { SkinId } from './types';

/**
 * What the blocking pre-paint script in `layout.tsx` needs to know about a
 * skin, and nothing else.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 * This is a static export. There is no server to resolve the stored skin, so
 * the very first painted frame is decided by a synchronous script in `<head>`
 * that runs before the React bundle exists. That script therefore cannot
 * `import` a skin module — a skin module reaches components, and pulling a hero
 * into the document head would defeat the code split and stall first paint.
 *
 * So the ground literals are split out here, as data with no dependencies, and
 * this module is the SINGLE OWNER of them: the pre-paint script serialises this
 * table, and each skin's surface table reads its ground back out of it. That is
 * deliberately the opposite of M28's triplication — the same number was written
 * in three places there because nothing could be shared; here it can be, so it
 * is written once and read twice.
 *
 * `null` means "this skin does not pin anything" — the script falls through to
 * the ordinary stored-appearance / media-query resolution.
 */
export interface SkinPrePaint {
    /** The `data-theme` value. Coder-pinned skins still stamp `dark`. */
    stamp: 'light' | 'dark';
    /** Present only when the skin pins the coder appearance. */
    effects?: 'coder';
    /** The document ground, and the `theme-color` the mobile chrome takes. */
    bg: string;
}

export const SKIN_PREPAINT: Record<SkinId, SkinPrePaint | null> = {
    professional: null,
    ronin: { stamp: 'dark', bg: '#0B0B0D' },
    sanctum: { stamp: 'dark', bg: '#050505' },
    terminal: { stamp: 'dark', effects: 'coder', bg: '#080B10' },
    voyager: { stamp: 'dark', bg: '#070A12' },
};
