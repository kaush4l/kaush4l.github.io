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
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import HomeIcon from '@mui/icons-material/Home';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const menuItems = [
    { text: 'Home', icon: <HomeIcon />, href: '/', section: null },
    { divider: true },
    { text: 'Experience', icon: <WorkIcon />, href: '/#experience', section: 'experience' },
    { text: 'Projects', icon: <CodeIcon />, href: '/#projects', section: 'projects' },
    { text: 'Education', icon: <SchoolIcon />, href: '/#education', section: 'education' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href.split('#')[0]);
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, mt: 8 }}>
                {open && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Navigation
                    </Typography>
                )}
            </Box>

            <List sx={{ flexGrow: 1, px: 1 }}>
                {menuItems.map((item, index) => {
                    if ('divider' in item && item.divider) {
                        return <Divider key={index} sx={{ my: 1 }} />;
                    }

                    const menuItem = item as { text: string; icon: React.ReactNode; href: string; section: string | null };
                    const active = isActive(menuItem.href);

                    return (
                        <ListItem key={menuItem.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={Link}
                                href={menuItem.href}
                                onClick={onClose}
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
                                    {menuItem.icon}
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
