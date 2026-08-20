'use client';

import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import { createTimeline, cubicBezier, stagger, utils } from 'animejs';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RADIUS } from '@/theme/ThemeProvider';
import { prefersReducedMotion, runWhileVisible } from '@/lib/motion';
import { openChat } from '@/lib/chatBridge';
import OnDeviceBadge from '@/components/Hero/OnDeviceBadge';
// Type-only: erased at build, so this hero never pulls the shipped one's module in.
import type { HeroProps, HeroAbout } from '@/components/Hero';

/**
 * Rōnin — the fold.
 *
 * ── One sentence ────────────────────────────────────────────────────────────
 * Ten years read as 守破離 (shu-ha-ri) — learn the form, break the form, leave
 * the form — and the fold is the instant the brush is pulled: a charge, a
 * strike, and a seal pressed into the silence afterwards.
 *
 * ── The five beats, in order ────────────────────────────────────────────────
 *   0ms    BREATH   the sheet and its wash arrive. Nothing is written yet.
 *   240ms  CHARGE   the brush loads: one bone tick at the stroke's origin
 *                   swells on an ACCELERATING curve — anticipation, not
 *                   arrival — and then everything stops for 90ms. That gap is
 *                   deliberate and it is the only silence in the timeline.
 *   440ms  STRIKE   the stroke is pulled left→right in 620ms on a curve whose
 *                   velocity profile is a brush's, not a transition's (see
 *                   EASE_BRUSH below), and the surname's characters are
 *                   uncovered *behind* it — the stroke appears to write them.
 *   980ms  SETTLE   headline, proof, tags and controls rise as one soft
 *                   cascade of masked lines. The ink stops spreading.
 *   1500ms SEAL     the rakkan stamps: a shu-iro square wiped in through an
 *                   ensō sweep, 700ms, while NOTHING else on the page moves.
 *                   It is the smallest element in the fold and the last thing
 *                   to arrive, which is the whole argument of the skin —
 *                   restraint is the power-up.
 *
 * ── The performance contract ────────────────────────────────────────────────
 * One rAF loop, owned by `runWhileVisible`, and it is the SOLE writer of the
 * transforms it touches (`.rn-wash`, `.rn-strike`, `.rn-content`, `.rn-surname`).
 * The entrance timeline writes a disjoint set (`.rn-line-in`, `.rn-char`,
 * `[data-rn-rise]`, the wipe path's dash offset, the seal's class), so the two
 * can never fight over a frame. Only `transform`, `opacity` and `clip-path`
 * are animated. There is no canvas, no live filter and no infinite loop: with
 * the pointer still and the page unscrolled, this hero costs zero frames.
 *
 * ── The no-flash / no-CLS contract ──────────────────────────────────────────
 * The markup renders at its RESTING state; the hidden state is applied in a
 * layout effect, pre-paint, and only when motion is allowed. So JS-off,
 * reduced-motion and crawler all see a complete, readable fold. The section's
 * height is reserved by `HeroSwitcher`, so this hero arriving late moves
 * nothing below it.
 */

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * The brush curve.
 *
 * A loaded brush does not ease in. It bites the paper, reaches near-terminal
 * speed almost immediately, holds that speed through the body of the stroke,
 * and is stopped by the wrist — a hard, short deceleration with no overshoot.
 * `cubic-bezier(0.16, 0.84, 0.24, 1)` is that profile: ~55% of the distance is
 * covered in the first third of the time, and the last 8% takes a quarter of
 * it. The house curve (0.16, 1, 0.3, 1) is a camera settling; it is too gentle
 * at the entry to read as a strike, which is why this skin has its own.
 */
const EASE_BRUSH = cubicBezier(0.16, 0.84, 0.24, 1);
/** The anticipation. Slow, then accelerating — the only ease-IN in the fold. */
const EASE_CHARGE = cubicBezier(0.55, 0, 0.85, 0.25);
/** The house curve, for everything that merely arrives. */
const EASE_CINEMA = cubicBezier(0.16, 1, 0.3, 1);

/** B1: chrome copy about the page itself — deliberately not a résumé claim. */
const ASSISTANT_LINE =
    'Ask this résumé anything. The model answering runs in this tab, on your own GPU — no server, no key, nothing to trust me about.';

/**
 * The stroke, drawn as an outline rather than as a stroked line.
 *
 * A `stroke-width` line has one thickness and two round caps; a brush has a
 * pressure curve. So the ink is a closed silhouette — thin at the touch-down,
 * swelling through the body, tapering to a dry point — and the "drawing" is a
 * mask wiped across it. The tail flecks below are `kasure` (掠れ), the dry-brush
 * scatter a real stroke leaves when the hair runs out of ink; they are what
 * stops this from reading as a rounded rectangle.
 */
const BRUSH_BODY =
    'M6,33 C70,22 170,14 320,12.5 C480,11 650,15 810,21 C872,23.4 918,25.6 958,28.4 ' +
    'L978,30.4 L958,33.6 C916,37.4 868,40.4 806,43 C648,49.6 480,53 320,51.6 ' +
    'C170,50.4 70,43 6,33 Z';

/** Dry-brush scatter past the tail. */
const BRUSH_FLECKS = [
    'M984,29.6 C990,29.2 994,29.6 996,30.4 C993,31.2 988,31.4 984,31 Z',
    'M968,35.4 C973,35 977,35.4 979,36.2 C975,36.8 971,36.6 968,36.2 Z',
    'M990,33.2 C994,33 997,33.4 998,34 C995,34.4 992,34.2 990,33.8 Z',
];

/**
 * Striations *inside* the body, painted in the ground colour. A brush laid on
 * paper does not deposit an even field of ink — the hairs separate. Three
 * slivers is the difference between "a shape" and "a stroke".
 */
const BRUSH_STRIATIONS = [
    'M180,26 C320,20.5 520,20 720,23.4 C520,25.2 320,26.4 180,28 Z',
    'M240,44 C400,47.4 600,47.6 780,44.6 C600,48.4 400,49.2 240,46 Z',
    'M420,32 C560,31 700,31.6 830,33.4 C700,34 560,34 420,33.4 Z',
];

/** Blank/whitespace-only frontmatter is absent, not an empty line. */
function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/** `title` → [given, family]. The last space is the split; no name is hardcoded. */
function splitName(title: string | undefined): [string, string] {
    const t = text(title);
    if (!t) return ['', ''];
    const at = t.lastIndexOf(' ');
    return at === -1 ? [t, ''] : [t.slice(0, at), t.slice(at + 1)];
}

/**
 * The rakkan (落款) — the artist's seal.
 *
 * Its glyphs are the initials of whatever name the content declares, so this
 * invents nothing and needs no translation. It is `aria-hidden`: the name is
 * already the `<h1>`'s accessible label, and a screen reader should not hear
 * it twice.
 */
function initialsOf(title: string | undefined): string {
    const t = text(title);
    if (!t) return '';
    return t
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

/**
 * Split ONE word into per-character spans.
 *
 * Letter-by-letter is correct in exactly one place on a page — a single display
 * word, once — and wrong everywhere else: on a paragraph it is a template
 * hallmark and it shreds the accessibility tree. Every other line in this fold
 * uses a masked LINE reveal instead. The spans are `aria-hidden` beneath the
 * `<h1>`'s intact `aria-label`.
 */
function chars(line: string) {
    return Array.from(line).map((ch, i) => (
        <span className="rn-char" key={`${ch}-${i}`}>
            {ch}
        </span>
    ));
}

function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export default function RoninHero({ about }: HeroProps) {
    const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
    const wipeId = `rn-wipe-${uid}`;
    const inkId = `rn-ink-${uid}`;

    const rootRef = useRef<HTMLElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const washRef = useRef<HTMLDivElement | null>(null);
    const strikeRef = useRef<HTMLDivElement | null>(null);
    const surnameRef = useRef<HTMLSpanElement | null>(null);
    const wipeRef = useRef<SVGPathElement | null>(null);
    const sealRef = useRef<HTMLSpanElement | null>(null);
    const chargeRef = useRef<HTMLSpanElement | null>(null);

    const a = about as HeroAbout | undefined;
    const [given, family] = splitName(about?.title);
    const seal = initialsOf(about?.title);
    const headline = text(a?.headline);
    const proof = text(a?.proof);
    const highlights = (a?.highlights ?? []).map(text).filter((t): t is string => Boolean(t));

    // ── The entrance: one timeline, once ────────────────────────────────────
    useIsoLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const lineIns = root.querySelectorAll<HTMLElement>('.rn-line-in');
        const charEls = root.querySelectorAll<HTMLElement>('.rn-char');
        const riseEls = root.querySelectorAll<HTMLElement>('[data-rn-rise]');
        const wash = washRef.current;
        const wipe = wipeRef.current;
        const chargeEl = chargeRef.current;
        const sealEl = sealRef.current;

        /**
         * `data-motion` is stamped pre-paint by the blocking script in
         * `layout.tsx` and hides the SHIPPED hero's entrance elements. This
         * hero is `dynamic({ ssr: false })`, so its DOM does not exist at that
         * paint and nothing of ours is hidden by it — but the shipped hero is
         * not mounted to remove the attribute either, so we remove it here.
         * Leaving it on would strand `.hc-*` rules for four seconds against a
         * hero that no longer exists.
         */
        const html = document.documentElement;

        if (prefersReducedMotion()) {
            delete html.dataset.motion;
            // Nothing animates and nothing is hidden: the markup's resting
            // state IS the finished fold, so the correct action here is to do
            // nothing at all to it.
            return;
        }

        // The mask that "draws" the stroke. Measured rather than guessed: the
        // wipe path is a slanted line so its length is not its bounding width,
        // and a hardcoded dash array leaves a visible sliver of ink at rest.
        let wipeLength = 0;
        if (wipe) {
            wipeLength = wipe.getTotalLength();
            wipe.style.strokeDasharray = `${wipeLength}`;
            wipe.style.strokeDashoffset = `${wipeLength}`;
        }

        utils.set(lineIns, { opacity: 0, translateY: '105%' });
        utils.set(charEls, { opacity: 0, translateY: '110%' });
        utils.set(riseEls, { opacity: 0, translateY: 16 });
        if (wash) utils.set(wash, { opacity: 0 });
        if (chargeEl) utils.set(chargeEl, { opacity: 0, scaleY: 0.1 });
        // The seal's hidden state is a class rather than an inline style,
        // because the ensō that reveals it is a CSS `clip-path` transition —
        // the timeline schedules it, CSS runs it on the compositor.
        sealEl?.classList.add('is-armed');

        const tl = createTimeline({ defaults: { ease: EASE_CINEMA } });

        // 1 — BREATH. The sheet, before anything is written on it.
        if (wash) tl.add(wash, { opacity: 1, duration: 520 }, 0);

        // 2 — CHARGE. The brush loads. This is the fold's only ease-IN: it
        // accelerates into its own stop, which is what makes it read as
        // anticipation rather than as an element fading in.
        if (chargeEl) {
            tl.add(
                chargeEl,
                { opacity: [0, 1], scaleY: [0.1, 1], duration: 200, ease: EASE_CHARGE },
                240,
            );
        }

        // The given name arrives quietly during the charge — a masked line,
        // uncovered rather than faded, so it reads as ink appearing on paper.
        tl.add(lineIns, { opacity: 1, translateY: '0%', duration: 560 }, 300);

        // …and then 90ms in which absolutely nothing moves. The gap is the beat.

        // 3 — STRIKE. 620ms on the brush curve.
        if (wipe) {
            tl.add(
                wipe,
                { strokeDashoffset: 0, duration: 620, ease: EASE_BRUSH },
                440,
            );
        }
        // The charge tick is consumed by the stroke passing over it.
        if (chargeEl) tl.add(chargeEl, { opacity: 0, duration: 220 }, 470);

        // The surname is uncovered *under* the travelling stroke. 26ms per
        // character against a 620ms wipe means the letters land just behind
        // the brush tip — the stroke appears to be writing them.
        tl.add(
            charEls,
            {
                opacity: 1,
                translateY: '0%',
                duration: 420,
                // Total stagger is capped: a long surname must not out-run the
                // stroke that is supposedly drawing it.
                delay: stagger(Math.min(26, 420 / Math.max(family.length, 1))),
                ease: EASE_BRUSH,
            },
            470,
        );

        // 4 — SETTLE. One soft cascade, landing well before the seal.
        tl.add(
            riseEls,
            {
                opacity: 1,
                translateY: 0,
                duration: 460,
                delay: stagger(Math.min(80, 600 / Math.max(riseEls.length, 1))),
            },
            980,
        );

        // 5 — THE SEAL. Handed to CSS (an ensō `clip-path: circle()` sweep) so
        // the wipe runs on the compositor and the timeline stays the scheduler
        // rather than a per-frame writer.
        if (sealEl) tl.call(() => sealEl.classList.add('is-stamped'), 1500);

        delete html.dataset.motion;

        return () => {
            tl.pause();
            // Leave the DOM at rest, never mid-animation.
            utils.set(lineIns, { opacity: 1, translateY: '0%' });
            utils.set(charEls, { opacity: 1, translateY: '0%' });
            utils.set(riseEls, { opacity: 1, translateY: 0 });
            if (wash) utils.set(wash, { opacity: 1 });
            if (chargeEl) utils.set(chargeEl, { opacity: 0 });
            if (wipe) wipe.style.strokeDashoffset = '0';
            sealEl?.classList.remove('is-armed');
        };
        // Deliberately empty: replaying the entrance on a theme toggle reads as
        // a bug. Nothing in the effect closes over reactive state except the
        // surname length, which cannot change without a remount.
    }, []);

    // ── The single rAF: parallax, dolly, and scroll-velocity ────────────────
    useEffect(() => {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) return;

        const wash = washRef.current;
        const strike = strikeRef.current;
        const content = contentRef.current;
        const surname = surnameRef.current;

        // Pointer parallax is a fine-pointer affordance; on touch it would be
        // driven by a tap, which is not a light moving.
        const fine = window.matchMedia('(pointer: fine)').matches;
        let pointerX = 0;
        let pointerY = 0;
        let px = 0;
        let py = 0;

        const onPointerMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect();
            pointerX = (e.clientX - rect.left) / rect.width - 0.5;
            pointerY = (e.clientY - rect.top) / rect.height - 0.5;
        };
        const onPointerLeave = () => {
            pointerX = 0;
            pointerY = 0;
        };
        if (fine) {
            root.addEventListener('pointermove', onPointerMove);
            root.addEventListener('pointerleave', onPointerLeave);
        }

        /**
         * Scroll-velocity glyph deformation, capped hard at 4%.
         *
         * A brush-cut face under speed should compress the way ink drags. The
         * cap is the entire craft of it: past about ±6% the type stops reading
         * as pressure and starts reading as a toy, and it is applied to ONE
         * line — the surname — never to anything the reader is mid-sentence
         * inside. `.rn-surname` exists solely so this loop owns a transform
         * that the entrance timeline never touches.
         */
        let lastY = window.scrollY;
        let velocity = 0;

        const stop = runWhileVisible(root, (dt) => {
            const follow = 1 - Math.pow(0.0015, dt);
            px += (pointerX - px) * follow;
            py += (pointerY - py) * follow;

            const y = window.scrollY;
            // Normalised against 2600 px/s, which is a brisk flick; damped
            // toward zero so the type is at rest within ~200ms of the scroll
            // stopping rather than oscillating.
            const raw = Math.max(-1, Math.min(1, (y - lastY) / dt / 2600));
            lastY = y;
            velocity += (raw - velocity) * Math.min(1, dt * 9);

            const rect = root.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));

            if (wash) {
                wash.style.transform =
                    `translate3d(${px * -26}px, ${py * -18 + progress * 44}px, 0)`;
            }
            if (strike) {
                strike.style.transform = `translate3d(${px * 14}px, ${py * 8}px, 0)`;
            }
            if (content) {
                content.style.transform = `translate3d(0, ${progress * -42}px, 0)`;
                content.style.opacity = String(Math.max(0, 1 - progress * 1.5));
            }
            if (surname) {
                const s = velocity;
                surname.style.transform =
                    `translate3d(0, 0, 0) scale(${(1 + s * 0.012).toFixed(4)}, ${(1 - s * 0.04).toFixed(4)})`;
            }
        });

        return () => {
            stop();
            if (fine) {
                root.removeEventListener('pointermove', onPointerMove);
                root.removeEventListener('pointerleave', onPointerLeave);
            }
            for (const el of [wash, strike, content, surname]) {
                if (el) el.style.transform = '';
            }
            if (content) content.style.opacity = '';
        };
    }, []);

    return (
        <Box
            component="section"
            ref={rootRef}
            // `hero-section` is the hook the print stylesheet already reaches for.
            className="rn hero-section"
            sx={{
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                // Full-bleed: these cancel `LayoutClient`'s content padding
                // exactly, so the sheet runs to the edge of the viewport while
                // the copy column below still aligns with every section.
                mx: { xs: -1.5, sm: -2, md: -4 },
                mt: { xs: -2, sm: -3, md: -4 },
                pt: { xs: 6, md: 10 },
                pb: { xs: 6, md: 8 },
            }}
        >
            {/* The sheet. Decorative in full: aria-hidden and never printed. */}
            <Box className="no-print" aria-hidden sx={{ position: 'absolute', inset: 0 }}>
                <div ref={washRef} className="rn-layer rn-wash" />
                <div className="rn-layer rn-tooth" />
                <div className="rn-layer rn-fade" />
            </Box>

            <Box
                ref={contentRef}
                className="rn-content"
                sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 3.5, sm: 4, md: 7 } }}
            >
                <div data-rn-rise>
                    <OnDeviceBadge color="var(--rn-gunjo-lit, #7BA6C6)" />
                </div>

                <Typography
                    variant="h1"
                    // The spans are decoration; the name is the accessible label.
                    aria-label={about?.title}
                    className="rn-name"
                    sx={{
                        fontFamily: 'var(--font-display), Georgia, serif',
                        lineHeight: 1.02,
                        mb: 0,
                        mt: 3,
                    }}
                >
                    <Box
                        component="span"
                        aria-hidden
                        className="rn-line"
                        sx={{
                            fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.35rem' },
                            letterSpacing: '0.38em',
                            textTransform: 'uppercase',
                            color: 'text.secondary',
                        }}
                    >
                        <span className="rn-line-in">{given}</span>
                    </Box>
                    <Box
                        component="span"
                        aria-hidden
                        ref={surnameRef}
                        className="rn-surname"
                        sx={{
                            display: 'block',
                            fontSize: { xs: '3.2rem', sm: '4.6rem', md: '6.2rem' },
                            letterSpacing: '-0.035em',
                            color: 'text.primary',
                            mt: { xs: 1, md: 1.5 },
                        }}
                    >
                        <span className="rn-line rn-line--family">{chars(family)}</span>
                    </Box>
                </Typography>

                {/* ── The strike ───────────────────────────────────────────
                    The stroke and the seal are one gesture: the brush is pulled
                    left to right and the seal is pressed where it stops. */}
                <Box
                    ref={strikeRef}
                    className="rn-strike no-print"
                    aria-hidden
                    sx={{ mt: { xs: 1.5, md: 2 }, mb: { xs: 3, md: 4 } }}
                >
                    <span className="rn-charge" ref={chargeRef} />
                    <svg
                        className="rn-stroke"
                        viewBox="0 0 1000 64"
                        preserveAspectRatio="none"
                        focusable="false"
                        aria-hidden
                    >
                        <defs>
                            <linearGradient id={inkId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="var(--rn-ink)" stopOpacity="0.30" />
                                <stop offset="0.12" stopColor="var(--rn-ink)" stopOpacity="0.94" />
                                <stop offset="0.68" stopColor="var(--rn-ink)" stopOpacity="0.86" />
                                <stop offset="0.94" stopColor="var(--rn-ink)" stopOpacity="0.34" />
                                <stop offset="1" stopColor="var(--rn-ink)" stopOpacity="0.1" />
                            </linearGradient>
                            {/* The wipe is SLANTED, so the leading edge of the
                                reveal is a brush tip meeting paper at an angle
                                rather than a guillotine coming down. */}
                            <mask
                                id={wipeId}
                                maskUnits="userSpaceOnUse"
                                x="-120"
                                y="-60"
                                width="1260"
                                height="200"
                            >
                                <path
                                    ref={wipeRef}
                                    d="M-60,60 L1050,2"
                                    stroke="#fff"
                                    strokeWidth="170"
                                    strokeLinecap="butt"
                                    fill="none"
                                />
                            </mask>
                        </defs>
                        <g mask={`url(#${wipeId})`}>
                            <path d={BRUSH_BODY} fill={`url(#${inkId})`} />
                            {BRUSH_FLECKS.map((d, i) => (
                                <path key={`fleck-${i}`} d={d} fill="var(--rn-ink)" opacity="0.42" />
                            ))}
                            {BRUSH_STRIATIONS.map((d, i) => (
                                <path key={`striation-${i}`} d={d} fill="var(--bg)" opacity="0.5" />
                            ))}
                        </g>
                    </svg>
                    <span className="rn-seal" ref={sealRef}>
                        <span className="rn-seal-glyph">{seal}</span>
                    </span>
                </Box>

                {headline && (
                    <Box component="p" data-rn-rise className="rn-headline">
                        {headline}
                    </Box>
                )}

                {proof && (
                    <Box component="p" data-rn-rise className="rn-proof">
                        {proof}
                    </Box>
                )}

                <Box data-rn-rise sx={{ mb: 4, maxWidth: '62ch' }}>
                    <Box component="p" id="rn-assistant-line" className="rn-assistant">
                        {ASSISTANT_LINE}
                    </Box>
                    <Button
                        className="no-print"
                        type="button"
                        onClick={openChat}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: '1.05rem' }} />}
                        aria-describedby="rn-assistant-line"
                        sx={{
                            minHeight: 44,
                            px: 2,
                            ml: -2,
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            color: 'primary.light',
                            borderRadius: RADIUS.pill,
                            textTransform: 'none',
                        }}
                    >
                        Ask the assistant
                    </Button>
                </Box>

                {highlights.length > 0 && (
                    <Stack
                        data-rn-rise
                        direction="row"
                        flexWrap="wrap"
                        gap={1}
                        className="rn-tags"
                        sx={{ mb: 5 }}
                    >
                        {highlights.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                        ))}
                    </Stack>
                )}

                <Stack
                    data-rn-rise
                    className="no-print"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => scrollTo('experience')}
                        sx={{
                            fontWeight: 500,
                            px: 4,
                            py: 1.5,
                            borderRadius: 0,
                            color: 'primary.contrastText',
                        }}
                    >
                        View Experience
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        color="secondary"
                        onClick={() => scrollTo('projects')}
                        sx={{
                            fontWeight: 500,
                            px: 4,
                            py: 1.5,
                            borderRadius: 0,
                            color: 'secondary.light',
                            borderColor: 'secondary.light',
                        }}
                    >
                        See Projects
                    </Button>
                </Stack>

                <Box
                    data-rn-rise
                    className="no-print rn-cue"
                    aria-hidden
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: { xs: 5, md: 7 } }}
                >
                    <span className="rn-cue-track" />
                    <span className="rn-cue-label">Scroll</span>
                </Box>
            </Box>
        </Box>
    );
}
