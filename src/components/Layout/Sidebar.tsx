'use client';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Divider,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/contentTypes';
import { SectionIcon } from '@/components/icons';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    nav: NavItem[];
}

export default function Sidebar({ open, onClose, nav }: SidebarProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        const base = href.split('#')[0];
        // In-page hash links (e.g. /#about) are anchors, not active routes.
        return base !== '/' && pathname.startsWith(base);
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, mt: 8 }}>
                {/* Intentionally blank: no sidebar title */}
            </Box>

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
                                    aria-label={menuItem.text}
                                    onClick={(e) => {
                                        // Prevent focus from remaining inside the temporary Drawer as it closes.
                                        if (e.currentTarget instanceof HTMLElement) {
                                            e.currentTarget.blur();
                                        }
                                        onClose();
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        minHeight: 48,
                                        justifyContent: open ? 'flex-start' : 'center',
                                        px: 2.5,
                                        backgroundColor: active ? 'primary.main' : 'transparent',
                                        color: active ? 'white' : 'text.primary',
                                        '&:hover': {
                                            backgroundColor: active ? 'primary.dark' : 'rgba(124, 58, 237, 0.08)',
                                        },
                                        transition: 'all 0.2s ease-in-out',
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 2 : 0,
                                            justifyContent: 'center',
                                            color: active ? 'white' : 'primary.main',
                                        }}
                                    >
                                        <SectionIcon name={menuItem.icon} />
                                    </ListItemIcon>
                                    {open && (
                                        <ListItemText
                                            primary={menuItem.text}
                                            primaryTypographyProps={{
                                                fontWeight: active ? 600 : 500,
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

            {/* Footer in sidebar */}
            {open && (
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                        © 2025 Kaushal
                    </Typography>
                </Box>
            )}
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
                        borderRight: 'none',
                        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        </>
    );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
