'use client';

import { Box, Typography, Button, Stack, Chip, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RADIUS } from '@/theme/ThemeProvider';
import type { ContentItem } from '@/lib/contentTypes';

/**
 * F1: every résumé string in this hero is authored in
 * `content/01-about/01-bio.md` (`headline`, `proof`, `highlights`) and threaded
 * in from `page.tsx`. There is no fallback copy — a field the content does not
 * declare renders no element at all, rather than an empty line at the fold.
 */
export interface HeroProps {
    about?: HeroAbout;
}

/**
 * `ContentItem` is owned by the content layer; the hero only needs three of its
 * fields. Intersecting keeps this file compiling whether or not the shared type
 * has been widened yet, and never contradicts it.
 */
export type HeroAbout = ContentItem & {
    headline?: string;
    proof?: string;
    highlights?: string[];
};

/** Blank/whitespace-only frontmatter is treated as absent, not as an empty line. */
function text(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/**
 * B1: the fold promises on-device AI, so the fold has to say what that means
 * and hand the reader the control. This is chrome copy about the page itself,
 * not a résumé claim, so it lives here rather than in `content/`.
 */
const ASSISTANT_LINE =
    'The assistant in the corner answers questions about this résumé on your own GPU — the model runs in this tab, with no server.';

// E2/N1: the orbs stay, the infinite `float` keyframes are gone.
const ORBS = [
    { size: 320, top: '-6%', right: '-5%', tone: 'primaryDark' as const },
    { size: 200, bottom: '5%', left: '-3%', tone: 'secondary' as const },
    { size: 150, top: '40%', right: '8%', tone: 'primaryLight' as const },
];

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/** B1 cross-component contract: the chat widget listens for this on `window`. */
export const OPEN_CHAT_EVENT = 'kk:open-chat';

function scrollTo(id: string) {
    const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

function openChat() {
    window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}

export default function HeroA({ about }: HeroProps) {
    const theme = useTheme();
    const { primary, secondary } = theme.palette;
    const isDark = theme.palette.mode === 'dark';

    // A1: `secondary.main` is a FILL color (2.35:1 as text on the light bg).
    // The palette documents `dark` as the light-mode text channel and `light`
    // as the dark-mode one; every secondary *text/icon* use resolves here.
    const secondaryText = secondary[theme.palette.tonal];
    // M24 — this was `isDark ? primary.light : primary.main`, i.e. the FILL
    // channel on the light ground. That gave the "Ask the assistant" label a
    // different primary from every other text accent on the page (globals.css
    // resolves `--link` to `primaryDark` in light), and on hues b/d it measured
    // 2.06:1 / 3.79:1 on #FAFAFA. `dark` is the documented light-ground text
    // channel: 8.61 / 4.81 / 6.69 / 6.69:1 across a–d.
    const primaryText = primary[theme.palette.tonal];

    // F1: no fallback copy. A field the content does not declare renders
    // nothing — never an empty <p> or a zero-height chip row at the fold.
    const headline = text(about?.headline);
    const proof = text(about?.proof);
    const highlights = (about?.highlights ?? []).map(text).filter((t): t is string => Boolean(t));

    const orbColor = (tone: (typeof ORBS)[number]['tone']) =>
        tone === 'secondary' ? secondary.main : tone === 'primaryLight' ? primary.light : primary.dark;

    return (
        <Box
            component="section"
            // E3: a stable hook the print stylesheet can reach — the `minHeight`
            // below is inline, so a bare `section` rule cannot override it.
            className="hero-section"
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                pt: { xs: 4, md: 6 },
                pb: { xs: 6, md: 8 },
            }}
        >
            {/* Full-bleed decoration layer — escapes the aligned content column. */}
            <Box
                className="no-print"
                sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
            >
                {ORBS.map((orb, i) => (
                    <Box
                        key={i}
                        sx={{
                            position: 'absolute',
                            width: orb.size,
                            height: orb.size,
                            borderRadius: RADIUS.pill,
                            bgcolor: orbColor(orb.tone),
                            opacity: 0.12,
                            filter: 'blur(60px)',
                            top: orb.top,
                            right: orb.right,
                            bottom: orb.bottom,
                            left: orb.left,
                        }}
                    />
                ))}
            </Box>

            {/* D5: aligns exactly with page.tsx's content container. */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    maxWidth: 1000,
                    mx: 'auto',
                    px: { xs: 2, md: 3 },
                }}
            >
                {/*
                  B5: the "Available for opportunities" chip is gone. The claim was
                  made twice; the version that actually filters ("Open to senior
                  full-stack and applied-AI roles. Durham, NC / remote.") is
                  authored in `content/06-contact/_section.md` and rendered by the
                  footer. Deleting the vague copy also removed A1's 2.35:1 chip.
                */}

                {/* E2: the single entrance animation on the site's one memorable element. */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            // The one and only use of the display face on the site.
                            fontFamily: 'var(--font-display), serif',
                            fontWeight: 400,
                            lineHeight: 1.05,
                            mb: 3,
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                display: 'block',
                                fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                                background: `linear-gradient(135deg, ${primary.main} 0%, ${secondary.main} 100%)`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Kaushal
                        </Box>
                        <Box
                            component="span"
                            sx={{
                                display: 'block',
                                fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
                                color: 'text.primary',
                                lineHeight: 1.1,
                            }}
                        >
                            Kanakamedala
                        </Box>
                    </Typography>
                </motion.div>

                {/* E3/F1: proof stack, authored in content — no entrance animation */}
                {headline && (
                    <Typography
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
                        component="p"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '1rem',
                            fontWeight: 400,
                            maxWidth: '60ch',
                            mb: 2.5,
                        }}
                    >
                        {proof}
                    </Typography>
                )}

                {/* B1: the hero's on-device promise, paid off at the fold. */}
                <Box sx={{ mb: 4, maxWidth: '60ch' }}>
                    <Typography
                        component="p"
                        id="hero-assistant-line"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '0.95rem',
                            fontWeight: 400,
                            mb: 1,
                        }}
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
                            transition: `background-color 150ms ${EASE}`,
                        }}
                    >
                        Ask the assistant
                    </Button>
                </Box>

                {/* J1: one neutral chip treatment — colour is not spent on array parity.
                    An empty/absent `highlights` renders no row at all, not a 40px gap. */}
                {highlights.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 5 }}>
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

                {/* E3: buttons print as pills with the href appended — hide them. */}
                <Stack
                    className="no-print"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
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
                            transition: `background-color 150ms ${EASE}, box-shadow 150ms ${EASE}`,
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
                            // A1: same defect as the deleted chip — the outlined
                            // secondary label resolved to `secondary.main`.
                            color: secondaryText,
                            borderColor: secondaryText,
                            '&:hover': { borderColor: secondaryText },
                            transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
                        }}
                    >
                        See Projects
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}
