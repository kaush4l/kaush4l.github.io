'use client';

// ExperienceButton — the visitor's door into Experience 2.0.
//
// It is deliberately a LINK, not a menu, and that is the one design decision
// worth defending here. `SkinMenu` and `AppearanceMenu` are menus because they
// commit a setting: there is no other surface on which to see the options, so
// the trigger has to show them. An experience is not a setting — it is a second
// destination, and that destination (`/experience/`) is itself the selection
// surface, with a card, a swatch and a premise per world. Putting a menu in
// front of it would be a selection surface in front of a selection surface: the
// visitor would choose twice, and the first choice would be the one made with
// the least information.
//
// The consequence for accessibility is the reason there is no `aria-haspopup`
// / `aria-expanded` below. Those two attributes are how the other two header
// triggers honestly announce "a menu will open here". This control opens a
// PAGE. Announcing a popup that turns out to be a navigation is a lie to a
// screen reader, and the reader who trusted it has already lost their place.

import { IconButton, Tooltip } from '@mui/material';
import Link from 'next/link';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { EXPERIENCE_NAV } from '@/experiences/registry';
import { RADIUS } from '@/theme/ThemeProvider';

export default function ExperienceButton() {
    return (
        // E13 permits a Tooltip here because the control has no visible text
        // sibling naming it — and `hint` is deliberately NOT `label`, so the
        // tooltip adds information instead of re-announcing the aria-label MUI
        // wires as `aria-describedby`. Both strings come from `EXPERIENCE_NAV`
        // (M3): the header, the dashboard heading and the route metadata read
        // the same table, so the word for this feature is changed in one place
        // or not at all.
        <Tooltip title={EXPERIENCE_NAV.hint}>
            <IconButton
                // Header chrome never prints. `globals.css` forces a light
                // print surface and drops `.no-print`; a door into a second
                // site is meaningless on paper.
                className="no-print"
                color="primary"
                // `component={Link}` rather than a raw `href` on an <a>: the
                // export runs under a `basePath` on any non-user-pages deploy,
                // and only next/link applies it (ARCH-MAP §4). A literal
                // `/experience/` would 404 there and nowhere else, which is the
                // worst shape a bug can have.
                component={Link}
                href={EXPERIENCE_NAV.href}
                aria-label={EXPERIENCE_NAV.label}
                sx={{
                    // 44px minimum target, matched to every other header icon
                    // button so the toolbar's 56px height is unaffected.
                    width: 44,
                    height: 44,
                    // Geometry comes from the shared const, never a px literal
                    // (M37). On a 44×44 square `pill` resolves to the same
                    // circle MUI's default already draws, so this states the
                    // intent without changing a pixel.
                    borderRadius: RADIUS.pill,
                }}
            >
                <AutoStoriesIcon />
            </IconButton>
        </Tooltip>
    );
}
