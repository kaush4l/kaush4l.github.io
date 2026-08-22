'use client';

/**
 * The client owner of a world's live state, and the only thing that writes the
 * token map to the DOM.
 *
 * There are exactly two DOM writers in this feature and they are deliberately
 * asymmetric:
 *
 *   1. the route segment's blocking pre-paint script (`[id]/layout.tsx`), which
 *      writes ONE property — `--xp-bg` — before React exists, purely so a cold
 *      deep link into a world that pins a ground does not flash the résumé's
 *      ground first (M42, one axis over);
 *   2. this provider, which writes the COMPLETE map on mount via
 *      `applyExperienceTokens` and removes every byte of it on unmount via
 *      `clearExperienceTokens`.
 *
 * The script only ever sets, never clears, and the one value it sets is the one
 * value this provider is about to overwrite with the identical literal — because
 * both read it from the same `Experience.ground.bg` (§A.6). So the frame that
 * paints first and the frame hydration settles on are one value by construction,
 * not because two people remembered the same hex.
 *
 * ── What this provider is NOT ───────────────────────────────────────────────
 * It is not a store, and it holds no narrative state: there is no "current
 * chapter" here, no scroll position, no visited set. Those belong to a Stage,
 * because a Stage is the thing that decides what a chapter even means in its
 * world. What lives here is only what is true of EVERY world — which world,
 * which telling, and whether the visitor asked for stillness.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyExperienceTokens, clearExperienceTokens } from './tokens';
import type { Experience, NarrativeTier } from './types';
import { onReducedMotionChange, prefersReducedMotion } from '@/lib/motion';

export interface ExperienceContextValue {
    /** The world's id — also the value of `body[data-experience]`. */
    id: string;
    /** The registry entry. Read `label` / `premise` from here, never re-declare (M3). */
    experience: Experience;
    /** Which of the three tellings the current viewport is getting. */
    tier: NarrativeTier;
    /** True when the visitor has asked for stillness, from the OS or in-page. */
    reduceMotion: boolean;
}

/**
 * `null` rather than a plausible default object.
 *
 * A default would let a component that is accidentally mounted outside a world
 * render *something* — the least useful possible failure, because the bug then
 * surfaces as a subtly wrong telling rather than as a stack trace pointing at
 * the missing provider. `useExperience` throws instead.
 */
const ExperienceContext = createContext<ExperienceContextValue | null>(null);

/**
 * For a world's own `Stage` / `Atmosphere`, and for anything the shared Stage
 * grows later. It throws outside a frame on purpose — see the note above.
 */
export function useExperience(): ExperienceContextValue {
    const value = useContext(ExperienceContext);
    if (!value) {
        throw new Error('useExperience() was called outside an <ExperienceProvider>.');
    }
    return value;
}

interface ExperienceProviderProps {
    experience: Experience;
    tier: NarrativeTier;
    children: ReactNode;
}

export function ExperienceProvider({ experience, tier, children }: ExperienceProviderProps) {
    /**
     * M41. `false` is the initializer, and `matchMedia` is never read here — the
     * resolved preference is adopted in the effect below, one commit later.
     *
     * The one-frame optimism costs nothing a reduced-motion visitor can perceive,
     * because the CSS is the primary gate: `experiences.css` §4 removes the beat
     * entrance outright under `prefers-reduced-motion`, and it does so from the
     * stylesheet, before any React state exists. This flag is the SECONDARY gate,
     * for JS timelines a world's own Stage may run — and a JS timeline that has
     * not started yet cannot have moved anything in that first frame.
     *
     * Reading the real value in the initializer would have bought that frame and
     * paid for it with a permanent hydration mismatch: React keeps the SERVER
     * attributes while hydrating, so Emotion's inlined `mui-*` classes freeze
     * against the wrong branch and never heal.
     */
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        setReduceMotion(prefersReducedMotion());
        // Subscribed, not sampled: the OS setting and the in-page control are
        // both toggleable while the page is open, and a one-shot read leaves a
        // world moving for a visitor who just asked it to stop.
        return onReducedMotionChange(setReduceMotion);
    }, []);

    /**
     * The single DOM write, and its exact inverse.
     *
     * `tier` is a dependency because `tokens()` receives it — that is the whole
     * mechanism by which a world states geometry per viewport as DATA rather
     * than as a media query nobody can find later (§A.8). Re-running on a tier
     * change is therefore correct rather than merely tolerable, and it is cheap:
     * `applyExperienceTokens` clears the full key list and rewrites it inside one
     * commit, so no intermediate state is ever painted.
     *
     * The cleanup is not optional and is not defensive. The escape hatch to `/`
     * is a full document navigation in the static export, which would have
     * discarded this anyway — but a `next/link` crossing to another world, or
     * back to the dashboard, is NOT a new document. Without this, `body` would
     * carry the previous world's inline styles onto a surface that never asked
     * for them.
     */
    useEffect(() => {
        applyExperienceTokens(
            experience.id,
            experience.tokens({ ground: experience.ground, tier }),
        );
        return clearExperienceTokens;
    }, [experience, tier]);

    return (
        <ExperienceContext.Provider
            value={{ id: experience.id, experience, tier, reduceMotion }}
        >
            {children}
        </ExperienceContext.Provider>
    );
}

export default ExperienceProvider;
