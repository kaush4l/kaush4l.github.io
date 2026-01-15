'use client';
import type { Ref } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Tooltip,
    useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import Link from 'next/link';
import { useModelContext } from '@/context/ModelContext';
import { usePathname } from 'next/navigation';


interface HeaderProps {
    onMenuToggle: () => void;
    menuButtonRef?: Ref<HTMLButtonElement>;
    loadingStatus?: {
        isLoading: boolean;
        message: string;
        progress?: number;
    };
}

export default function Header({ onMenuToggle, menuButtonRef, loadingStatus }: HeaderProps) {
    const theme = useTheme();
    const pathname = usePathname();
    const showAmaStatus = pathname === '/ama';

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
                    ref={menuButtonRef}
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
                    {showAmaStatus && <StatusBadge />}

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

function ModelStatus({
    name,
    state,
}: {
    name: string;
    state: { ready: boolean; loading: boolean; progress: number };
}) {
    return (
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
}

function StatusBadge() {
    const { llm, stt, tts } = useModelContext();

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
