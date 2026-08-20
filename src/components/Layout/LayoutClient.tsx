'use client';

import { useState, useEffect, ReactNode, useRef } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer, { type FooterProps } from './Footer';
import ChatWidget from '@/components/Chat/ChatWidget';
import SkinAtmosphere from '@/skins/SkinAtmosphere';
import { ModelProvider } from '@/context/ModelContext';
import type { NavItem } from '@/lib/contentTypes';
import type { ResumeCorpus } from '@/lib/resumeContext';

interface LayoutClientProps {
    children: ReactNode;
    /**
     * The whole résumé, entry by entry, un-truncated. Retrieval and prompt
     * assembly happen per question on the client — see `src/lib/resumeContext.ts`.
     */
    resumeCorpus: ResumeCorpus;
    /** Chat entry-point prompts, authored in content and threaded through (F2). */
    suggestedPrompts?: string[];
    nav: NavItem[];
    footer?: FooterProps;
}

export default function LayoutClient({ children, resumeCorpus, suggestedPrompts, nav, footer }: LayoutClientProps) {
    const theme = useTheme();
    // Same breakpoint the Drawer variant itself switches on (`md`): below it the
    // Drawer is `temporary`, at and above it `permanent`.
    const isMobile = useMediaQuery(theme.breakpoints.down('md'), { defaultMatches: false });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);

    // D5: the drawer state tracks the viewport for the life of the page, not
    // just at mount. `useMediaQuery` reports `defaultMatches` (desktop) during
    // the static render and the first client render, so hydration can never
    // disagree; the real match lands on the following commit.
    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    const closeSidebar = () => {
        // D1: closing on select belongs to the temporary Drawer only. On desktop
        // the permanent Drawer must not collapse (a 188px horizontal reflow
        // during a vertical smooth-scroll) and focus must not leave the item.
        if (!isMobile) return;

        setSidebarOpen(false);

        // Give the Drawer a tick to start closing, then move focus somewhere stable.
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                menuButtonRef.current?.focus();
            }, 0);
        }
    };

    return (
        <ModelProvider resumeCorpus={resumeCorpus}>
            {/* The skin's atmosphere layer. Rendered here rather than as a
                `body` pseudo-element because both pseudo-slots are already
                owned — `cinema.css` paints the page grade on `::before` and
                `coder.css` the scanlines on `::after`. Renders nothing on the
                professional skin. */}
            <SkinAtmosphere />
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Header onMenuToggle={toggleSidebar} menuButtonRef={menuButtonRef} />
                <Sidebar open={sidebarOpen} onClose={closeSidebar} nav={nav} />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '100vh',
                        width: '100%',
                        transition: theme.transitions.create(['width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    }}
                >
                    <Toolbar /> {/* Spacer for fixed AppBar */}
                    <Box
                        sx={{
                            flexGrow: 1,
                            py: { xs: 2, sm: 3, md: 4 },
                            px: { xs: 1.5, sm: 2, md: 4 },
                            // No background. `body` already paints the ground,
                            // and an opaque box here sat on top of the page-wide
                            // grade layer (`body::before` in cinema.css) and hid
                            // it everywhere content lives — i.e. everywhere.
                        }}
                    >
                        {children}
                    </Box>
                    <Footer {...footer} />
                </Box>
                <ChatWidget suggestedPrompts={suggestedPrompts} />
            </Box>
        </ModelProvider>
    );
}
