'use client';

/**
 * The door. Every world renders it, no world may restyle it away, and it is the
 * first thing a keyboard reaches.
 *
 * A visitor who follows a forwarded `/experience/<id>/` link arrives inside a
 * world they did not choose, on a route with no header, no sidebar and no
 * résumé in sight (§C.4 — a 260px drawer of section links beside a cinematic
 * telling is the single fastest way to make this feature read as a toy). The
 * cost of that decision is that the ONLY way back has to be supplied by the
 * frame, and it has to be unmissable. So:
 *
 *   • It is rendered by `ExperienceFrame`, not by a world, and it is rendered
 *     OUTSIDE the Stage subtree — a Stage whose motion timeline throws still
 *     leaves the door standing.
 *   • It is FIRST in DOM order inside the frame, so a reader who lands in an
 *     unfamiliar world and presses Tab once gets the exit rather than whatever
 *     the world happened to put first. This is the whole reason the frame's
 *     child order is not negotiable.
 *   • Both destinations, always: back to the résumé, and back to the other
 *     worlds. A single "back" is ambiguous the moment there are two things to
 *     go back to, and the browser's own Back button is not an answer for a
 *     forwarded link — there is nothing behind it.
 *
 * ── Why it is coloured from `--xp-*` and not from the MUI palette ────────────
 * A world owns the ground. `--xp-surface` / `--xp-text` / `--xp-border` are
 * whatever that world set them to, so the door is legible in every world BY
 * CONSTRUCTION rather than because each world remembered to check it. The
 * fallbacks in the `var()` calls are the token defaults' own sources, so the
 * door is still correct in the one frame before `applyExperienceTokens` runs.
 */

import Link from 'next/link';
import { Box, Button } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { RADIUS } from '@/theme/ThemeProvider';
import { EXPERIENCE_NAV } from './registry';

/**
 * The résumé destination, stated once.
 *
 * `EXPERIENCE_NAV` owns the copy for the dashboard link (M3 — one table, never
 * re-declared at a call site). The résumé link has no such table because `/` is
 * not this feature's surface; its one label lives here, which is still exactly
 * one place, and the pair is kept adjacent so nobody has to look in two files to
 * read the door's two words.
 */
const RESUME_HREF = '/';
const RESUME_LABEL = 'Read the résumé';

interface ExperienceExitProps {
    /**
     * The dashboard link is omitted on the dashboard itself — a link to the page
     * you are standing on is noise, and for a screen-reader user it is worse
     * than noise. Defaults to shown, because the stage routes are the case this
     * component exists for.
     */
    showDashboard?: boolean;
}

/** The shared button shape. One declaration, so the two doors cannot drift. */
const doorSx = {
    minHeight: 44,
    px: 1.75,
    borderRadius: RADIUS.pill,
    // 4.5:1 is the body-text bar and this is body text, so it takes the world's
    // full-strength text colour rather than the muted one.
    color: 'var(--xp-text, var(--text))',
    backgroundColor: 'var(--xp-surface, var(--surface))',
    border: '1px solid var(--xp-border, var(--border))',
    textTransform: 'none',
    fontWeight: 500,
    // The label is prose, not chrome, so it is set in the world's body voice —
    // the same face the beats are read in.
    fontFamily: 'var(--xp-font-body)',
    whiteSpace: 'nowrap',
    '&:hover': {
        backgroundColor: 'var(--xp-surface, var(--surface))',
        borderColor: 'var(--xp-accent, var(--primary))',
    },
} as const;

export default function ExperienceExit({ showDashboard = true }: ExperienceExitProps) {
    return (
        <Box
            component="nav"
            className="no-print"
            aria-label="Leave this experience"
            sx={{
                position: 'fixed',
                // `max()` against the safe-area inset rather than a flat 16px:
                // on a notched phone in landscape the flat value puts the door
                // under the sensor housing, where it is reachable by keyboard
                // and unreachable by thumb.
                top: 'max(12px, env(safe-area-inset-top))',
                left: 'max(12px, env(safe-area-inset-left))',
                zIndex: (theme) => theme.zIndex.appBar,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
            }}
        >
            <Button
                component={Link}
                href={RESUME_HREF}
                startIcon={<ArticleOutlinedIcon />}
                sx={doorSx}
            >
                {RESUME_LABEL}
            </Button>

            {showDashboard && (
                <Button
                    component={Link}
                    href={EXPERIENCE_NAV.href}
                    startIcon={<AutoStoriesOutlinedIcon />}
                    sx={doorSx}
                >
                    {EXPERIENCE_NAV.label}
                </Button>
            )}
        </Box>
    );
}
