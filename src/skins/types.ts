/**
 * The skin axis.
 *
 * The theme already has two orthogonal axes, and both are resolved by table
 * lookup rather than by a conditional at the call site:
 *
 *   appearance  light | dark | coder   owns SURFACES   (`MODE_SURFACES`)
 *   variant     a | b | c | d          owns HUE        (`THEME_PALETTES`)
 *
 * A **skin** is the third axis and it owns a different thing again:
 * ATMOSPHERE, TYPOGRAPHIC VOICE, THE HERO, and THE MOTION STORY. It is a
 * perspective on the same résumé, not a re-skin of the same perspective.
 *
 * ── INVARIANT (mirrors the coder-mode one in `tokens.ts`) ───────────────────
 * Delete `skins.css` and every `Skin.Atmosphere`, and the page must still be a
 * complete, readable, correctly-graded résumé in all three appearances. No skin
 * may be the sole carrier of a boundary, a state, or a level of hierarchy.
 * Skins own atmosphere, entrance and hero — never structure.
 *
 * ── Why a skin is not "just another variant" ────────────────────────────────
 * A variant recolours. A skin re-narrates: it may pin the appearance (the
 * devotional skin is black or it is nothing), replace the hero, add a fixed
 * atmosphere layer, and retune the reveal choreography. That is more authority
 * than the hue table is allowed, which is exactly why it is a separate axis
 * with a separate table rather than four more entries in `THEME_PALETTES`.
 */
import type { Theme, ThemeOptions } from '@mui/material/styles';
import type { Appearance, ThemePalette } from '@/theme/tokens';
import type { HeroProps } from '@/components/Hero';
import type { SiteSection } from '@/lib/contentTypes';

export type SkinId = 'professional' | 'ronin' | 'sanctum' | 'terminal' | 'voyager';

/**
 * Every custom property any skin is allowed to write.
 *
 * M29 applies to skins exactly as it applies to appearances: **no token may be
 * left stale from a previous skin.** The writer clears this whole list before
 * applying the incoming skin's map, so a key one skin sets and the next omits
 * falls back to the stylesheet default rather than surviving the switch. Adding
 * a token means adding it here — a key not on this list is never cleared and is
 * therefore a latent cross-skin leak.
 */
export const SKIN_TOKEN_KEYS = [
    // Ground and text. A skin that pins the appearance MUST own these: the
    // pre-paint script has already painted that skin's ground from
    // `SKIN_PREPAINT`, so if the skin then leaves `--bg` at the shared dark
    // value the document visibly shifts colour at hydration. `skinGround()`
    // exists so no skin has to remember that by hand.
    '--bg',
    '--bg-alt',
    '--surface',
    '--surface-alt',
    '--text',
    '--text-muted',
    '--border',
    '--link',
    '--glow',
    '--focus-ring',
    // Reveal choreography — consumed by `.reveal` in cinema.css.
    '--reveal-distance',
    '--reveal-duration',
    '--reveal-stagger',
    '--reveal-ease',
    // Atmosphere — consumed by each skin's block in skins.css.
    '--skin-ink',
    '--skin-accent',
    '--skin-accent-soft',
    '--skin-atmos-a',
    '--skin-rule',
] as const;

export type SkinTokenKey = (typeof SKIN_TOKEN_KEYS)[number];

/** What a skin may write to `<html>` alongside `applyTokens`. */
export type SkinTokens = Partial<Record<SkinTokenKey, string>>;

export interface SkinContext {
    appearance: Appearance;
    /** The hue table entry the user's variant selected. */
    hue: ThemePalette;
}

export interface Skin {
    id: SkinId;
    /** Menu copy. Single source — never re-declared at the call site (M3). */
    label: string;
    /** One line, in the voice of the skin. Promises the *idea*, not the effects. */
    hint: string;
    /** Two colours the menu swatch is drawn from, so the row previews itself. */
    swatch: readonly [string, string];

    /**
     * The appearance this skin pins itself to, if any.
     *
     * A skin whose whole argument is a near-black frame cannot honour a light
     * request — so it says so here, the provider resolves the *effective*
     * appearance through this field, and the appearance menu reflects that the
     * choice is currently owned by the skin rather than silently ignoring it.
     */
    pinAppearance?: Appearance;

    /**
     * MUI options DEEP-MERGED on top of `createThemeForVariant`'s output.
     * Receives the resolved base so a skin can derive from surfaces it does not
     * own. Return only what changes — never a whole theme.
     */
    theme?(base: Theme, ctx: SkinContext): ThemeOptions;

    /** Custom properties written to `<html>` as inline styles. */
    tokens?(ctx: SkinContext): SkinTokens;

    /**
     * The fold. Statically imported for the default skin, `dynamic()` for the
     * rest — see the E1 note in `HeroSwitcher`.
     */
    Hero?: React.ComponentType<HeroProps>;

    /**
     * A fixed, pointer-transparent, `z-index: -1` layer rendered once from
     * `LayoutClient`. It is a real element rather than a `body` pseudo-element
     * because both pseudo-slots are already owned (`cinema.css` paints the page
     * grade on `::before`, `coder.css` the scanlines on `::after`).
     */
    Atmosphere?: React.ComponentType;

    /** Optional per-skin section dispatch. Falls back to the default renderer. */
    SectionRenderer?: React.ComponentType<{ section: SiteSection }>;
}
