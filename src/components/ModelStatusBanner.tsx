'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BoltIcon from '@mui/icons-material/Bolt';
import { useModelContext } from '@/context/ModelContext';

function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function statusChip(label: string, state: { ready: boolean; loading: boolean; progress: number; error?: string }) {
    if (state.loading) return <Chip label={`${label}: ${state.progress}%`} size="small" />;
    if (state.ready) return <Chip label={`${label}: ready`} color="success" size="small" />;
    if (state.error) return <Chip label={`${label}: error`} color="error" size="small" />;
    return <Chip label={`${label}: idle`} size="small" />;
}

export default function ModelStatusBanner() {
    const { llm, stt, tts, autoLoadAll, modelName } = useModelContext();
    const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);

    useEffect(() => {
        setWebgpuSupported(isWebGPUSupported());
    }, []);

    const anyLoading = llm.loading || stt.loading || tts.loading;
    const anyReady = llm.ready || stt.ready || tts.ready;
    const anyError = !!llm.error || !!stt.error || !!tts.error;

    const headline = useMemo(() => {
        if (webgpuSupported === false) return 'WebGPU required for on-device AI';
        if (anyLoading) return 'Initializing on-device AI…';
        if (anyError) return 'On-device AI failed to initialize';
        if (llm.ready && stt.ready && tts.ready) return 'On-device AI is ready';
        if (anyReady) return 'On-device AI partially ready';
        return 'On-device AI is idle';
    }, [anyError, anyLoading, anyReady, llm.ready, stt.ready, tts.ready, webgpuSupported]);

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2,
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Stack spacing={1.25}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BoltIcon fontSize="small" />
                            {headline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Models load from <code>/models</code> and ONNX Runtime assets from <code>/onnxruntime</code> (offline).
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            variant={anyReady ? 'outlined' : 'contained'}
                            startIcon={<RefreshIcon />}
                            disabled={anyLoading || webgpuSupported === false}
                            onClick={() => void autoLoadAll().catch(() => {})}
                        >
                            {anyReady ? 'Re-initialize' : 'Initialize'}
                        </Button>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    {webgpuSupported === null ? (
                        <Chip label="Checking WebGPU…" size="small" />
                    ) : webgpuSupported ? (
                        <Chip label="WebGPU detected" color="success" size="small" />
                    ) : (
                        <Chip label="WebGPU missing" color="error" size="small" />
                    )}

                    {statusChip('LLM', llm)}
                    {statusChip('STT', stt)}
                    {statusChip('TTS', tts)}
                    <Chip label={`LLM: ${modelName}`} size="small" variant="outlined" />
                </Stack>

                {anyError && (
                    <Alert severity="error">
                        {llm.error || stt.error || tts.error}
                    </Alert>
                )}
            </Stack>
        </Paper>
    );
}
