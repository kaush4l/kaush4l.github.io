'use client';

// SkinMenu — the visitor-facing perspective control.
//
// This is deliberately a SECOND menu rather than more rows in the appearance
// menu, because it answers a different question. Appearance asks "how bright
// should this page be"; skin asks "whose story is this résumé told as". Folding
// a narrative choice into a brightness control would teach the visitor that the
// two are the same kind of thing, and the first person to pick a black,
// pinned-appearance skin from a menu titled "Appearance" would reasonably read
// the greyed-out light row as a bug.
//
// Like AppearanceMenu: one trigger, named rows, all visible before commitment,
// direct selection from any state to any state, and the trigger renders from
// the RESOLVED skin the provider reports.

import { useState } from 'react';
import { Box, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeContext, RADIUS } from '@/theme/ThemeProvider';
import { SKIN_LIST } from '@/skins/registry';

export default function SkinMenu() {
    const { skin, setSkin } = useThemeContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Perspective">
                <IconButton
                    className="no-print"
                    color="primary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    aria-label="Perspective"
                    aria-haspopup="menu"
                    aria-expanded={open ? 'true' : undefined}
                    sx={{ width: 44, height: 44 }}
                >
                    <AutoAwesomeIcon />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: { sx: { mt: 1, minWidth: 300, borderRadius: RADIUS.floating, p: 0.5 } },
                    list: { 'aria-label': 'Perspective', dense: false },
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
                    Perspective
                </Typography>

                {SKIN_LIST.map((s) => {
                    const isActive = s.id === skin;
                    return (
                        <MenuItem
                            key={s.id}
                            role="menuitemradio"
                            aria-checked={isActive}
                            selected={isActive}
                            onClick={() => {
                                setSkin(s.id);
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
                            {/* The row previews itself. A named perspective the
                                visitor has never seen is a promise with no evidence;
                                two of its own colours is the cheapest honest evidence
                                a menu row can carry. */}
                            <Box
                                aria-hidden
                                sx={{
                                    width: 22,
                                    height: 22,
                                    flexShrink: 0,
                                    mt: 0.25,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${s.swatch[0]} 0%, ${s.swatch[1]} 100%)`,
                                    boxShadow: 'inset 0 0 0 1px rgba(127,127,127,0.35)',
                                }}
                            />
                            <ListItemText
                                primary={s.label}
                                secondary={s.hint}
                                slotProps={{
                                    primary: { fontSize: '0.9rem' },
                                    secondary: { fontSize: '0.75rem', sx: { whiteSpace: 'normal' } },
                                }}
                            />
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
