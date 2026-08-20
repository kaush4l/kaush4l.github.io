import dynamic from 'next/dynamic';
import type { Skin } from '../types';
import { groundTokens, groundTheme, type Ground } from '../ground';
import SanctumAtmosphere from './Atmosphere';

/**
 * SANCTUM — the devotional perspective.
 *
 * ── The arc, in one sentence ────────────────────────────────────────────────
 * Ten years read as one sustained act of service: a lamp is lit, carried up a
 * colonnade of engagements, thrown across an ocean, and finally handed to
 * whoever is reading.
 *
 * ── The discipline ──────────────────────────────────────────────────────────
 * Three colours, and each one has exactly one job. Break this and the page
 * becomes a wedding invitation:
 *
 *   GOLD    #C9A227   is LINE     hairlines, rules, stroked geometry. Never a
 *                                 fill, never a gradient, never behind type.
 *   SAFFRON #FF9933   is LIGHT    the lamp, links, the lit edge of a glyph.
 *                                 It illuminates; it is not a surface.
 *   SINDOOR #C2410C   is MASS     the one filled control on the page. It is
 *                                 the pigment smeared on a murti, so it is
 *                                 weight, not accent.
 *
 * ── Why sindoor is `primary.main` and saffron is not ────────────────────────
 * `--focus-ring` has to clear 3:1 against every fill it can land on AND against
 * the ground. Solving both against saffron (#FF9933) is arithmetically
 * impossible — the band of luminances that clears 3:1 over a #0A0806 ground and
 * still clears 3:1 under saffron is empty. Against sindoor it is not: the ring
 * measures 4.28:1 on the filled control and 16.52:1 on the ground. So the
 * palette's discipline and its accessibility are the same decision, not two.
 *
 * ── Motion ──────────────────────────────────────────────────────────────────
 * There is no rAF loop and no canvas in this skin. The fold is one CSS timeline
 * that runs once; each section fires exactly one ~1.3s glimpse on entry and
 * then holds as a still. The only ambient motion on the page is a single diya
 * glow breathing at ≤5% opacity on an 8s cycle, and a gold progress arc whose
 * only input is the scroll position. Restraint is the whole design: a visitor
 * who scrolls fast should feel they missed something.
 */

/**
 * The ground. `--bg` itself is NOT declared here — `groundTokens` reads it from
 * `SKIN_PREPAINT`, so the frame the blocking script paints and the frame
 * hydration settles on are one value by construction.
 *
 * The ground is warm (#0A0806, not #050505) on purpose. This is a garbhagriha,
 * not deep space: a cold near-black reads as void, a warm one reads as an unlit
 * room that has a lamp somewhere in it.
 */
const ground: Ground = {
    // Three surfaces, each ~2 luminance steps apart. Depth in a near-black page
    // comes from the surface ramp, never from a drop shadow — a shadow on
    // #0A0806 has nothing to darken.
    bgAlt: '#100B07',
    surface: '#15100B',
    surfaceAlt: '#1C150E',
    // 16.33:1 on the ground, 15.44:1 on the card surface.
    text: '#F3E7D0',
    // 5.72:1 on the ground, 5.41:1 on the card surface. This is text, so it
    // clears 4.5:1 everywhere it lands, not merely "looks secondary".
    textMuted: '#97876E',
    // Gold is line. This is the only edge treatment in the skin.
    border: 'rgba(201, 162, 39, 0.20)',
    // Saffron is light: links, and the metric spans `.prose-content strong`
    // paints, which are the résumé's evidence. 9.38:1 on the ground.
    link: '#FF9933',
    glow: '#FFC46B',
    // 4.28:1 against the sindoor fill it can land on, 16.52:1 against the ground.
    focusRing: '#FFE6C2',
};

/**
 * E1: `dynamic` with `ssr: false`, per the skin contract. The fold owns a CSS
 * timeline keyed to a class it adds after mount; server-rendering it would put
 * the resting frame in the static HTML and then hide it at hydration.
 */
const Hero = dynamic(() => import('./Hero'), { ssr: false });

const sanctum: Skin = {
    id: 'sanctum',
    label: 'Sanctum',
    hint: 'A single lamp in a dark hall. Nothing moves that need not.',
    swatch: ['#FF9933', '#0A0806'],
    pinAppearance: 'dark',
    Hero,
    Atmosphere: SanctumAtmosphere,

    theme() {
        const base = groundTheme('sanctum', ground);
        return {
            ...base,
            palette: {
                ...base.palette,
                // MASS. The contained button, the FAB, the active sidebar item.
                // `contrastText` measures 4.72:1 on this fill.
                primary: {
                    main: '#C2410C',
                    light: '#FF9933',
                    dark: '#7C2708',
                    contrastText: '#FFF3E0',
                },
                // LIGHT. Used as a glyph/outline channel, never as a filled
                // surface — see the focus-ring note above.
                secondary: {
                    main: '#FF9933',
                    light: '#FFC46B',
                    dark: '#C2410C',
                    contrastText: '#1A0F05',
                },
                action: {
                    hover: 'rgba(255, 153, 51, 0.07)',
                    selected: 'rgba(255, 153, 51, 0.12)',
                    focus: 'rgba(255, 153, 51, 0.14)',
                },
            },
        };
    },

    tokens() {
        return {
            ...groundTokens('sanctum', ground),
            // Reverent, not sluggish: a short travel over a long duration reads
            // as something settling rather than something sliding. 80ms × 7
            // timeline entries = 560ms of total stagger, inside the 600ms cap.
            '--reveal-distance': '10px',
            '--reveal-duration': '900ms',
            '--reveal-stagger': '80ms',
            '--reveal-ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
            '--skin-ink': '#F3E7D0',
            '--skin-accent': '#FF9933',
            '--skin-accent-soft': '#FFC46B',
            // The ceiling on the one ambient light on the page.
            '--skin-atmos-a': '0.05',
            '--skin-rule': 'rgba(201, 162, 39, 0.28)',
        };
    },
};

export default sanctum;
