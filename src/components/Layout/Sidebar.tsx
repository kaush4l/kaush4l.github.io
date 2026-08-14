'use client';
import { useEffect, useState } from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Divider,
    Toolbar,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/contentTypes';
import { SectionIcon } from '@/components/icons';
import { RADIUS } from '@/theme/ThemeProvider';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const NAV_TRANSITION = 'background-color 150ms linear, color 150ms linear';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    nav: NavItem[];
}

/**
 * Scroll-spy over the rendered `section[id]` elements.
 *
 * The nav is a set of in-page hash links, so route matching can never report
 * where the reader is (F1). An IntersectionObserver with a middle-band root
 * margin makes "active" mean "the section occupying the middle of the viewport".
 */
function useActiveSection(sectionCount: number): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

        const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id]'));
        if (sections.length === 0) return;

        const visible = new Set<string>();

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.add(entry.target.id);
                    else visible.delete(entry.target.id);
                }
                // First in document order wins, so the active item never flickers
                // backwards while two sections straddle the band.
                const next = sections.find((section) => visible.has(section.id))?.id ?? null;
                setActiveId(next);
            },
            { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [sectionCount]);

    return activeId;
}

export default function Sidebar({ open, onClose, nav }: SidebarProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const pathname = usePathname();
    const activeId = useActiveSection(nav.length);
    // M24/M26 — the drawer is an elevated surface, so it takes the *mode's own*
    // authored elevation language rather than an `isDark ? …` guess. The previous
    // `isDark ? 'none' : theme.shadows[1]` had two defects: the light branch used
    // MUI's default neutral shadow instead of light mode's hue-tinted one, and
    // the dark branch collapsed dark and coder into one answer by accident. The
    // mode table already distinguishes all three (tinted / black / none), so read
    // it off the theme — the same way ContentCard reads its resting shadow.
    const drawerShadow =
        (theme.components?.MuiCard?.styleOverrides?.root as { boxShadow?: string } | undefined)
            ?.boxShadow ?? 'none';

    const isActive = (href: string) => {
        // Home is "active" only at the top of the page, before any section
        // has taken the middle band.
        if (href === '/') return pathname === '/' && activeId === null;
        const hash = href.split('#')[1];
        return !!hash && hash === activeId;
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* MUI's semantic AppBar spacer — stays correct at the xs 56px height (F4). */}
            <Toolbar />

            <List sx={{ flexGrow: 1, px: 1 }}>
                {/* Home + a divider, then one entry per content section (metadata-driven). */}
                {[{ text: 'Home', icon: 'home', href: '/' }, ...nav.map((n) => ({ text: n.title, icon: n.icon, href: n.href }))].map((menuItem, index) => {
                    const active = isActive(menuItem.href);

                    return (
                        <Box component="span" key={menuItem.href} sx={{ display: 'block' }}>
                            {index === 1 && <Divider sx={{ my: 1 }} />}
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    href={menuItem.href}
                                    // E13: expanded, the label text is the button's own
                                    // visible content — naming it again is a duplicate
                                    // announcement. Collapsed to 72px only the icon
                                    // remains, so the label becomes the only name.
                                    aria-label={open ? undefined : menuItem.text}
                                    aria-current={active ? 'page' : undefined}
                                    onClick={(e) => {
                                        // D1: only the temporary (mobile) Drawer closes on
                                        // select. On desktop the permanent Drawer stays put
                                        // and focus stays on the item that was clicked.
                                        if (!isMobile) return;

                                        // Prevent focus from remaining inside the temporary Drawer as it closes.
                                        if (e.currentTarget instanceof HTMLElement) {
                                            e.currentTarget.blur();
                                        }
                                        onClose();
                                    }}
                                    sx={{
                                        borderRadius: RADIUS.chip,
                                        minHeight: 48,
                                        justifyContent: open ? 'flex-start' : 'center',
                                        px: 2.5,
                                        backgroundColor: active ? 'primary.main' : 'transparent',
                                        color: active ? 'primary.contrastText' : 'text.primary',
                                        '&:hover': {
                                            backgroundColor: active ? 'primary.dark' : 'action.hover',
                                        },
                                        transition: NAV_TRANSITION,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 2 : 0,
                                            justifyContent: 'center',
                                            color: active ? 'primary.contrastText' : 'primary.main',
                                        }}
                                    >
                                        <SectionIcon name={menuItem.icon} />
                                    </ListItemIcon>
                                    {open && (
                                        <ListItemText
                                            primary={menuItem.text}
                                            primaryTypographyProps={{
                                                fontWeight: active ? 600 : 400,
                                                fontSize: '0.9rem',
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        </Box>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <>
            {/* Mobile Drawer - Only 'open' if mobile AND props say open */}
            <Drawer
                variant="temporary"
                open={isMobile && open}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                className="no-print"
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                open={open}
                className="no-print"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
                    flexShrink: 0,
                    zIndex: theme.zIndex.drawer,
                    '& .MuiDrawer-paper': {
                        width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
                        boxSizing: 'border-box',
                        overflowX: 'hidden',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        boxShadow: drawerShadow,
                        // The page-wide grade (`body::before`) has to reach the
                        // sidebar too. An opaque 260px slab down the left edge
                        // of a lit frame reads as browser chrome the page drew
                        // for itself — the light has to cross the whole window,
                        // or the window is not the frame.
                        backgroundColor: 'transparent',
                        backdropFilter: 'blur(8px)',
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        </>
    );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
