'use client';
import { Box, Grid, Typography } from '@mui/material';
import { ContentItem } from '@/lib/contentTypes';
import ContentCard from './ContentCard';
import SectionHeading from './SectionHeading';

interface SectionProps {
    id: string;
    title: string;
    items: ContentItem[];
    variant?: 'timeline' | 'grid';
    /** Icon registry key, straight from the section's `_section.md`. */
    icon: string;
    /** Palette channel from `_section.md`; resolved inside SectionHeading. */
    accent?: 'primary' | 'secondary';
    /**
     * One sentence between the heading and the entries, authored in the
     * section's own `_section.md`. `content.ts` already parsed this for every
     * section and only the contact layout read it — so the only way to frame a
     * section (e.g. that everything after a certain date was contract work) was
     * to hardcode a string in a component. Now it is content.
     */
    intro?: string;
}

/**
 * Featured entries lead the list, so they form a contiguous block and must tile
 * among *themselves* — a featured span only pairs with a regular card if a
 * regular card actually follows it. The rule below leaves no trailing holes for
 * any count the content folder happens to declare:
 *   1 featured  → 8, paired with the first regular 4 (12 if nothing follows)
 *   even count  → 6 + 6 rows
 *   odd count   → the first runs full width, the rest pair at 6 + 6
 */
function featuredSpan(indexAmongFeatured: number, featuredCount: number, regularCount: number): number {
    if (featuredCount === 1) return regularCount > 0 ? 8 : 12;
    if (featuredCount % 2 === 0) return 6;
    return indexAmongFeatured === 0 ? 12 : 6;
}

export default function Section({ id, title, items, variant = 'timeline', icon, accent, intro }: SectionProps) {
    const featuredCount = items.filter((item) => item.featured).length;
    const regularCount = items.length - featuredCount;
    const mdSpans = new Map<string, number>();
    let featuredSeen = 0;
    for (const item of items) {
        if (item.featured) {
            mdSpans.set(item.slug, featuredSpan(featuredSeen, featuredCount, regularCount));
            featuredSeen += 1;
        } else {
            mdSpans.set(item.slug, 4);
        }
    }

    return (
        <Box
            id={id}
            component="section"
            sx={{
                py: { xs: 6, md: 10 },
            }}
        >
            <SectionHeading icon={icon} title={title} accent={accent} />

            {intro && (
                <Typography
                    component="p"
                    sx={{
                        color: 'text.secondary',
                        fontSize: '0.95rem',
                        maxWidth: '62ch',
                        mt: -1,
                        mb: { xs: 3, md: 4 },
                    }}
                >
                    {intro}
                </Typography>
            )}

            {/* Content */}
            {variant === 'grid' ? (
                <Grid container spacing={3}>
                    {items.map((item) => (
                        <Grid
                            key={item.slug}
                            // A featured entry earns physical size, not just position.
                            size={{
                                xs: 12,
                                sm: item.featured ? 12 : 6,
                                md: mdSpans.get(item.slug) ?? 4,
                            }}
                        >
                            <ContentCard item={item} variant="card" />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                // No padding here: `ContentCard` owns the timeline inset, so the
                // heading's accent bar and the timeline rule share a left edge.
                <Box>
                    {items.map((item) => (
                        <ContentCard key={item.slug} item={item} variant="timeline" />
                    ))}
                </Box>
            )}
        </Box>
    );
}
