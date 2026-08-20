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
                // Clearance for the chat FAB, which is `position: fixed` at the
                // bottom-right and therefore floats over whatever the document
                // ends on. A FAB covering mid-page copy as you scroll past is
                // the pattern working as intended; a FAB permanently parked on
                // the last line of the page is not — at 390px it sat on the
                // footer with nothing below to scroll to, so the covered text
                // could not be reached at all. The FAB is 64px plus its 16px
                // inset, so this clears it with a margin and costs desktop
                // nothing.
                pb: { xs: 14, sm: 4 },
                mt: 'auto',
                borderTop: '1px solid',
                borderColor: 'divider',
                // Transparent, like `<main>` and the drawer: an opaque panel
                // here put a white slab across the last 200px of a graded page,
                // with a visible seam where the sidebar column ended. The top
                // border below is what separates the footer, not a fill.
                backgroundColor: 'transparent',
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

            {/* `text.disabled` is MUI's `rgba(0,0,0,0.38)`, which measured
                2.66:1 on the light ground and 2.62:1 on Accession's cream. The
                dark skins were passing at 5.33:1, which is what made this an
                oversight rather than a decision. A copyright line is small, but
                it is text, and `disabled` is a state this element is not in. */}
            <Typography variant="caption" color="text.secondary">
                {/* The framework credit is gone. On an engineer's own résumé it
                    is an anti-credential: it names the template stack instead of
                    the work, and the only interesting technical claim this site
                    makes — the model runs in your tab — is already at the fold. */}
                {`© ${year}${owner ? ` ${owner}` : ''}`}
            </Typography>
        </Box>
    );
}
