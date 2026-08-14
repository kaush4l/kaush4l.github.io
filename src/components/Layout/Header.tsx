'use client';
import type { Ref } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Box,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';
import { ThemeVariantSwitcher, RADIUS } from '@/theme/ThemeProvider';
import AppearanceMenu from './AppearanceMenu';

/**
 * The résumé PDF lives in `public/`. Exported so the Footer links to the same
 * artifact rather than keeping a second copy of the path.
 */
export const RESUME_HREF = '/Kaushal-Resume.pdf';
export const RESUME_LABEL = 'Résumé (PDF)';

/** The palette/variant picker is a design tool, not a visitor feature (E7). */
const isDev = process.env.NODE_ENV === 'development';

interface HeaderProps {
    onMenuToggle: () => void;
    menuButtonRef?: Ref<HTMLButtonElement>;
}

export default function Header({ onMenuToggle, menuButtonRef }: HeaderProps) {
    const theme = useTheme();

    return (
        <AppBar
            position="fixed"
            elevation={0}
            // `coder-header` is the hook `coder.css` uses for the 1px lit hairline
            // (M13). It is a no-op in light and dark; the `borderBottom` below
            // remains the boundary in every mode, so deleting `coder.css` costs
            // decoration, never structure.
            className="no-print coder-header"
            sx={{
                zIndex: (t) => t.zIndex.drawer + 1,
                backgroundColor: alpha(theme.palette.background.default, 0.85),
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                color: 'text.primary',
            }}
        >
            <Toolbar>
                <IconButton
                    ref={menuButtonRef}
                    edge="start"
                    color="primary"
                    aria-label="toggle menu"
                    onClick={onMenuToggle}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                {/* D3: the logo must stay on one line at 320px so the Toolbar keeps
                    its 56px height — the `<Toolbar />` spacers and the section
                    `scroll-margin-top` are both computed against it. `noWrap` plus a
                    smaller face below `sm`, and the short form where 320px lives. */}
                <Link
                    href="/"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}
                >
                    <Typography
                        variant="h6"
                        noWrap
                        sx={{
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            lineHeight: 1.4,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        {/* The full name is already the hero's h1 and About's heading. */}
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Kaushal Kanakamedala
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                            Kaushal K
                        </Box>
                        <Box component="span" sx={{ color: 'primary.main' }}>.</Box>
                    </Typography>
                </Link>

                <Box sx={{ flexGrow: 1 }} />

                <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center' }}>
                    {/* Design-time only: shipping a palette picker dilutes the brand (E7/C6). */}
                    {isDev && (
                        <Box className="no-print" sx={{ display: 'flex', alignItems: 'center' }}>
                            <ThemeVariantSwitcher />
                        </Box>
                    )}

                    {/* M2/M6 — one trigger, three named peer states, current state
                        checked. Replaces the two-state moon/sun toggle, which both
                        lied about the resolved mode and had no room for a third. */}
                    <AppearanceMenu />

                    {/* The highest-value header slot: the recruiter's most common action. */}
                    <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<DownloadIcon />}
                        href={RESUME_HREF}
                        download
                        sx={{
                            display: { xs: 'none', sm: 'inline-flex' },
                            minHeight: 44,
                            px: 2,
                            borderRadius: RADIUS.pill,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {RESUME_LABEL}
                    </Button>
                    {/* E13: no Tooltip — MUI wires it as `aria-describedby`, so the
                        same words would be announced twice after the `aria-label`. */}
                    <IconButton
                        color="primary"
                        href={RESUME_HREF}
                        download
                        aria-label={`Download ${RESUME_LABEL}`}
                        sx={{ display: { xs: 'inline-flex', sm: 'none' }, minWidth: 44, minHeight: 44 }}
                    >
                        <DownloadIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}


