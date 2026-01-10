'use client';
import { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    LinearProgress,
    Tooltip,
    useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import { alpha } from '@mui/material'; // Ensure alpha is imported or use theme
import Link from 'next/link';

// NOTE: require imports inside component are sloppy, better to import at top. 
// But circular dependency check might fail if I import ModelContext here? 
// No, context is fine.
// Re-doing the import properly.
// import { useModelContext } from '@/context/ModelContext'; // Adding this would require updating the file imports block properly.


interface HeaderProps {
    onMenuToggle: () => void;
    loadingStatus?: {
        isLoading: boolean;
        message: string;
        progress?: number;
    };
}

export default function Header({ onMenuToggle, loadingStatus }: HeaderProps) {
    const theme = useTheme();

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Toolbar>
                <IconButton
                    edge="start"
                    color="primary"
                    aria-label="toggle menu"
                    onClick={onMenuToggle}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        Kaushal Kanakamedala
                        <Box component="span" sx={{ color: theme.palette.primary.main }}>.</Box>
                    </Typography>
                </Link>

                <Box sx={{ flexGrow: 1 }} />

                {/* Status Indicator */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <StatusBadge />

                    <Tooltip title="Home">
                        <IconButton
                            component={Link}
                            href="/"
                            color="primary"
                        >
                            <HomeIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

function StatusBadge() {
    // Import inside component or use hook if this was inside ModelContext provider scope.
    // Since Header is inside ModelProvider in Layout now, this works.
    const { useModelContext } = require('@/context/ModelContext');
    const { llm, stt, tts, modelName } = useModelContext();

    const ModelStatus = ({ name, state }: { name: string; state: { ready: boolean; loading: boolean; progress: number } }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {state.ready ? (
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</Typography>
                </Box>
            ) : state.loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1.5s infinite' }} />
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', minWidth: 22 }}>
                        {state.progress}%
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'grey.400' }} />
            )}
            <Typography variant="caption" fontWeight={state.ready ? 600 : 400} color={state.ready ? 'success.main' : 'text.secondary'} sx={{ fontSize: 11 }}>
                {name}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(255,255,255,0.7)',
            px: 1.5,
            py: 0.5,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <ModelStatus name="STT" state={stt} />
            <ModelStatus name="LLM" state={llm} />
            <ModelStatus name="TTS" state={tts} />
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </Box>
    );
}
