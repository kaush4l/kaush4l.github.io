'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Box, Toolbar, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ChatWidget from '@/components/Chat/ChatWidget';
import { ModelProvider } from '@/context/ModelContext';

export default function LayoutClient({ children, systemPrompt }: { children: ReactNode, systemPrompt: string }) {
    const theme = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        // On mobile, start with sidebar closed
        if (typeof window !== 'undefined' && window.innerWidth < theme.breakpoints.values.md) {
            setSidebarOpen(false);
        }
    }, [theme.breakpoints.values.md]);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    return (
        <ModelProvider initialSystemPrompt={systemPrompt}>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Header onMenuToggle={toggleSidebar} />
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
                            py: 4,
                            px: { xs: 2, sm: 3, md: 4 },
                            backgroundColor: 'background.default',
                        }}
                    >
                        {children}
                    </Box>
                    <Footer />
                </Box>
                <ChatWidget />
            </Box>
        </ModelProvider>
    );
}
