import dynamic from 'next/dynamic';
import type { Skin } from '../types';
import { groundTokens, groundTheme, hairline } from '../ground';
import Atmosphere from './Atmosphere';

/**
 * ACCESSION — the résumé as an accessioned body of work.
 *
 * ── The idea ────────────────────────────────────────────────────────────────
 * Every role and every project is an OBJECT IN A COLLECTION, and the page is
 * its catalogue. Spine number, date, medium, extent, provenance: the museum
 * object label is a real information-design pattern, and it maps onto résumé
 * frontmatter almost field for field (`tools` IS the medium; `period` IS the
 * date; `via` IS the credit line). So the conceit is not costume — it is the
 * same data, filed.
 *
 * ── Why it is the only light one ────────────────────────────────────────────
 * Three siblings are dark. A fourth dark perspective would give the switcher
 * three shades of one argument; a printed object on cream stock gives it range,
 * and gives the reader somewhere restful to actually READ ten years of work.
 * Everything here therefore leans on the things paper is good at — rules,
 * margins, tracked caps, a serif set large — and refuses the things a screen is
 * good at and paper is not: glow, gradient, shadow, saturation.
 *
 * ── The one rule the conceit lives or dies by ───────────────────────────────
 * A spine number that appears once is a joke; a spine number on EVERY item is a
 * catalogue. The numbering is therefore a CSS counter over the whole document
 * (`skin-accession.css`), not a per-component decoration, so it cannot drift
 * out of sequence and cannot miss an entry.
 */

// The hero is code-split: it is the only heavy thing this skin ships, and a
// visitor on `professional` must never download it. `ssr: false` because the
// entrance measures type, and server-rendering a plate that is about to be
// hidden by its own timeline is the flash the contract warns about.
const Hero = dynamic(() => import('./Hero'), { ssr: false });

/** Catalogue stock, plate white, and the two inks that go on them. */
const INK = '#16130F';
const INK_MUTED = '#605C54';
const RULE = '#D8D2C6';
/** The accession stamp. Oxblood, because a stamp pad is not red. */
const OXBLOOD = '#8C2F1E';
/** Archival ink blue. Secondary annotation only — never lit next to oxblood. */
const INK_BLUE = '#1F3A5F';
/** Foil gold. Hover only, and never as text: it is 1.94:1 and knows it. */
const FOIL = '#C8A96A';

/**
 * Declared once and published to BOTH consumers — the custom properties and
 * MUI's palette — exactly as `ground.ts` requires of a skin that pins an
 * appearance. Measured on the stock (#F2EEE6): ink 16.00:1, muted 5.75:1,
 * link 7.14:1, ring 16.00:1.
 */
const GROUND = {
    bgAlt: '#EDE8DE',
    surface: '#FBF9F5',
    surfaceAlt: '#E9E4DA',
    text: INK,
    textMuted: INK_MUTED,
    border: RULE,
    link: OXBLOOD,
    // M16: exactly one hue is allowed to glow, and on paper the only thing that
    // "glows" is foil catching a light. Hover state only, never text.
    glow: FOIL,
    // The ring lands on a 4px halo of `--bg` (globals.css M36), so it only ever
    // has to clear 3:1 against the stock: it clears 16.00:1.
    focusRing: INK,
} as const;

const accession: Skin = {
    id: 'accession',
    label: 'Accession',
    hint: 'Ten years, catalogued. Paper, hairlines, and a stamped number on every entry.',
    swatch: [OXBLOOD, '#F2EEE6'],
    pinAppearance: 'light',

    tokens: () => ({
        ...groundTokens('accession', GROUND),

        // Skin atmosphere channels, read back by `skin-accession.css`.
        '--skin-ink': INK,
        '--skin-accent': OXBLOOD,
        '--skin-accent-soft': INK_BLUE,
        '--skin-atmos-a': '0.035',
        '--skin-rule': RULE,

        /**
         * BEAT 1 — the plate turn.
         *
         * A section arriving is a page being turned, not an element fading up:
         * a symmetric in-out quart (slow, committed, slow) over 640ms reads as
         * something with mass being moved, where the house out-expo reads as
         * something being switched on. 20px of travel is one line of leading —
         * enough to see, too little to be a slide.
         */
        '--reveal-distance': '20px',
        '--reveal-duration': '640ms',
        '--reveal-stagger': '70ms',
        '--reveal-ease': 'cubic-bezier(0.76, 0, 0.24, 1)',
    }),

    theme: () => {
        /**
         * `groundTheme` returns `{ palette, components }`, and an object spread
         * is SHALLOW — so writing `{ ...groundTheme(...), palette: {…} }` does
         * not add to its palette, it REPLACES it, silently dropping the
         * background, text and divider colours the ground helper exists to
         * publish. The merge is therefore done a level down, by hand, per key.
         */
        const ground = groundTheme('accession', GROUND);

        return {
        ...ground,

        palette: {
            ...ground.palette,
            /**
             * The hue axis is overridden here rather than respected, and that is
             * deliberate for a PINNED skin: an accession stamp is oxblood the
             * way a library date-stamp is purple. A violet or teal stamp is not
             * a variant of this idea, it is a different idea.
             *
             * `light`/`dark` are the tonal channels the components read through
             * `palette[accent][palette.tonal]`; in light mode that resolves to
             * `dark`, so `dark` is the TEXT channel and must clear 4.5:1 on the
             * stock (#7A2718 → 8.52:1). `main` is the FILL channel.
             */
            primary: {
                main: OXBLOOD,
                light: '#B25742',
                dark: '#7A2718',
                contrastText: '#FBF9F5',
            },
            secondary: {
                main: INK_BLUE,
                light: '#4A6B94',
                dark: '#16293F',
                contrastText: '#FBF9F5',
            },
            /**
             * The base theme tints `action.hover` with the variant hue, which on
             * cream stock is not a highlight but a STAIN — the education quote
             * block rendered as a mauve panel. Ink at 4% is what a wash on paper
             * actually is: the same sheet, slightly darker.
             */
            action: {
                hover: 'rgba(22, 19, 15, 0.04)',
                selected: 'rgba(22, 19, 15, 0.07)',
                focus: 'rgba(22, 19, 15, 0.08)',
            },
        },

        /**
         * Body copy is Newsreader, headings are Instrument Serif. Both are
         * declared as custom properties in `skin-accession.css` (on `body`,
         * because that is where next/font puts its own) so the fallback stack
         * is authored in one place and this file never names a font file.
         */
        typography: {
            fontFamily: 'var(--ac-body, var(--font-display))',
            h1: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em' },
            h2: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.015em' },
            h3: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' },
            h4: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' },
            h5: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.005em' },
            h6: { fontFamily: 'var(--font-display)', fontWeight: 400 },
            /**
             * Metadata labels are the one sans on the page: Archivo, tracked
             * caps, small. That is the standardsmanual.com move — the spec list
             * is the content, and it is set in the plainest thing available so
             * the serif keeps the voice to itself.
             */
            overline: {
                fontFamily: 'var(--ac-caps)',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
            },
            button: { fontFamily: 'var(--ac-caps)', fontWeight: 600, letterSpacing: '0.08em' },
        },

        components: {
            ...ground.components,
            /**
             * The ring is re-declared here for the same reason the base theme
             * declares it (M42): emotion injects `MuiButtonBase` focus styles at
             * runtime and a stylesheet rule loses to them. `--focus-ring` alone
             * would leave every MUI control ringed in the *shared light mode's*
             * near-black rather than this skin's.
             */
            MuiButtonBase: {
                styleOverrides: {
                    root: {
                        '&:focus-visible': {
                            outline: `2px solid ${INK}`,
                            outlineOffset: 2,
                            boxShadow: '0 0 0 4px #F2EEE6',
                        },
                    },
                },
            },
            /**
             * Paper does not have rounded corners and it does not cast a soft
             * shadow. Every elevated surface becomes a plate: square, hairlined,
             * flat. `RADIUS` is a shared const, so the geometry is retuned here
             * and in the stylesheet rather than by editing it.
             */
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        borderRadius: 2,
                        boxShadow: 'none',
                    },
                },
            },
            /**
             * The base card lifts 2px and grows a soft shadow on hover. This
             * skin owns that gesture itself (4px, with a hard offset plate
             * drawn by `skin-accession.css` on the card's untransformed
             * parent), so the inherited half of it is cancelled here rather
             * than left to fight: two lift rules on one element resolve to a
             * 2px lift with a blurred shadow under a 4px hard one.
             */
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: GROUND.surface,
                        borderRadius: 2,
                        border: `1px solid ${RULE}`,
                        boxShadow: 'none',
                        '&:hover, &:focus-within': {
                            transform: 'none',
                            boxShadow: 'none',
                            borderColor: FOIL,
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 2,
                        fontFamily: 'var(--ac-caps)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderColor: RULE,
                    },
                    // Both chip variants are hard-coded to `alpha(p.primary,…)`
                    // in the base theme, so a violet hairline survives every
                    // palette override. Restated in ink.
                    outlined: {
                        borderColor: RULE,
                        color: INK,
                        '&:hover, &:focus-visible': {
                            borderColor: OXBLOOD,
                            backgroundColor: 'rgba(140, 47, 30, 0.06)',
                        },
                    },
                    outlinedSecondary: {
                        borderColor: RULE,
                        '&:hover, &:focus-visible': {
                            borderColor: INK_BLUE,
                            backgroundColor: 'rgba(31, 58, 95, 0.06)',
                        },
                    },
                },
            },
            /**
             * The base theme paints `containedPrimary` with `background:
             * p.primary` — the HUE TABLE's colour, read straight from the
             * variant rather than from `palette.primary.main`. So overriding
             * the palette is not enough on its own: without this the stamp
             * button stays the variant's violet on a cream page while its
             * CONTRAST TEXT correctly turns plate white, which is precisely
             * how it was found (violet fill, #FBF9F5 label).
             *
             * The root hover is unwound for the same reason it is unwound on
             * cards: a 1px lift plus an animated `box-shadow` is a screen
             * affordance, and this is a stamp being pressed into paper.
             */
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 2,
                        '&:hover': { transform: 'none', boxShadow: 'none' },
                        '&:focus-visible': { transform: 'none' },
                    },
                    containedPrimary: {
                        background: OXBLOOD,
                        boxShadow: 'none',
                        '&:hover': { background: '#7A2718', boxShadow: 'none' },
                    },
                    outlined: { borderColor: hairline(INK, 0.28) },
                },
            },
            MuiDivider: {
                styleOverrides: { root: { borderColor: RULE } },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        borderBottom: `1px solid ${RULE}`,
                        boxShadow: 'none',
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        backgroundColor: INK,
                        color: '#FBF9F5',
                        borderRadius: 2,
                        fontFamily: 'var(--ac-caps)',
                        letterSpacing: '0.06em',
                    },
                },
            },
        },
        };
    },

    Hero,
    Atmosphere,
};

export default accession;
