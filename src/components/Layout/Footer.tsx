'use client';
import { Box, Typography, Link as MuiLink, Divider, Stack } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                py: 4,
                px: 3,
                mt: 'auto',
                borderTop: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'rgba(250, 250, 250, 0.8)',
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
            >
                <Typography variant="body2" color="text.secondary">
                    Built with Next.js & Material UI • Powered by WebGPU AI
                </Typography>

                <Stack direction="row" spacing={2}>
                    <MuiLink
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="text.secondary"
                        sx={{ '&:hover': { color: 'primary.main' } }}
                    >
                        <GitHubIcon fontSize="small" />
                    </MuiLink>
                    <MuiLink
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="text.secondary"
                        sx={{ '&:hover': { color: 'primary.main' } }}
                    >
                        <LinkedInIcon fontSize="small" />
                    </MuiLink>
                    <MuiLink
                        href="mailto:contact@example.com"
                        color="text.secondary"
                        sx={{ '&:hover': { color: 'primary.main' } }}
                    >
                        <EmailIcon fontSize="small" />
                    </MuiLink>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                    © {new Date().getFullYear()} Kaushal. All rights reserved.
                </Typography>
            </Stack>
        </Box>
    );
}
