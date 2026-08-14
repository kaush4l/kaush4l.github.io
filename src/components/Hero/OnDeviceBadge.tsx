'use client';

import { Box, Typography } from '@mui/material';
import { Waveform } from 'ldrs/react';
import 'ldrs/react/Waveform.css';
import { useModelContext } from '@/context/ModelContext';
import { RADIUS } from '@/theme/ThemeProvider';
import { EASE_UI_CSS } from '@/lib/motion';

/**
 * The fold's status line for the on-device assistant.
 *
 * A2 (ModelContext): this badge **observes** and never starts a download. It
 * subscribes to the same `llm` state the chat panel does, so the fold's claim
 * ("runs in this tab") is backed by a live readout instead of a promise — but
 * it costs a visitor who never opens the chat exactly zero bytes.
 *
 * The loader is `ldrs`' waveform rather than a spinner on purpose: a spinner
 * says "waiting", a waveform says "something is running". While weights stream
 * it is paired with the real percentage, so the animation is decoration on top
 * of a number, never a substitute for one.
 */
export default function OnDeviceBadge({ color }: { color: string }) {
    const { llm, modelName } = useModelContext();

    const state: 'idle' | 'loading' | 'ready' | 'error' = llm.error
        ? 'error'
        : llm.ready
            ? 'ready'
            : llm.loading
                ? 'loading'
                : 'idle';

    const label = {
        idle: 'On-device assistant · idle',
        loading: `Loading ${modelName} · ${llm.progress}%`,
        ready: `${modelName} ready · running on your GPU`,
        error: 'Assistant unavailable in this browser',
    }[state];

    return (
        <Box
            className="no-print"
            // The live region is polite and the text carries the whole meaning,
            // so a screen-reader user hears the state change without the dot.
            role="status"
            aria-live="polite"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                mb: 3,
                pl: 1.25,
                pr: 1.75,
                py: 0.75,
                borderRadius: RADIUS.pill,
                border: '1px solid var(--border)',
                bgcolor: 'color-mix(in srgb, var(--surface) 70%, transparent)',
                backdropFilter: 'blur(10px)',
                transition: `border-color 240ms ${EASE_UI_CSS}`,
            }}
        >
            <Box
                aria-hidden
                sx={{
                    width: 18,
                    height: 18,
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                {state === 'loading' ? (
                    <Waveform size={16} stroke={2} speed={1} color={color} />
                ) : (
                    <Box
                        sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            bgcolor: state === 'error' ? 'text.secondary' : color,
                            // A ready engine breathes; an idle one just sits there.
                            ...(state === 'ready' && {
                                animation: 'hc-pulse 2.6s ease-out infinite',
                                '@keyframes hc-pulse': {
                                    '0%': { boxShadow: `0 0 0 0 ${color}66` },
                                    '70%': { boxShadow: `0 0 0 7px ${color}00` },
                                    '100%': { boxShadow: `0 0 0 0 ${color}00` },
                                },
                                '@media (prefers-reduced-motion: reduce)': {
                                    animation: 'none',
                                },
                            }),
                        }}
                    />
                )}
            </Box>
            <Typography
                component="span"
                sx={{
                    fontFamily: 'var(--font-mono), ui-monospace, monospace',
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}
