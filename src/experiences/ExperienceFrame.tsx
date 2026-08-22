'use client';

/**
 * The shell every world is mounted inside, and the reason no world has to be
 * trusted with the things a reader cannot afford to lose.
 *
 * A stage route renders no `<Layout>` (§C.4): no header, no 260px section
 * drawer, no chat FAB. That is a deliberate subtraction — a résumé's navigation
 * chrome standing beside a cinematic telling is what makes the telling read as a
 * widget — and its price is that everything a visitor needs in order to get back
 * out has to come from here. So this component owns, in this order:
 *
 *   1. `ExperienceExit`, FIRST in the DOM, outside the Stage subtree. First in
 *      the DOM means first tab stop; outside the Stage subtree means a Stage
 *      that throws or whose timeline never starts still leaves the door.
 *   2. The atmosphere frame — fixed, `inset: 0`, `z-index: -1`, pointer- and
 *      screen-reader-transparent, print-hidden. Owned here for exactly the
 *      reason `SkinAtmosphere` owns the skins': five worlds must not be able to
 *      disagree about whether decoration can intercept a pointer.
 *   3. The Stage, wrapped in `ExperienceProvider`, which is the single writer of
 *      the `--xp-*` token map.
 *
 * ── What crosses the server/client boundary, and why it is `id` ─────────────
 * The route's `page.tsx` is a server component: it reads the content folders,
 * builds the `Story` at BUILD time, and serialises it into the static HTML, so
 * no reader's machine ever parses markdown. What it cannot serialise is the
 * `Experience` record — `tokens()` is a function and `Stage` is a component
 * reference. So the page hands over the id (a string) plus the story (plain
 * data), and this component looks the record up in the registry on the client.
 * One boundary, one lookup, nothing pretending to be serialisable that is not.
 */

import { Box } from '@mui/material';
import type { ComponentType } from 'react';
import ExperienceExit from './ExperienceExit';
import ExperienceProvider, { useExperience } from './ExperienceProvider';
import { EXPERIENCES, isExperienceId } from './registry';
import { useViewport } from './viewport';
// The shared default stage (§A.9). Imported STATICALLY, not via `dynamic`, and
// the distinction is load-bearing: this is the stage a world gets when it
// declares none, so it is the only thing in the exported HTML of such a world.
// Deferring it with `ssr: false` would export a page whose entire story arrives
// one paint late — invisible to a crawler, invisible with JS off, and exactly
// the failure §B.2 rejects client-side parsing for. A world that ships its own
// motion timeline still uses `dynamic` inside its own `index.ts`; the E1 rule
// is about timelines, not about defaults.
import DefaultStage from './Stage';
import type { StageProps } from './types';
import type { Story } from '@/lib/story';

interface ExperienceFrameProps {
    /** The route segment. Validated here rather than trusted — see below. */
    id: string;
    /** Built at build time from the content folders. Plain data, all the way down. */
    story: Story;
}

export default function ExperienceFrame({ id, story }: ExperienceFrameProps) {
    const tier = useViewport();

    /**
     * `dynamicParams = false` plus a `generateStaticParams` derived from
     * `EXPERIENCE_LIST` means an unknown id cannot be reached in the export — the
     * route simply does not exist and GitHub Pages serves `out/404.html`. The
     * guard is still here, and it is not belt-and-braces: it is what turns
     * `EXPERIENCES[id]` from an unchecked index into a narrowed lookup, so this
     * component holds no `as ExperienceId` cast. Returning the bare door rather
     * than throwing means that even in the impossible case the visitor gets a way
     * out instead of an error overlay.
     */
    if (!isExperienceId(id)) return <ExperienceExit />;

    const experience = EXPERIENCES[id];
    const Stage = experience.Stage ?? DefaultStage;
    const Atmosphere = experience.Atmosphere;

    return (
        <ExperienceProvider experience={experience} tier={tier}>
            {/* FIRST, always. See the header comment in ExperienceExit. */}
            <ExperienceExit />

            {Atmosphere && (
                <Box
                    aria-hidden
                    className="no-print xp-atmosphere"
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: -1,
                        pointerEvents: 'none',
                        // `clip`, not `hidden`, for the reason SkinAtmosphere
                        // documents at length: an overhanging decorative layer
                        // still contributes to the document's scroll width under
                        // `hidden`, and iOS Safari renders that as real
                        // horizontal scroll.
                        overflow: 'clip',
                        '@media print': { display: 'none' },
                    }}
                >
                    <Atmosphere tier={tier} />
                </Box>
            )}

            <StageHost Stage={Stage} story={story} tier={tier} />
        </ExperienceProvider>
    );
}

/**
 * A one-line child whose only job is to be INSIDE the provider.
 *
 * `reduceMotion` is provider state, and a Stage is handed it as a prop
 * (`StageProps`) rather than being required to call `useExperience()` — so that
 * a world's Stage can be unit-rendered with three plain props and no context.
 * Reading the context therefore has to happen below the provider, which means it
 * cannot happen in `ExperienceFrame` itself.
 */
function StageHost({
    Stage,
    story,
    tier,
}: {
    Stage: ComponentType<StageProps>;
    story: Story;
    tier: StageProps['tier'];
}) {
    const { reduceMotion } = useExperience();
    return <Stage story={story} tier={tier} reduceMotion={reduceMotion} />;
}
