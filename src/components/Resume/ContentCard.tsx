'use client';
import {
    Box,
    Typography,
    Chip,
    Card,
    CardActionArea,
    CardContent,
    Stack,
    Tooltip,
    useTheme,
} from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ContentItem } from '@/lib/contentTypes';
import { RADIUS } from '@/theme/ThemeProvider';

interface ContentCardProps {
    item: ContentItem;
    variant?: 'timeline' | 'card';
}

const MOTION = 'transform 150ms cubic-bezier(0.2,0,0,1), box-shadow 150ms cubic-bezier(0.2,0,0,1), border-color 150ms linear';
const VISIBLE_TAGS = 4;

export default function ContentCard({ item, variant = 'card' }: ContentCardProps) {
    const theme = useTheme();
    const tags = item.tags || item.tools || [];

    if (variant === 'timeline') {
        // Metadata: "April 2025 - Present · Remote / Durham, NC · via DataForce Inc".
        // The client owns the h5; the staffing agency is demoted to this caption.
        const meta = [item.period, item.location, item.via ? `via ${item.via}` : null]
            .filter(Boolean)
            .join(' · ');

        return (
            <Box
                sx={{
                    position: 'relative',
                    pl: { xs: 2.5, sm: 3, md: 4 },
                    pb: { xs: 3, sm: 3.5, md: 4 },
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                    // The rule should resolve, not get clipped, at the end of the list.
                    '&:last-child': {
                        borderColor: 'transparent',
                        borderImage: `linear-gradient(to bottom, ${theme.palette.divider} 0%, transparent 100%) 1`,
                    },
                    '&:hover': {
                        '& .timeline-dot': {
                            backgroundColor: 'primary.main',
                            transform: 'scale(1.2)',
                        },
                    },
                }}
            >
                {/* Timeline dot — reads as a hole punched in the rule, in both modes. */}
                <Box
                    className="timeline-dot"
                    sx={{
                        position: 'absolute',
                        left: -7,
                        top: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: 'background.default',
                        border: '3px solid',
                        borderColor: 'primary.light',
                        transition: MOTION,
                    }}
                />

                {/* Institution / employer leads — it is the discriminating line. */}
                {item.subtitle && (
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            lineHeight: 1.25,
                            // A long employer name breaks into even lines instead of
                            // stranding one word over the timeline dot's optical zone.
                            textWrap: 'balance',
                        }}
                    >
                        {item.subtitle}
                    </Typography>
                )}

                {/* Role / degree sits beneath it. */}
                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25 }}>
                    {item.title}
                </Typography>

                {meta && (
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontVariantNumeric: 'tabular-nums',
                            mt: 0.75,
                            mb: 2,
                        }}
                    >
                        {meta}
                    </Typography>
                )}

                {/* No `tools:` chips on the timeline. Skills is the index; every
                    technology here is already bolded inside the bullet that proves
                    it, and repeating the list turns evidence back into keywords. */}

                <Box
                    className="prose-content"
                    sx={{
                        color: 'text.primary',
                        maxWidth: '68ch',
                        // Amarante is single-weight and font synthesis is off, so
                        // emphasis is carried by colour, not weight (globals.css).
                        // These spans hold the metrics — they must still lead the eye.
                        '& strong': { color: 'primary.main' },
                    }}
                    dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                />

                {/* Coursework is not a production technology — plain running text, no chips. */}
                {item.coursework && item.coursework.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.5 }}>
                        Coursework: {item.coursework.join(', ')}
                    </Typography>
                )}

                {item.quote && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            borderLeft: '3px solid',
                            borderColor: 'primary.light',
                            backgroundColor: 'action.hover',
                            borderRadius: RADIUS.chip,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                        }}
                    >
                        <FormatQuoteIcon sx={{ color: 'primary.light', opacity: 0.5 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {item.quote}
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    }

    // ---- Card variant -------------------------------------------------------
    const hasLink = Boolean(item.link);
    // The theme's `MuiCard` root sets a resting shadow and blooms it on hover /
    // focus-within. A link-less card must hold the *resting* value through both
    // states — `none` would make it flatten on hover, the same false signal
    // pointing the other way. Read it off the theme so no literal is duplicated.
    const restingShadow = (
        theme.components?.MuiCard?.styleOverrides?.root as { boxShadow?: string } | undefined
    )?.boxShadow;
    const visibleTags = tags.slice(0, VISIBLE_TAGS);
    const hiddenTags = tags.slice(VISIBLE_TAGS);

    const body = item.description ? (
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {item.description}
        </Typography>
    ) : (
        <Box
            className="prose-content"
            sx={{
                color: 'text.primary',
                fontSize: '0.875rem',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                // Fade the truncation instead of guillotining mid-word.
                maskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
            }}
            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
        />
    );

    const inner = (
        <CardContent sx={{ flexGrow: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }} gutterBottom>
                    {item.title}
                </Typography>
                {hasLink && (
                    // Pure indicator: the whole card is the target.
                    <OpenInNewIcon
                        aria-hidden
                        sx={{ fontSize: 20, color: 'text.secondary', pointerEvents: 'none', flexShrink: 0 }}
                    />
                )}
            </Box>

            {item.subtitle && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                    {item.subtitle}
                </Typography>
            )}

            {item.period && (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        color: 'text.secondary',
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        mb: 2,
                    }}
                >
                    {item.period}
                </Typography>
            )}

            {tags.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
                    {visibleTags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: RADIUS.chip, fontSize: '0.75rem' }}
                        />
                    ))}
                    {hiddenTags.length > 0 && (
                        <Tooltip title={hiddenTags.join(', ')} enterTouchDelay={0} leaveTouchDelay={4000}>
                            {/* Focusable so the tooltip is reachable by keyboard, and it
                                swallows the pointer/enter so a tap or Enter reveals the
                                hidden tags instead of navigating the enclosing card. */}
                            <Chip
                                label={`+${hiddenTags.length} more`}
                                size="small"
                                tabIndex={0}
                                aria-label={`${hiddenTags.length} more: ${hiddenTags.join(', ')}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                    }
                                }}
                                sx={{ borderRadius: RADIUS.chip, fontSize: '0.75rem' }}
                            />
                        </Tooltip>
                    )}
                </Stack>
            )}

            {body}
        </CardContent>
    );

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transition: MOTION,
                // A card with nowhere to go must not advertise itself as a target:
                // cancel the lift *and* the bloom, on hover and on focus-within
                // (which otherwise fires when the `+N more` chip takes focus).
                ...(hasLink
                    ? {}
                    : {
                          '&:hover, &:focus-within': {
                              transform: 'none',
                              boxShadow: restingShadow ?? 'none',
                          },
                      }),
            }}
        >
            {hasLink ? (
                <CardActionArea
                    component="a"
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                    }}
                >
                    {inner}
                </CardActionArea>
            ) : (
                inner
            )}
        </Card>
    );
}
