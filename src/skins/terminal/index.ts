'use client';

import dynamic from 'next/dynamic';
import type { Skin } from '../types';
import { groundTokens, groundTheme, type Ground } from '../ground';

/**
 * TERMINAL — the systems skin.
 *
 * ── The arc ─────────────────────────────────────────────────────────────────
 * Ten years read as one system under steadily increasing load: each section is
 * a further layer of the stack, and the last layer is the one running in the
 * visitor's own tab while they read it.
 *
 * ── Why this is not hacker-cosplay ──────────────────────────────────────────
 * The single most clichéd move available here is phosphor green on black, and
 * the reason Mr. Robot never looks like The Matrix is that its palette was
 * lifted from Kali Linux's default terminal theme, whose "green" (`#5EBDAB`)
 * is a desaturated teal, not a phosphor. Every colour below is either from that
 * table or derived from this skin's own ground; nothing was invented to look
 * "hacker".
 *   source: https://wilkinson.graphics/projects/mr-robot/
 *           kalilinux/packages/kali-themes → etc/xdg/xfce4/terminal/terminalrc
 *
 * ── One lit hue, and one exception that means something ─────────────────────
 * `#5EBDAB` is the only hue allowed to glow, and it is spent as punctuation:
 * links, the focus ring, the FAB's model-state halo, numerals inside the proof
 * line, the live trace's endpoint dot. Kali's amber (`#FEA44C`) appears in
 * exactly one situation — when the on-device model is in a NON-NOMINAL state
 * (streaming weights, or failed). That is a semantic second colour, not a
 * decorative one, and the two are never lit at once.
 *
 * ── Contrast, measured on the ground `#080B10` ──────────────────────────────
 *   text      #E6E6E6  15.79:1     muted     #8B98A8   6.71:1
 *   accent    #5EBDAB   8.77:1     glow      #47D4B9  10.68:1
 *   amber     #FEA44C   9.97:1
 * The deepest surface a text pair can land on is `--surface-alt` `#1A1E26`,
 * where muted still measures 5.69:1 and the accent 7.43:1.
 */

const ACCENT = '#5EBDAB'; // Kali green — the one lit hue
const GLOW = '#47D4B9'; // Kali bright green — halo / focus only
const INK = '#E6E6E6'; // Kali white

const GROUND: Ground = {
    // `--bg` itself is read from SKIN_PREPAINT (#080B10) so the pre-painted
    // first frame and the hydrated ground are one value by construction.
    bgAlt: '#0B0F15',
    surface: '#0E1219',
    surfaceAlt: '#1A1E26', // Kali black, one step up: wells, rails, inset rows
    text: INK,
    textMuted: '#8B98A8',
    // A hairline of the accent at low alpha. Coder mode's whole elevation
    // language is borders rather than shadows, so this token does real work.
    border: 'rgba(94, 189, 171, 0.18)',
    link: ACCENT,
    glow: GLOW,
    focusRing: GLOW,
};

/**
 * The fold is `dynamic(ssr: false)` because it reads real machine state —
 * thread count, WebGPU adapter, frame time, on-device model progress — none of
 * which exists at build time. `HeroSwitcher` reserves the fold's height, so a
 * late hero swaps in place rather than shoving the document down.
 */
const Hero = dynamic(() => import('./Hero'), { ssr: false });
const Atmosphere = dynamic(() => import('./Atmosphere'), { ssr: false });

const terminal: Skin = {
    id: 'terminal',
    label: 'Terminal',
    hint: 'Everything is a system. Watch it think.',
    swatch: [ACCENT, '#080B10'],
    pinAppearance: 'coder',

    tokens: () => ({
        ...groundTokens('terminal', GROUND),

        /**
         * Reveal choreography — sections should ARRIVE, the way a row arrives
         * in a table, not glide in the way a slide does. So: a short throw, a
         * fast settle, and a stagger tight enough that a ten-child section
         * finishes inside ~340ms rather than trickling for a second and a half.
         * The curve is out-quint, which is flatter at the tail than the house
         * out-expo and therefore reads as "landed" rather than "still easing".
         */
        '--reveal-distance': '10px',
        '--reveal-duration': '480ms',
        '--reveal-stagger': '34ms',
        // `globals.css` owns the page's curves; this references the token
        // rather than re-spelling the bézier, so there is one motion language.
        '--reveal-ease': 'var(--ease-out-quint)',

        '--skin-ink': INK,
        '--skin-accent': ACCENT,
        '--skin-accent-soft': 'rgba(94, 189, 171, 0.14)',
        '--skin-atmos-a': '0.5',
        '--skin-rule': 'rgba(230, 230, 230, 0.08)',
    }),

    /**
     * The MUI half of the ground, plus the two fill hues.
     *
     * The base theme's `primary`/`secondary` are the hue table's purple and
     * cyan, and they colour chips, outlined buttons, the timeline and the
     * OnDeviceBadge across the whole page. Left alone they would put two
     * unrelated hues on a page whose entire argument is that one hue means
     * something — so `primary` becomes the accent and `secondary` becomes a
     * cool steel that is deliberately never lit.
     *
     * `…Light` is the channel components read as TEXT on a dark ground
     * (`palette[accent][palette.tonal]`), so that is where the readable value
     * goes; `main` is a FILL and may be darker.
     */
    theme: () => {
        const base = groundTheme('terminal', GROUND);
        return {
            ...base,
            palette: {
                ...base.palette,
                /**
                 * The two FILLS are darker than they look like they want to
                 * be, and that is a focus-ring measurement rather than taste.
                 * `--focus-ring` is the bright accent `#47D4B9`, and the
                 * contract asks it to clear 3:1 against every fill it can land
                 * on — which includes the chat FAB and every contained button.
                 * A mid-tone `#3FA894` fill put the ring at 1.57:1 and would
                 * have made keyboard focus invisible on the single most
                 * important control on the page. These land the ring at 3.18:1
                 * and 3.13:1 while keeping white labels above 5.7:1 and the
                 * fills themselves above 3:1 on the ground.
                 */
                primary: {
                    main: '#1E7263', // ring 3.13:1 · white label 5.77:1 · 3.42:1 on ground
                    light: ACCENT, // 8.77:1 on the ground — the TEXT channel
                    dark: '#14544A',
                    contrastText: '#FFFFFF',
                },
                secondary: {
                    main: '#4A6880', // ring 3.18:1 · white label 5.86:1 · 3.36:1 on ground
                    light: '#93A1B0', // 7.47:1 on the ground
                    dark: '#2F4455',
                    contrastText: '#FFFFFF',
                },
            },
        };
    },

    Hero,
    Atmosphere,
};

export default terminal;
