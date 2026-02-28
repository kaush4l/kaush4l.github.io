'use client';

import { useEffect, useRef } from 'react';
import { Box, Typography, Button, Stack, Chip, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { COLORS } from '@/theme/theme';

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

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, isDark: boolean) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const PARTICLE_COLORS = isDark
            ? [COLORS.purple[600], COLORS.cyan[500], COLORS.purple[400], COLORS.cyan[400]]
            : [COLORS.purple[300], COLORS.cyan[300], COLORS.purple[400], COLORS.cyan[500]];

        const particles: Particle[] = [];
        let animId: number;

        const resize = () => {
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Spawn initial particles
        for (let i = 0; i < 80; i++) {
            particles.push({
                x:      Math.random() * canvas.width,
                y:      Math.random() * canvas.height,
                vx:     (Math.random() - 0.5) * 0.5,
                vy:     (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                alpha:  Math.random() * 0.6 + 0.2,
                color:  PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connection lines between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = isDark
                            ? `rgba(124,58,237,${0.12 * (1 - dist / 100)})`
                            : `rgba(124,58,237,${0.08 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.7;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw and move particles
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            }

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [canvasRef, isDark]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeroD() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useParticleCanvas(canvasRef, isDark);

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {/* Particle canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />

            {/* Central card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ position: 'relative', zIndex: 2 }}
            >
                <Box
                    sx={{
                        textAlign: 'center',
                        maxWidth: 640,
                        mx: 'auto',
                        px: { xs: 3, md: 6 },
                        py: { xs: 4, md: 6 },
                        bgcolor: isDark
                            ? 'rgba(15,15,20,0.75)'
                            : 'rgba(255,255,255,0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 6,
                        border: `1px solid ${isDark ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.12)'}`,
                        boxShadow: isDark
                            ? '0 32px 64px rgba(0,0,0,0.5)'
                            : '0 32px 64px rgba(124,58,237,0.1)',
                    }}
                >
                    {/* Avatar placeholder */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${COLORS.purple[600]}, ${COLORS.cyan[500]})`,
                            mx: 'auto',
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 36,
                            boxShadow: `0 0 30px ${COLORS.purple[600]}55`,
                        }}
                    >
                        👨‍💻
                    </Box>

                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 900,
                            mb: 0.75,
                            background: `linear-gradient(135deg, ${COLORS.purple[600]}, ${COLORS.cyan[500]})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Kaushal Kanakamedala
                    </Typography>

                    <Typography
                        variant="h6"
                        color="text.secondary"
                        sx={{ fontWeight: 400, mb: 0.5, fontSize: '1rem' }}
                    >
                        Senior Software Engineer
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3, opacity: 0.7 }}
                    >
                        Durham, NC · 8+ years building production systems
                    </Typography>

                    <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={1} sx={{ mb: 3.5 }}>
                        {['WebGPU', 'On-Device AI', 'Spring Boot', 'Angular', 'React'].map((tag, i) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{
                                    fontSize: '0.75rem',
                                    borderColor: i % 2 === 0 ? 'rgba(124,58,237,0.4)' : 'rgba(6,182,212,0.4)',
                                    color: i % 2 === 0 ? 'primary.main' : 'secondary.main',
                                }}
                            />
                        ))}
                    </Stack>

                    <Stack direction="row" justifyContent="center" spacing={2}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Explore Resume
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            size="large"
                            href="mailto:kaush4lk@gmail.com"
                        >
                            Contact Me
                        </Button>
                    </Stack>
                </Box>
            </motion.div>
        </Box>
    );
}
