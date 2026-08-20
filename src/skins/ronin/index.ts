import dynamic from 'next/dynamic';
import type { ThemeOptions } from '@mui/material/styles';
import type { Skin } from '../types';
import { groundTokens, groundTheme, type Ground } from '../ground';
import Atmosphere from './Atmosphere';

/**
 * Rōnin — ink, breath, and the moment before the strike.
 *
 * ── The arc, in one sentence ────────────────────────────────────────────────
 * Ten years read as 守破離 (shu-ha-ri) — learn the form, break the form, leave
 * the form — so the page is one sheet of paper down which the ink gets hotter:
 * every section is a further stroke of the same brush, the aura behind it lifts
 * from gunjō blue (群青, the calm before) toward shu-iro red (朱色, the seal),
 * and the strongest beat in the whole skin is the quietest one.
 *
 * ── Why the palette is a canon and not a mood ───────────────────────────────
 * Shu-iro is the vermilion of a rakkan seal and of a torii gate; gunjō is the
 * mineral blue an unlit sumi ground goes. Exactly ONE of them is ever lit —
 * shu — and gunjō is deliberately held below the threshold at which it reads as
 * an accent. That is the whole "power-up" idea expressed in colour instead of
 * in effects: the red means something because it arrives into a cold page.
 *
 * ── Measured contrast (sRGB, computed, not asserted) ────────────────────────
 *   text     #EDE7DC on #0B0B0D  15.98:1   on surface #16130F  15.05:1
 *   muted    #948A7C on #0B0B0D   5.79:1   on surfaceAlt #1E1A15  5.10:1
 *   link     #F2603A on #0B0B0D   6.10:1   on surfaceAlt         5.36:1
 *   button   #0B0B0D on shu fill  4.68:1
 *   ring     #F0E7D8 on ground   16.04:1   on shu fill  3.42:1   on gunjō fill  5.41:1
 */

/**
 * E1/C-contract: a skin hero is `dynamic({ ssr: false })`. It is NOT the
 * shipped default hero, so it must not be in the static export's module graph —
 * `HeroSwitcher` reserves the fold's height, so a late hero swaps in place
 * rather than shoving the document down.
 */
const Hero = dynamic(() => import('./Hero'), { ssr: false });

const SHU = '#E8380D'; // 朱色 — the seal, the torii. The one lit hue.
const SHU_LIT = '#F2603A'; // the text/glyph channel that opposes this ground
const SHU_DEEP = '#A82708';
const EMBER = '#FF7A2F';
const GUNJO = '#35617F'; // 群青 — the calm, the unlit half of the page
const GUNJO_LIT = '#7BA6C6';
const GUNJO_DEEP = '#24455C';
const BONE = '#EDE7DC';
const BONE_MUTED = '#948A7C';
const RING = '#F0E7D8';

/**
 * The ground, declared once and published to BOTH colour systems below.
 *
 * The surfaces carry a trace of warmth (#16130F, not #141414): sumi ink on
 * paper is never neutral, and a cold near-black next to a vermilion seal reads
 * as a screenshot of space rather than as a sheet.
 */
const GROUND: Ground = {
    bgAlt: '#131110',
    surface: '#16130F',
    surfaceAlt: '#1E1A15',
    text: BONE,
    // 5.79:1 on the ground and 5.10:1 on the deepest surface. The canon's
    // #8A8175 measured 4.51:1 on `surfaceAlt` — passing, but with no margin at
    // all, and `--text-muted` is text.
    textMuted: BONE_MUTED,
    border: 'rgba(237, 231, 220, 0.13)',
    // Shu itself is 4.68:1 on the ground but only 4.12:1 inside a card, so the
    // LINK channel is the lit step of the same hue rather than the fill.
    link: SHU_LIT,
    glow: EMBER,
    focusRing: RING,
};

const ronin: Skin = {
    id: 'ronin',
    label: 'Rōnin',
    hint: 'Ink, breath, and the moment before the strike.',
    swatch: [SHU, '#0B0B0D'],
    // The argument is a near-black sheet with one vermilion mark on it. There
    // is no light version of that, so the skin says so rather than degrading.
    pinAppearance: 'dark',

    tokens: () => ({
        ...groundTokens('ronin', GROUND),
        '--skin-ink': BONE,
        '--skin-accent': SHU,
        '--skin-accent-soft': 'rgba(232, 56, 13, 0.16)',
        '--skin-atmos-a': '0.9',
        '--skin-rule': 'rgba(237, 231, 220, 0.10)',

        /**
         * The reveal choreography, retuned to a brush.
         *
         * Longer and further than the shipped 18px/560ms/60ms, because a stroke
         * is a single committed gesture rather than a card sliding into place:
         * 26px of travel over 860ms reads as ink being pulled, and 88ms between
         * entries is wide enough that each one is its own stroke instead of a
         * wipe. The curve is the house expo — the section's job is to ARRIVE;
         * the strike lives in the hero and in the section head's draw.
         */
        '--reveal-distance': '26px',
        '--reveal-duration': '860ms',
        '--reveal-stagger': '88ms',
        '--reveal-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
    }),

    /**
     * The MUI half of the ground, plus the one hue.
     *
     * `createTheme(base, options)` deep-merges these WITHOUT re-augmenting the
     * palette, so every channel a call site can read has to be stated: a
     * `{ main }`-only override would leave `primary.light` as the outgoing
     * variant's violet and put it on every section glyph on the page.
     */
    theme(): ThemeOptions {
        const ground = groundTheme('ronin', GROUND);
        return {
            ...ground,
            palette: {
                ...ground.palette,
                primary: {
                    main: SHU,
                    // `theme.palette[accent][theme.palette.tonal]` resolves to
                    // `light` on this ground — this is the TEXT channel.
                    light: SHU_LIT,
                    dark: SHU_DEEP,
                    // 4.68:1 on the shu fill. Bone on shu is 3.41:1 and would
                    // have failed every contained button on the page.
                    contrastText: '#0B0B0D',
                },
                secondary: {
                    main: GUNJO,
                    light: GUNJO_LIT,
                    dark: GUNJO_DEEP,
                    contrastText: BONE,
                },
                divider: GROUND.border,
                action: {
                    hover: 'rgba(237, 231, 220, 0.06)',
                    selected: 'rgba(232, 56, 13, 0.12)',
                },
            },
            typography: {
                // Body is gothic, display is mincho — the pairing IS the voice.
                // Both resolve through custom properties declared on `body` in
                // `skin-ronin.css`, so the fallback stack survives this file.
                fontFamily: 'var(--rn-sans, var(--font-sans)), system-ui, sans-serif',
                h1: { fontFamily: 'var(--font-display), Georgia, serif', letterSpacing: '-0.035em' },
                h2: { fontFamily: 'var(--font-display), Georgia, serif', letterSpacing: '0.01em' },
                h3: { fontFamily: 'var(--font-display), Georgia, serif' },
                h4: { fontFamily: 'var(--font-display), Georgia, serif' },
                h5: { fontFamily: 'var(--font-display), Georgia, serif' },
                h6: { fontFamily: 'var(--font-display), Georgia, serif' },
            },
        };
    },

    Hero,
    Atmosphere,
};

export default ronin;
