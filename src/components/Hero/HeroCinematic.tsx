'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Box, Typography, Button, Stack, Chip, useTheme } from '@mui/material';
import { createTimeline, cubicBezier, stagger, utils } from 'animejs';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RADIUS, THEME_PALETTES, useThemeContext } from '@/theme/ThemeProvider';
import {
    EASE_UI_CSS,
    mixChannels,
    prefersReducedMotion,
    rgbChannels,
    runWhileVisible,
} from '@/lib/motion';
import { openChat } from '@/lib/chatBridge';
import OnDeviceBadge from './OnDeviceBadge';
// Type-only: erased at build, so the shipped hero never pulls HeroA's module in.
import type { HeroAbout, HeroProps } from './HeroA';

/**
 * HeroCinematic — the landing frame.
 *
 * ── What makes it read as "shot" rather than "designed" ─────────────────────
 * A cinematic frame is four things stacked, and this hero is literally those
 * four DOM layers, back to front:
 *
 *   1. KEY LIGHT   a warm source upper-right          (`.hc-key`,   theme primary)
 *   2. FILL/BOUNCE the cool opposite, lower-left      (`.hc-fill`,  theme secondary)
 *   3. ATMOSPHERE  dust in the beam + an anamorphic streak (canvas + `.hc-streak`)
 *   4. GRADE       film grain and a neutral vignette  (`.hc-grain`, `.hc-vignette`)
 *
 * No new colours were invented for any of it. The key is `primary`, the fill is
 * `secondary` — a pair the hue table already builds as complements — so the
 * "teal-and-orange" grade falls out of the existing theme in all four variants
 * and all three appearances, instead of being a fifth palette to keep in sync.
 *
 * ── The performance contract ────────────────────────────────────────────────
 * There is exactly ONE requestAnimationFrame loop in this component. It drives
 * the dust, the pointer parallax and the scroll parallax together, and it is
 * owned by `runWhileVisible`, so it stops dead when the hero scrolls away or
 * the tab is hidden. An idle or backgrounded hero costs zero frames.
 *
 * Entrance motion is a single `anime.js` timeline that runs once. Every
 * transform written here is composited (`translate`/`scale`/`opacity` only —
 * no layout, and no blur animated on live text).
 *
 * ── The no-flash / no-CLS contract ──────────────────────────────────────────
 * The markup renders at its RESTING state. The hidden state is applied by JS in
 * a layout effect (pre-paint) and only when motion is allowed, so:
 *   · JS disabled    → a complete, readable hero
 *   · reduced motion → a complete, readable hero, instantly
 *   · crawler        → the real headline text in the static HTML
 * The section's height is reserved in CSS, so nothing below it ever moves.
 */

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * The house curve, in the form anime.js 4 actually accepts.
 *
 * The string spelling (`'cubicBezier(0.16, 1, 0.3, 1)'`) was removed from the
 * core: it warns once per animation and then runs **linear**. Every entrance on
 * this page was a dead-even fade until this became a function.
 */
const EASE_CINEMA = cubicBezier(0.16, 1, 0.3, 1);

/** B1: chrome copy about the page itself — deliberately not a résumé claim. */
const ASSISTANT_LINE =
    'Ask this résumé anything. The model answering runs in this tab, on your own GPU — no server, no key, nothing to trust me about.';

/** Blank/whitespace-only frontmatter is absent, not an empty line. */
function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/**
 * Per-appearance strength of the grade.
 *
 * Light is not dark-with-lower-numbers: on a #FAFAFA ground a coloured wash
 * greys the page long before it looks lit, so light gets a tighter, brighter
 * key and almost no vignette, while coder gets the deepest falloff. M13's
 * ceiling — no effects layer above 0.30 alpha at rest — holds in all three.
 */
const GRADE = {
    // The first cut gave light `fill: 0.13` and `vignette: 0.07` and it read as
    // a white page with a lavender smudge — the cool half of the complementary
    // pair was simply not visible, which is the entire premise of the grade.
    // Light needs CONTRAST, not smaller numbers: the fill is nearly doubled and
    // anchored under the copy (not off-canvas in the corner), and the vignette
    // is deep enough to give the frame an edge.
    // The key is dominant by ~2x in every mode. The first cut had light's fill
    // *stronger* than its key, which is not a two-light grade — it is two
    // competing washes, and the loudest thing in the frame became a bloom in
    // the corner instead of the light on the subject. (Light's fill is also
    // desaturated toward the ground upstream in `ThemeProvider`; full-chroma
    // cyan on #FAFAFA is mint at any alpha you can actually see.)
    light: { key: 0.24, fill: 0.11, streak: 0.16, grain: 0.03, vignette: 0.14, contact: 0.05, dust: 0.55 },
    dark: { key: 0.26, fill: 0.20, streak: 0.28, grain: 0.05, vignette: 0.34, contact: 0.16, dust: 1 },
    // Coder had `fill` above `key`, which contradicted the rule two lines up and
    // lit the frame from the lower left — the reason it read bluer than the
    // other two modes rather than deeper.
    coder: { key: 0.28, fill: 0.15, streak: 0.30, grain: 0.06, vignette: 0.46, contact: 0.22, dust: 1.15 },
} as const;

/**
 * Tiled film grain, inline so it costs no request and cannot arrive late.
 * `fractalNoise` at a high base frequency is the closest cheap analogue to
 * 35mm silver grain; `stitchTiles` keeps the 180px tile seamless.
 */
const GRAIN_SRC =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** Split a line into per-character spans the timeline can stagger. */
function chars(line: string, keyPrefix: string) {
    return Array.from(line).map((ch, i) => (
        <span className="hc-char" key={`${keyPrefix}-${i}`}>
            {ch}
        </span>
    ));
}

/** `title` → [given, family]. The last space is the split; no name is hardcoded. */
function splitName(title: string | undefined): [string, string] {
    const t = text(title);
    if (!t) return ['', ''];
    const at = t.lastIndexOf(' ');
    return at === -1 ? [t, ''] : [t.slice(0, at), t.slice(at + 1)];
}

interface Mote {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    a: number;
    phase: number;
}

export default function HeroCinematic({ about }: HeroProps) {
    const theme = useTheme();
    const { appearance, variant } = useThemeContext();
    const { primary, secondary } = theme.palette;

    const rootRef = useRef<HTMLElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const keyRef = useRef<HTMLDivElement | null>(null);
    const fillRef = useRef<HTMLDivElement | null>(null);
    const streakRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    /**
     * The entrance and the parallax loop both want to write `transform` on the
     * light layers, and the last writer per frame would win — the loop would
     * silently erase the timeline's scale on its very first frame.
     *
     * So the timeline never touches those elements' transforms. It animates
     * these NUMBERS, and the rAF loop is the single writer that composes them
     * with the parallax offsets into one transform string.
     */
    const enter = useRef({ lightScale: 1, streakScaleX: 1 });

    const grade = GRADE[appearance];
    const heroGradient = THEME_PALETTES[variant].heroGradient;

    // A1: `primary.main`/`secondary.main` are FILL channels. Anything that is
    // TEXT resolves through the tonal channel the palette documents for this
    // ground — never an isDark ternary at the call site.
    const secondaryText = secondary[theme.palette.tonal];
    const primaryText = primary[theme.palette.tonal];

    const keyRgb = useMemo(() => rgbChannels(primary.main), [primary.main]);
    // Same softening the page-wide grade uses: on a near-white ground the raw
    // cyan is candy, so the bounce light is pulled toward the ground first and
    // behaves like cool grey light. Dark and coder keep full chroma.
    const fillRgb = useMemo(
        () =>
            appearance === 'light'
                ? mixChannels(secondary.main, theme.palette.background.default, 0.42)
                : rgbChannels(secondary.main),
        [appearance, secondary.main, theme.palette.background.default],
    );

    const [given, family] = splitName(about?.title);
    const headline = text((about as HeroAbout | undefined)?.headline);
    const proof = text((about as HeroAbout | undefined)?.proof);
    const highlights = ((about as HeroAbout | undefined)?.highlights ?? [])
        .map(text)
        .filter((t): t is string => Boolean(t));

    // ── Entrance: one timeline, once ────────────────────────────────────────
    useIsoLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const charEls = root.querySelectorAll<HTMLElement>('.hc-char');
        const supportEls = root.querySelectorAll<HTMLElement>('[data-hc-rise]');
        const lights = [keyRef.current, fillRef.current].filter(Boolean) as HTMLElement[];
        const streak = streakRef.current;

        /**
         * Hand the hidden state off from CSS to inline styles.
         *
         * `html[data-motion="on"]` — stamped by the blocking script in
         * `layout.tsx`, before the first paint — is what hides these elements.
         * It has to be CSS: React hydration lands ~500ms after first paint in
         * this build, so a `useLayoutEffect` that applies the hidden state is
         * applying it POST-paint, and the visitor watches a finished hero for
         * half a second and then watches it vanish. That is the exact flash the
         * effect was supposed to prevent.
         *
         * `utils.set` re-establishes the same values as inline styles (which
         * outrank the attribute rule), and then the attribute comes off — so
         * from here on the timeline is the only thing that reveals anything,
         * and the CSS can never strand content it does not control.
         */
        const html = document.documentElement;
        if (prefersReducedMotion()) {
            // Nothing animates; drop the attribute so the CSS reveals everything
            // immediately. This is also the safety net if motion is turned on at
            // OS level between the blocking script and hydration.
            delete html.dataset.motion;
            return;
        }

        utils.set(charEls, { opacity: 0, translateY: '110%' });
        utils.set(supportEls, { opacity: 0, translateY: 14 });
        utils.set(lights, { opacity: 0 });
        enter.current.lightScale = 1.14;
        enter.current.streakScaleX = 0.15;
        delete html.dataset.motion;

        /**
         * Total settle: ~1.1s.
         *
         * The first cut ran 2.4s and felt like waiting. The rule the timings
         * below encode: the frame is lit, named and legible inside one second,
         * and **nothing decorative is the last thing still moving** — the streak
         * reaches its resting glint during its own wipe rather than fading for
         * another 900ms in an empty corner after the copy has landed.
         */
        const tl = createTimeline({ defaults: { ease: EASE_CINEMA } });

        // The lights come up first — the room is lit before the subject enters.
        // Opacity is written straight to the element; the scale goes through the
        // shared number so the parallax loop stays the only transform writer.
        tl.add(lights, { opacity: 1, duration: 420 }, 0)
            .add(enter.current, { lightScale: 1, duration: 900 }, 0);

        if (streak) {
            // The flare wipes in, overshoots, and settles — one gesture, 800ms.
            tl.add(streak, { opacity: [0, 0.85, 0.4], duration: 800 }, 60)
                .add(enter.current, { streakScaleX: 1, duration: 800 }, 60);
        }

        // The wordmark rises out of the clip, letter by letter, starting with
        // the lights rather than after them: the earlier version held a lit but
        // *empty* frame for half a second, which is a long time to look at a
        // page with no name on it. 19 characters at 16ms is a 300ms tail — a
        // readable ripple, not a typewriter.
        tl.add(
            charEls,
            { opacity: 1, translateY: '0%', duration: 420, delay: stagger(16) },
            0,
        );

        // Everything that supports it follows as one soft cascade, landing last.
        tl.add(
            supportEls,
            { opacity: 1, translateY: 0, duration: 380, delay: stagger(45) },
            260,
        );

        return () => {
            tl.pause();
            // Leave the DOM at rest, never mid-animation, if this unmounts early.
            utils.set(charEls, { opacity: 1, translateY: '0%' });
            utils.set(supportEls, { opacity: 1, translateY: 0 });
            utils.set(lights, { opacity: 1 });
            enter.current.lightScale = 1;
            enter.current.streakScaleX = 1;
        };
        // Deliberately empty: re-running on a hue/appearance change would replay
        // the entrance on a theme toggle, which is exactly the kind of motion
        // that reads as a bug. Nothing in the effect closes over reactive state.
    }, []);

    /**
     * Reconstitute ONE gradient across the split wordmark.
     *
     * `background-clip: text` on the line does not clip to the glyphs of
     * `inline-block` descendants, and every character is an inline-block so the
     * timeline can transform it. The result was the site's whole reason for
     * existing — the person's name — rendering as 97px of nothing.
     *
     * So each character paints the gradient itself, and is told how wide the
     * whole line is and how far along it sits. The ramp then runs continuously
     * across the name instead of restarting inside every letter.
     *
     * Runs on mount, on resize, and again after `document.fonts.ready`: Amarante
     * is `display: swap`, so the first measurement is of the fallback face and
     * every glyph moves when the real one arrives.
     */
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const line = root.querySelector<HTMLElement>('.hc-line--grad');
        if (!line) return;

        const paint = () => {
            const chars = Array.from(line.querySelectorAll<HTMLElement>('.hc-char'));
            if (!chars.length) return;

            // Read every position first, then write — one layout pass, not N.
            const rects = chars.map((c) => c.getBoundingClientRect());

            // Measure the INK, not the line box. `.hc-line` is a block, so its
            // width is the whole column (~888px) while the word is ~272px of
            // it — sizing the ramp to the line meant the name only ever showed
            // the first third of the gradient and rendered as flat violet. The
            // ramp has to span exactly the glyphs, so its last stop lands on
            // the last letter.
            const left = rects[0].left;
            const width = rects[rects.length - 1].right - left;
            const height = line.getBoundingClientRect().height;

            chars.forEach((c, i) => {
                c.style.backgroundSize = `${width}px ${height}px`;
                c.style.backgroundPosition = `${-(rects[i].left - left)}px 0`;
            });
        };

        paint();
        const ro = new ResizeObserver(paint);
        ro.observe(line);
        // `fonts.ready` resolves once; a late swap re-measures against real metrics.
        document.fonts?.ready.then(paint).catch(() => { });

        return () => ro.disconnect();
    }, [heroGradient]);

    // ── Atmosphere + parallax: one rAF, paused when unseen ──────────────────
    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        if (!root || !canvas || prefersReducedMotion()) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let motes: Mote[] = [];

        // One prerendered sprite, scaled per mote. Drawing a radial gradient per
        // mote per frame is the usual reason a "cheap" particle field isn't.
        const sprite = document.createElement('canvas');
        const SPRITE = 64;
        sprite.width = sprite.height = SPRITE;
        const sctx = sprite.getContext('2d');
        if (sctx) {
            const g = sctx.createRadialGradient(
                SPRITE / 2, SPRITE / 2, 0,
                SPRITE / 2, SPRITE / 2, SPRITE / 2,
            );
            g.addColorStop(0, `rgba(${fillRgb}, 1)`);
            g.addColorStop(0.35, `rgba(${fillRgb}, 0.35)`);
            g.addColorStop(1, `rgba(${fillRgb}, 0)`);
            sctx.fillStyle = g;
            sctx.fillRect(0, 0, SPRITE, SPRITE);
        }

        const seed = () => {
            // Density scales with area, capped — a 4K monitor should not get
            // ten times the particles a laptop does.
            const count = Math.min(42, Math.round((width * height) / 34000));
            motes = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 1.2 + Math.random() * 3.4,
                vx: 3 + Math.random() * 9, // px/s, drifting right through the beam
                vy: -(2 + Math.random() * 7),
                a: 0.12 + Math.random() * 0.26,
                phase: Math.random() * Math.PI * 2,
            }));
        };

        const resize = () => {
            const rect = root.getBoundingClientRect();
            // DPR is capped at 2: a 3x phone gains nothing visible from a
            // blurred dust field and pays 2.25x the fill rate for it.
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        };
        resize();

        const ro = new ResizeObserver(resize);
        ro.observe(root);

        // Pointer parallax is a fine-pointer affordance. On touch it would be
        // driven by a tap, which is not a light source moving — so: scroll only.
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

        const keyEl = keyRef.current;
        const fillEl = fillRef.current;
        const streakEl = streakRef.current;
        const contentEl = contentRef.current;

        const stop = runWhileVisible(root, (dt, t) => {
            // ── parallax ────────────────────────────────────────────────────
            // Damped follow: the lights lag the cursor, the way a practical
            // light on a boom lags the operator.
            const follow = 1 - Math.pow(0.0015, dt);
            px += (pointerX - px) * follow;
            py += (pointerY - py) * follow;

            // Scroll offset read once per frame — no scroll listener, so no
            // chance of a listener firing faster than we can paint.
            const rect = root.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));

            const { lightScale, streakScaleX } = enter.current;

            if (keyEl) {
                keyEl.style.transform =
                    `translate3d(${px * -34}px, ${py * -22 + progress * 60}px, 0) scale(${lightScale})`;
            }
            if (fillEl) {
                fillEl.style.transform =
                    `translate3d(${px * 22}px, ${py * 16 + progress * 34}px, 0) scale(${lightScale})`;
            }
            if (streakEl) {
                streakEl.style.transform =
                    `translate3d(0, ${py * -10 + progress * 90}px, 0) scaleX(${streakScaleX})`;
            }
            if (contentEl) {
                // The subject drifts up and dims as the frame leaves — a dolly
                // out, not a parallax slide.
                contentEl.style.transform = `translate3d(0, ${progress * -46}px, 0)`;
                contentEl.style.opacity = String(Math.max(0, 1 - progress * 1.5));
            }

            // ── dust ────────────────────────────────────────────────────────
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = appearance === 'light' ? 'source-over' : 'lighter';
            for (const m of motes) {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                // Wrap rather than respawn: a mote that pops into existence in
                // frame is the tell that this is a particle system.
                if (m.x - m.r > width) m.x = -m.r;
                if (m.y + m.r < 0) m.y = height + m.r;

                // Slow twinkle, plus the same pointer parallax at mote depth.
                const twinkle = 0.65 + 0.35 * Math.sin(t * 0.9 + m.phase);
                const size = m.r * 6;
                ctx.globalAlpha = m.a * twinkle * grade.dust;
                ctx.drawImage(
                    sprite,
                    m.x - size / 2 + px * m.r * 6,
                    m.y - size / 2 + py * m.r * 4,
                    size,
                    size,
                );
            }
            ctx.globalAlpha = 1;
        });

        return () => {
            stop();
            ro.disconnect();
            if (fine) {
                root.removeEventListener('pointermove', onPointerMove);
                root.removeEventListener('pointerleave', onPointerLeave);
            }
            ctx.clearRect(0, 0, width, height);
            for (const el of [keyEl, fillEl, streakEl, contentEl]) {
                if (el) el.style.transform = '';
            }
            if (contentEl) contentEl.style.opacity = '';
        };
    }, [appearance, fillRgb, grade.dust]);

    return (
        <Box
            component="section"
            ref={rootRef}
            // `hero-section` is the hook the print stylesheet already reaches for.
            className="hc hero-section"
            style={
                {
                    '--hc-key': keyRgb,
                    '--hc-fill': fillRgb,
                    '--hc-key-a': grade.key,
                    '--hc-fill-a': grade.fill,
                    '--hc-streak-a': grade.streak,
                    '--hc-grain-a': grade.grain,
                    '--hc-vignette-a': grade.vignette,
                    '--hc-contact-a': grade.contact,
                    '--hc-grain-src': GRAIN_SRC,
                    '--hc-hero-grad': heroGradient,
                } as React.CSSProperties
            }
            sx={{
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                // Full-bleed. The frame previously stopped 32px short of the
                // viewport on both sides and 32px below the header, so the key
                // light clipped against a straight vertical line and the whole
                // thing read as a hero *card* dropped into a dashboard. These
                // margins cancel `LayoutClient`'s content padding exactly; the
                // copy column below still aligns with the rest of the page.
                mx: { xs: -1.5, sm: -2, md: -4 },
                mt: { xs: -2, sm: -3, md: -4 },
                pt: { xs: 6, md: 10 },
                pb: { xs: 6, md: 8 },
            }}
        >
            {/* ── The lighting rig. Decorative in full: aria-hidden, no-print. ── */}
            <Box className="no-print" aria-hidden sx={{ position: 'absolute', inset: 0 }}>
                <div ref={keyRef} className="hc-layer hc-key" />
                <div ref={fillRef} className="hc-layer hc-fill" />
                <div className="hc-layer hc-contact" />
                <div ref={streakRef} className="hc-layer hc-streak" />
                <canvas ref={canvasRef} className="hc-canvas" />
                <div className="hc-layer hc-grain" />
                <div className="hc-layer hc-vignette" />
                <div className="hc-layer hc-fade-out" />
            </Box>

            {/* D5: aligns exactly with page.tsx's content container. */}
            <Box
                ref={contentRef}
                className="hc-content"
                // The padding restores the alignment the full-bleed section just
                // gave up, so the copy column still lines up with every section
                // below it: content pad + section pad = the old 2 / 3.
                sx={{
                    width: '100%',
                    maxWidth: 1000,
                    mx: 'auto',
                    px: { xs: 3.5, sm: 4, md: 7 },
                }}
            >
                <div data-hc-rise>
                    <OnDeviceBadge color={secondaryText} />
                </div>

                <Typography
                    variant="h1"
                    // The spans are decoration; the name is the accessible label.
                    aria-label={about?.title}
                    sx={{
                        fontFamily: 'var(--font-display), serif',
                        fontWeight: 400,
                        lineHeight: 1.05,
                        mb: 3,
                    }}
                >
                    <Box
                        component="span"
                        aria-hidden
                        // The gradient is painted per character (see the effect
                        // above) — an ancestor's `background-clip: text` does not
                        // clip to inline-block descendants.
                        className="hc-line hc-line--grad"
                        sx={{
                            fontSize: { xs: '3rem', sm: '4rem', md: '5.4rem' },
                            letterSpacing: '-0.025em',
                        }}
                    >
                        {chars(given, 'g')}
                    </Box>
                    <Box
                        component="span"
                        aria-hidden
                        className="hc-line"
                        sx={{
                            fontSize: { xs: '2.2rem', sm: '3rem', md: '4rem' },
                            color: 'text.primary',
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {chars(family, 'f')}
                    </Box>
                </Typography>

                {headline && (
                    <Typography
                        data-hc-rise
                        component="p"
                        sx={{
                            color: 'text.primary',
                            fontWeight: 500,
                            fontSize: { xs: '1.1rem', md: '1.35rem' },
                            mb: 1,
                        }}
                    >
                        {headline}
                    </Typography>
                )}

                {proof && (
                    <Typography
                        data-hc-rise
                        component="p"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '1rem',
                            maxWidth: '60ch',
                            mb: 2.5,
                        }}
                    >
                        {proof}
                    </Typography>
                )}

                <Box data-hc-rise sx={{ mb: 4, maxWidth: '60ch' }}>
                    <Typography
                        component="p"
                        id="hero-assistant-line"
                        sx={{ color: 'text.secondary', fontSize: '0.95rem', mb: 1 }}
                    >
                        {ASSISTANT_LINE}
                    </Typography>
                    <Button
                        className="no-print"
                        type="button"
                        onClick={openChat}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: '1.05rem' }} />}
                        aria-describedby="hero-assistant-line"
                        sx={{
                            minHeight: 44,
                            px: 2,
                            ml: -2,
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: primaryText,
                            borderRadius: RADIUS.pill,
                            textTransform: 'none',
                            transition: `background-color 150ms ${EASE_UI_CSS}`,
                        }}
                    >
                        Ask the assistant
                    </Button>
                </Box>

                {highlights.length > 0 && (
                    <Stack data-hc-rise direction="row" flexWrap="wrap" gap={1} sx={{ mb: 5 }}>
                        {highlights.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    borderRadius: RADIUS.chip,
                                    bgcolor: 'action.hover',
                                    color: 'text.primary',
                                }}
                            />
                        ))}
                    </Stack>
                )}

                <Stack
                    data-hc-rise
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
                            fontWeight: 600,
                            px: 4,
                            py: 1.5,
                            borderRadius: RADIUS.pill,
                            // The label sits on a `primary.main` FILL, so it takes
                            // `contrastText` — the channel the palette verified
                            // against that fill. Routing it through the tonal
                            // (text-on-ground) channel is what put lavender on
                            // lavender.
                            color: 'primary.contrastText',
                            // Fast down, slow up. That asymmetry is most of what
                            // "the button has feel" actually means.
                            transition: `transform 140ms ${EASE_UI_CSS}, box-shadow 140ms ${EASE_UI_CSS}, background-color 140ms ${EASE_UI_CSS}`,
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: `0 8px 22px -8px rgba(${keyRgb}, 0.55)`,
                            },
                            '&:active': {
                                transform: 'translateY(0) scale(0.985)',
                                transitionDuration: '60ms',
                            },
                            '@media (prefers-reduced-motion: reduce)': {
                                '&:hover, &:active': { transform: 'none' },
                            },
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
                            borderRadius: RADIUS.pill,
                            color: secondaryText,
                            borderColor: secondaryText,
                            transition: `transform 140ms ${EASE_UI_CSS}, background-color 140ms ${EASE_UI_CSS}, border-color 140ms ${EASE_UI_CSS}`,
                            '&:hover': {
                                borderColor: secondaryText,
                                transform: 'translateY(-1px)',
                            },
                            '&:active': {
                                transform: 'translateY(0) scale(0.985)',
                                transitionDuration: '60ms',
                            },
                            '@media (prefers-reduced-motion: reduce)': {
                                '&:hover, &:active': { transform: 'none' },
                            },
                        }}
                    >
                        See Projects
                    </Button>
                </Stack>

                {/*
                  The one piece of chrome that says the page continues. It was
                  centred on the SECTION, which is not the optical centre of
                  anything the reader is looking at, and it was half-swallowed
                  by the bottom fade — it read as a rendering artifact. In the
                  flow, at the copy column's left edge, it reads as deliberate,
                  and it now exists on mobile, where a scroll cue matters most.
                */}
                <Box
                    data-hc-rise
                    className="no-print"
                    aria-hidden
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: { xs: 5, md: 7 } }}
                >
                    <div className="hc-cue-track" />
                    <Typography
                        component="span"
                        sx={{
                            fontFamily: 'var(--font-mono), ui-monospace, monospace',
                            fontSize: '0.7rem',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: 'text.secondary',
                        }}
                    >
                        Scroll
                    </Typography>
                </Box>
            </Box>

        </Box>
    );
}
