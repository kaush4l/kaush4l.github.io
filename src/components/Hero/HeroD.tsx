'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Button, Stack, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { RADIUS } from '@/theme/ThemeProvider';
import type { HeroProps } from './HeroA';

// ─── Canvas particle system ───────────────────────────────────────────────────

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    color: string;
}

// E6: 45 particles, neighbour scan capped at the next NEIGHBOUR_SPAN indices,
// devicePixelRatio-scaled backing store, rAF cancelled off-screen, and a single
// static frame under prefers-reduced-motion.
const PARTICLE_COUNT = 45;
const NEIGHBOUR_SPAN = 12;
const LINK_DISTANCE = 100;

function useParticleCanvas(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    palette: { particles: string[]; link: string },
) {
    const { particles: particleColors, link } = palette;

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let cssWidth = 0;
        let cssHeight = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            cssWidth = canvas.offsetWidth;
            cssHeight = canvas.offsetHeight;
            canvas.width = Math.round(cssWidth * dpr);
            canvas.height = Math.round(cssHeight * dpr);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        const particles: Particle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * cssWidth,
                y: Math.random() * cssHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                alpha: Math.random() * 0.6 + 0.2,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
            });
        }

        const paint = (advance: boolean) => {
            ctx.clearRect(0, 0, cssWidth, cssHeight);

            // Capped neighbour scan: O(n · NEIGHBOUR_SPAN) instead of O(n²).
            ctx.lineWidth = 0.7;
            for (let i = 0; i < particles.length; i++) {
                const limit = Math.min(i + 1 + NEIGHBOUR_SPAN, particles.length);
                for (let j = i + 1; j < limit; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINK_DISTANCE) {
                        ctx.beginPath();
                        ctx.globalAlpha = 1 - dist / LINK_DISTANCE;
                        ctx.strokeStyle = link;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            for (const p of particles) {
                ctx.beginPath();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();

                if (!advance) continue;
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = cssWidth;
                if (p.x > cssWidth) p.x = 0;
                if (p.y < 0) p.y = cssHeight;
                if (p.y > cssHeight) p.y = 0;
            }

            ctx.globalAlpha = 1;
        };

        // N1: continuous drifting motion is a vestibular trigger — one frame only.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            paint(false);
            return () => window.removeEventListener('resize', resize);
        }

        let animId: number | null = null;
        const draw = () => {
            paint(true);
            animId = requestAnimationFrame(draw);
        };
        const start = () => {
            if (animId === null) animId = requestAnimationFrame(draw);
        };
        const stop = () => {
            if (animId !== null) {
                cancelAnimationFrame(animId);
                animId = null;
            }
        };

        let observer: IntersectionObserver | null = null;
        if (container && typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver(
                ([entry]) => (entry.isIntersecting ? start() : stop()),
                { threshold: 0 },
            );
            observer.observe(container);
        } else {
            start();
        }

        return () => {
            stop();
            observer?.disconnect();
            window.removeEventListener('resize', resize);
        };
    }, [canvasRef, containerRef, particleColors, link]);
}

// ─── Component ────────────────────────────────────────────────────────────────


function scrollTo(id: string) {
    const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

export default function HeroD({ about }: HeroProps) {
    // F1: all three strings are authored in content/01-about/01-bio.md.
    const tags = (about?.highlights ?? []).filter((t) => t?.trim());
    const headline = about?.headline?.trim();
    const proof = about?.proof?.trim();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { primary, secondary, tonal } = theme.palette;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // M24 — the previous `isDark ?` branch handed the SAME FOUR COLOURS to both
    // modes, merely reordered, so the dark branch had no effect at all: a
    // speculative branch that never rendered and would not have worked if it had.
    // Particles and their link lines are decoration on the page ground, so each
    // mode gets the tonal channels that are actually visible against its own
    // ground — `…Light` on dark/coder, `…Dark` on light. `primary.main` link
    // lines at 0.12 over #12151C were effectively invisible.
    const particlePalette = useMemo(
        () => ({
            // `tonal` is the one owner of "which channel opposes this ground";
            // the two `main` fills read the same in both modes and stay put.
            particles: [primary[tonal], secondary[tonal], primary.main, secondary.main],
            // The alpha still branches on mode — a link line needs more presence
            // on a dark ground — but that is a density decision, not a hue one.
            link: alpha(primary[tonal], isDark ? 0.14 : 0.1),
        }),
        // The whole `primary`/`secondary` objects, not individual channels:
        // indexing by `tonal` reads the object, so listing channels would leave
        // the memo stale on a hue change. Both are stable per theme instance.
        [isDark, tonal, primary, secondary],
    );

    useParticleCanvas(canvasRef, containerRef, particlePalette);

    return (
        <Box
            component="section"
            ref={containerRef}
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {/* Full-bleed particle canvas */}
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                style={{ position: 'relative', zIndex: 2, width: '100%' }}
            >
                <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
                    <Box
                        sx={{
                            textAlign: 'center',
                            maxWidth: 640,
                            mx: 'auto',
                            px: { xs: 3, md: 6 },
                            py: { xs: 4, md: 6 },
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(20px)',
                            borderRadius: RADIUS.floating,
                            border: '1px solid',
                            // M24 — was `alpha(primary.main, isDark ? 0.2 : 0.12)`.
                            // `divider` is the mode-owned, hue-resolved equivalent.
                            borderColor: 'divider',
                        }}
                    >
                        {/* Avatar placeholder */}
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: RADIUS.pill,
                                background: `linear-gradient(135deg, ${primary.main}, ${secondary.main})`,
                                mx: 'auto',
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 36,
                            }}
                        >
                            👨‍💻
                        </Box>

                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 600,
                                mb: 0.75,
                                background: `linear-gradient(135deg, ${primary.main}, ${secondary.main})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Kaushal Kanakamedala
                        </Typography>

                        {headline && (
                            <Typography
                                variant="h6"
                                color="text.primary"
                                sx={{ fontWeight: 500, mb: 0.5, fontSize: '1rem' }}
                            >
                                {headline}
                            </Typography>
                        )}
                        {proof && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {proof}
                            </Typography>
                        )}

                        {tags.length > 0 && (
                        <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={1} sx={{ mb: 3.5 }}>
                            {tags.map((tag) => (
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

                        <Stack direction="row" justifyContent="center" spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => scrollTo('experience')}
                                sx={{ fontWeight: 600, borderRadius: RADIUS.pill }}
                            >
                                Explore Resume
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                size="large"
                                href="mailto:kaush4lk@gmail.com"
                                sx={{ fontWeight: 500, borderRadius: RADIUS.pill }}
                            >
                                Contact Me
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
}
