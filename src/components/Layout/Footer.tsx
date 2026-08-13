'use client';
import { Box, Typography, Button, Divider, Stack } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import DownloadIcon from '@mui/icons-material/Download';
import { RESUME_HREF, RESUME_LABEL } from './Header';
import { RADIUS } from '@/theme/ThemeProvider';

export interface FooterProps {
    /** One closing statement — the last thing a visitor reads. Threaded from `Layout`. */
    statement?: string;
    /** `mailto:` URL derived from the contact content folder — never hardcoded here (K3). */
    emailUrl?: string;
    /** Copyright holder, derived from content metadata. */
    owner?: string;
}

export default function Footer({ statement, emailUrl, owner }: FooterProps) {
    const year = new Date().getFullYear();

    return (
        <Box
            component="footer"
            sx={{
                py: 4,
                px: 3,
                mt: 'auto',
                borderTop: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
            >
                {statement && (
                    <Typography variant="body1" color="text.primary" sx={{ maxWidth: '48ch', fontWeight: 500 }}>
                        {statement}
                    </Typography>
                )}

                {/* The most salient thing in the final viewport is an action (K2). */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {emailUrl && (
                        <Button
                            variant="contained"
                            color="primary"
                            disableElevation
                            href={emailUrl}
                            startIcon={<EmailIcon />}
                            sx={{ minHeight: 44, px: 2.5, borderRadius: RADIUS.pill, fontWeight: 500, whiteSpace: 'nowrap' }}
                        >
                            Email me
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="primary"
                        href={RESUME_HREF}
                        download
                        startIcon={<DownloadIcon />}
                        sx={{ minHeight: 44, px: 2.5, borderRadius: RADIUS.pill, fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                        {RESUME_LABEL}
                    </Button>
                </Stack>
            </Stack>

            <Divider sx={{ mt: 3, mb: 1.5 }} />

            <Typography variant="caption" color="text.disabled">
                {`Built with Next.js and Material UI · © ${year}${owner ? ` ${owner}` : ''}`}
            </Typography>
        </Box>
    );
}
