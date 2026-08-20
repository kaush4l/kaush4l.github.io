'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RADIUS } from '@/theme/ThemeProvider';
import { prefersReducedMotion } from '@/lib/motion';
import { openChat } from '@/lib/chatBridge';
import OnDeviceBadge from '@/components/Hero/OnDeviceBadge';
import type { HeroAbout, HeroProps } from '@/components/Hero';

/**
 * The sanctum's fold.
 *
 * ── What it is ──────────────────────────────────────────────────────────────
 * A dark hall, a torana (the gateway arch of a temple, and the oldest
 * "storytelling portal" there is), one lamp on the axis, and a name lit by it.
 * Everything is symmetrical about a single vertical line and nothing is
 * centred-for-the-sake-of-it: the arch, the flame and the wordmark share one
 * axis because a shrine does, and the page returns to the résumé's left column
 * the moment you scroll past it.
 *
 * ── The motion contract ─────────────────────────────────────────────────────
 * There is NO requestAnimationFrame loop, no canvas, and no animation library
 * in this hero. The entire entrance is CSS keyframes with `animation-fill-mode:
 * both`, gated behind one class this component adds after mount. That is worth
 * stating plainly, because the alternative — the shipped cinematic hero's
 * single rAF loop driving dust and parallax — is a better fit for a lit frame
 * than for an unlit one. A sanctum where the air is visibly moving is not a
 * sanctum. So the cost of this fold at rest, after ~1.6s, is zero frames
 * forever.
 *
 * ── The no-flash handoff ────────────────────────────────────────────────────
 * `html[data-motion="on"]` is stamped by the blocking script in `layout.tsx`
 * before first paint, and `cinema.css` uses it to hide `.hc-char` and
 * `[data-hc-rise]`. Hydration lands well after that paint, so any "pre-paint"
 * hidden state applied from JS is nothing of the sort. The handoff here is:
 *
 *   1. add `is-lit`, which starts every keyframe animation. Each one is
 *      `fill-mode: both`, so during its delay it HOLDS its own from-state —
 *      i.e. the CSS animation is already owning the hidden state before the
 *      attribute comes off;
 *   2. then delete the attribute.
 *
 * Both happen synchronously in one layout effect, so there is no frame in which
 * neither owns it. Under reduced motion step 1 is skipped and step 2 still
 * runs, which reveals a complete, still, readable fold immediately.
 */

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Chrome copy about the page itself — deliberately not a résumé claim. */
const ASSISTANT_LINE =
    'Ask this résumé anything. The model answering runs in this tab, on your own GPU — no server, no key, nothing to trust me about.';

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

function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * Every element that rises carries its own delay as a custom property rather
 * than relying on source order, because the order the eye should receive them
 * in is not the order the DOM needs them in. Total settle ≈ 1.6s.
 */
function rise(delayMs: number): React.CSSProperties {
    return { '--sx-d': `${delayMs}ms` } as React.CSSProperties;
}

export default function SanctumHero({ about }: HeroProps) {
    const rootRef = useRef<HTMLElement | null>(null);
    const [lit, setLit] = useState(false);

    // Hydration rule: never read the DOM or a media query in a `useState`
    // initializer. The badge's accent is derived, not stored, so the only
    // adopted state here is `lit`, and it is adopted in an effect.
    useIsoLayoutEffect(() => {
        const html = document.documentElement;
        const root = rootRef.current;

        if (root && !prefersReducedMotion()) {
            // The class is added to the NODE first and to React's state second,
            // and that order is the whole no-flash guarantee. `setLit` does not
            // land until the next commit, so deleting `data-motion` after it
            // would leave one painted frame in which neither the attribute nor
            // the animations own the hidden state — the fold would flash
            // finished and then start over. `classList.add` applies now.
            // The state assignment exists only so a later re-render (a theme
            // change, say) re-emits the class instead of stripping it and
            // replaying the entrance.
            root.classList.add('is-lit');
            setLit(true);
        }

        // Whether or not the timeline runs, the pre-paint hide must come off in
        // the same commit — otherwise a bundle that got this far and then threw
        // would leave the fold blank for the script's full 4s grace period.
        delete html.dataset.motion;
    }, []);

    const [given, family] = splitName(about?.title);
    const a = about as HeroAbout | undefined;
    const headline = text(a?.headline);
    const proof = text(a?.proof);
    const highlights = (a?.highlights ?? []).map(text).filter((t): t is string => Boolean(t));

    return (
        <Box
            component="section"
            ref={rootRef}
            // `hero-section` is the hook the print stylesheet already reaches for.
            className={`hc hero-section sx-hero${lit ? ' is-lit' : ''}`}
            sx={{
                minHeight: { xs: '78vh', md: '88vh' },
                display: 'flex',
                alignItems: 'center',
                // Full bleed. These margins cancel `LayoutClient`'s content
                // padding exactly, so the hall has no edges.
                mx: { xs: -1.5, sm: -2, md: -4 },
                mt: { xs: -2, sm: -3, md: -4 },
                pt: { xs: 7, md: 11 },
                pb: { xs: 7, md: 9 },
            }}
        >
            {/* ── The hall. Decoration in full: aria-hidden, no-print. ───────── */}
            <Box className="no-print" aria-hidden sx={{ position: 'absolute', inset: 0 }}>
                <div className="sx-hero-aperture" />
                <div className="sx-hero-floor" />
                <div className="sx-hero-vignette" />
                <div className="sx-hero-fade" />
            </Box>

            <Box
                className="hc-content sx-hero-content"
                sx={{
                    width: '100%',
                    maxWidth: 1000,
                    mx: 'auto',
                    px: { xs: 3.5, sm: 4, md: 7 },
                    textAlign: 'center',
                }}
            >
                {/*
                  The torana. One gold hairline, drawn once, left standing. It is
                  the only piece of temple geometry in the fold, and it is LINE
                  — a filled or gradient arch is the exact moment this direction
                  turns into a festival poster.
                */}
                <Box className="no-print sx-torana-wrap" aria-hidden>
                    {/*
                      Geometry note: the two arcs are DEPRESSED, not semicircular.
                      A semicircle on a 540 chord needs r = 270 and puts its apex
                      260px above the springing line — outside any viewBox that
                      still frames the springing — so the arch silently drew off
                      the top of its own box. r = 287 / 258 keeps both apexes
                      inside, and a shallow arch is the correct form anyway: a
                      chaitya gateway is wide and low, not a Roman half-round.
                    */}
                    <svg
                        className="sx-torana"
                        viewBox="0 0 600 210"
                        fill="none"
                        aria-hidden
                        focusable="false"
                    >
                        <path
                            className="sx-torana-outer"
                            d="M30 200 A 287 287 0 0 1 570 200"
                            pathLength="1"
                        />
                        <path
                            className="sx-torana-inner"
                            d="M58 200 A 258 258 0 0 1 542 200"
                            pathLength="1"
                        />
                        {/* The finial: a lotus bud on the axis, stroked. */}
                        <path
                            className="sx-torana-finial"
                            d="M300 40 C292 54 292 64 300 72 C308 64 308 54 300 40 Z"
                            pathLength="1"
                        />
                        <path className="sx-torana-sill" d="M14 200 L586 200" pathLength="1" />
                    </svg>

                    {/*
                      The diya. The lamp is drawn as line (gold); the FLAME is
                      the only lit fill in the fold (saffron), because the flame
                      is not an object — it is the light source the whole page
                      is graded from.
                    */}
                    <span className="sx-lamp">
                        <span className="sx-lamp-flame" />
                        <svg
                            className="sx-lamp-body"
                            viewBox="0 0 64 40"
                            fill="none"
                            aria-hidden
                            focusable="false"
                        >
                            <path d="M8 18 H56" pathLength="1" />
                            <path d="M11 18 C15 34 49 34 53 18" pathLength="1" />
                            <path d="M32 18 V8" pathLength="1" />
                        </svg>
                    </span>
                </Box>

                <div data-hc-rise style={rise(700)} className="sx-badge-row">
                    <OnDeviceBadge color="#FFC46B" />
                </div>

                <Typography
                    variant="h1"
                    // The spans are decoration; the name is the accessible label.
                    aria-label={about?.title}
                    sx={{
                        fontFamily: 'var(--font-display), Georgia, serif',
                        fontWeight: 400,
                        lineHeight: 1.02,
                        mb: { xs: 2.5, md: 3 },
                    }}
                >
                    <Box
                        component="span"
                        aria-hidden
                        className="hc-line sx-line sx-line--given"
                        sx={{
                            fontSize: { xs: '2.9rem', sm: '4rem', md: '5.2rem' },
                            letterSpacing: '-0.02em',
                        }}
                    >
                        <span className="hc-char">{given}</span>
                    </Box>
                    <Box
                        component="span"
                        aria-hidden
                        className="hc-line sx-line sx-line--family"
                        sx={{
                            fontSize: { xs: '2rem', sm: '2.8rem', md: '3.6rem' },
                            lineHeight: 1.08,
                            letterSpacing: '0.01em',
                        }}
                    >
                        <span className="hc-char">{family}</span>
                    </Box>
                </Typography>

                {headline && (
                    <Typography
                        data-hc-rise
                        style={rise(820)}
                        component="p"
                        className="sx-headline"
                        sx={{
                            color: 'text.primary',
                            fontSize: { xs: '1.05rem', md: '1.2rem' },
                            mx: 'auto',
                            mb: 1.25,
                        }}
                    >
                        {headline}
                    </Typography>
                )}

                {proof && (
                    <Typography
                        data-hc-rise
                        style={rise(880)}
                        component="p"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '0.98rem',
                            maxWidth: '62ch',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        {proof}
                    </Typography>
                )}

                {highlights.length > 0 && (
                    <Stack
                        data-hc-rise
                        style={rise(940)}
                        direction="row"
                        flexWrap="wrap"
                        gap={1}
                        justifyContent="center"
                        sx={{ mb: 4, maxWidth: '58ch', mx: 'auto' }}
                    >
                        {highlights.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                className="sx-chip"
                                sx={{ borderRadius: RADIUS.chip }}
                            />
                        ))}
                    </Stack>
                )}

                <Box
                    data-hc-rise
                    style={rise(1000)}
                    sx={{ mb: 4, maxWidth: '58ch', mx: 'auto' }}
                >
                    <Typography
                        component="p"
                        id="hero-assistant-line"
                        sx={{ color: 'text.secondary', fontSize: '0.92rem', mb: 1 }}
                    >
                        {ASSISTANT_LINE}
                    </Typography>
                    <Button
                        className="no-print sx-quiet-btn"
                        type="button"
                        onClick={openChat}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: '1.05rem' }} />}
                        aria-describedby="hero-assistant-line"
                        sx={{
                            minHeight: 44,
                            px: 2,
                            borderRadius: RADIUS.pill,
                            textTransform: 'none',
                            fontSize: '0.92rem',
                        }}
                    >
                        Ask the assistant
                    </Button>
                </Box>

                <Stack
                    data-hc-rise
                    style={rise(1060)}
                    className="no-print"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="center"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => scrollTo('experience')}
                        className="sx-cta"
                        sx={{ px: 4, py: 1.5, borderRadius: RADIUS.pill, textTransform: 'none' }}
                    >
                        View Experience
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={() => scrollTo('projects')}
                        className="sx-cta sx-cta--line"
                        sx={{ px: 4, py: 1.5, borderRadius: RADIUS.pill, textTransform: 'none' }}
                    >
                        See Projects
                    </Button>
                </Stack>

                <Box
                    data-hc-rise
                    style={rise(1140)}
                    className="no-print sx-cue"
                    aria-hidden
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.25,
                        mt: { xs: 5, md: 7 },
                    }}
                >
                    <div className="hc-cue-track" />
                    <Typography component="span" className="sx-label">
                        Scroll
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
