'use client';

// AppearanceMenu — the single visitor-facing appearance control (M2/M3/M6).
//
// Why a labelled menu and not a cycling icon:
// The moon/sun glyph carries an almost universal *two-state* prior. A user who
// clicks it predicts "the page inverts, and clicking again undoes it". Make it
// cycle three ways and the first click delivers dark as predicted — then the
// second click, which the user has just learned means "undo", delivers coder.
// Reversal then costs two more clicks against a ring whose size the user has no
// model of, and discoverability of a third state hidden behind a two-state glyph
// is effectively zero: nobody keeps clicking a toggle they believe they have
// already returned to rest. One trigger, three named rows, all visible before
// commitment, direct selection from any state to any state.
//
// The trigger icon renders from the **resolved** appearance the provider
// reports, never from a requested value (M6): a control whose glyph contradicts
// the painted page is the fastest way to teach a visitor that this page's
// controls are unreliable — after which they stop touching the chat FAB too.

import { useState } from 'react';
import {
    Box,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TerminalIcon from '@mui/icons-material/Terminal';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeContext, APPEARANCES, RADIUS } from '@/theme/ThemeProvider';
import type { Appearance } from '@/theme/ThemeProvider';

/** One glyph per appearance. Keyed by value so a fourth mode cannot go unmapped. */
const ICONS: Record<Appearance, typeof LightModeIcon> = {
    light: LightModeIcon,
    dark: DarkModeIcon,
    coder: TerminalIcon,
};

export default function AppearanceMenu() {
    const { appearance, setAppearance } = useThemeContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    // Resolved, not requested — see the header comment.
    const TriggerIcon = ICONS[appearance] ?? LightModeIcon;

    return (
        <>
            {/* The tooltip names the control, the `aria-label` names it for AT.
                They say the same word deliberately: unlike E13's download button
                this label is not repeated by a visible text sibling. */}
            <Tooltip title="Appearance">
                <IconButton
                    className="no-print"
                    color="primary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    aria-label="Appearance"
                    aria-haspopup="menu"
                    aria-expanded={open ? 'true' : undefined}
                    sx={{ width: 44, height: 44 }}
                >
                    <TriggerIcon />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                // Matches ThemeVariantSwitcher's shell so the header reads as one
                // system rather than two unrelated pickers.
                slotProps={{
                    paper: { sx: { mt: 1, minWidth: 268, borderRadius: RADIUS.floating, p: 0.5 } },
                    list: { 'aria-label': 'Appearance', dense: false },
                }}
            >
                <Typography
                    variant="overline"
                    sx={{
                        display: 'block',
                        px: 1.5,
                        py: 0.5,
                        fontWeight: 600,
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                    }}
                >
                    Appearance
                </Typography>

                {APPEARANCES.map(({ value, label, hint }) => {
                    const isActive = value === appearance;
                    const Icon = ICONS[value] ?? LightModeIcon;
                    return (
                        <MenuItem
                            key={value}
                            // Three peers, one chosen — a radio group, not a list of
                            // commands. `aria-checked` is the state; `selected` is
                            // only the visual echo of it.
                            role="menuitemradio"
                            aria-checked={isActive}
                            selected={isActive}
                            onClick={() => {
                                setAppearance(value);
                                setAnchorEl(null);
                            }}
                            sx={{
                                borderRadius: RADIUS.chip,
                                gap: 1.5,
                                mx: 0.5,
                                my: 0.25,
                                minHeight: 44,
                                alignItems: 'flex-start',
                                py: 1,
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mt: 0.25, color: 'primary.main' }}>
                                <Icon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary={label}
                                secondary={hint}
                                slotProps={{
                                    primary: { fontSize: '0.9rem' },
                                    secondary: {
                                        fontSize: '0.75rem',
                                        sx: { whiteSpace: 'normal' },
                                    },
                                }}
                            />
                            {/* The checkmark is the receipt for the click (M9); the
                                row is already `aria-checked`, so it is hidden from AT
                                rather than announced a second time. */}
                            <Box sx={{ width: 18, flexShrink: 0, mt: 0.25 }}>
                                {isActive && (
                                    <CheckIcon aria-hidden sx={{ fontSize: 18, color: 'primary.main' }} />
                                )}
                            </Box>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
