'use client';

import { useMediaQuery, useTheme } from '@mui/material';
import { isPerTier, type NarrativeTier, type PerTier } from './types';

/**
 * The narrative tier for the current viewport.
 *
 * Three tellings of one story, never one telling with things hidden (charter
 * non-negotiable 4). The tier is a NARRATIVE concept, not a pixel measurement,
 * which is why it is named for what the story does at that width rather than
 * for the breakpoint that produced it:
 *
 *   compact  (< md, 900)    one beat at a time; the reader travels.
 *   medium   (md–lg)        two beats; the reader compares.
 *   cinema   (>= lg, 1200)  the whole rail; the reader surveys.
 *
 * Naming the return values `sm` / `md` / `lg` would have invited the exact
 * failure the charter forbids — treating the small one as the big one minus
 * things. A caller that asks "am I on mobile?" writes `display: none`; a caller
 * that asks "which telling is this?" looks a `TellingSpec` up.
 *
 * ── Why the queries are `up`, not `down` ────────────────────────────────────
 * Two `up` queries compose into an ordered ladder that has no unreachable
 * state: `atLeastLg` implies `atLeastMd`, so the three-way branch below is
 * total by construction and there is no fourth combination to reason about. A
 * `down('md')` / `down('lg')` pair would be the same information stated
 * backwards, and would put the SSR default on the *negative* of the value the
 * ladder actually wants — one more inversion between the reader and the answer.
 *
 * `lg` (1200) is introduced deliberately. The repo uses only `xs`/`sm`/`md`
 * today (ARCH-MAP §6), so `lg` is unclaimed and is the honest edge for "there
 * is room for a rail beside the story". No `breakpoints` key is added to
 * `createTheme`; the MUI defaults stand, so this hook and every existing
 * `useMediaQuery` on the page are measuring against one table.
 *
 * ── SSR safety (M41) ────────────────────────────────────────────────────────
 * `matchMedia` is NEVER read in a `useState` initializer, and this hook holds
 * no state at all — MUI's `useMediaQuery` with an explicit `defaultMatches` is
 * the mechanism already proven at `LayoutClient.tsx:31` (D5). Both queries
 * report their `defaultMatches` during the static render AND during the first
 * client render, so hydration cannot disagree; the real match lands on the
 * following commit.
 *
 * That one-frame delay is not a cost worth paying to avoid. Reading the true
 * width a paint earlier buys nothing a reader can perceive, and the price of
 * getting it wrong is not a flicker: React keeps the SERVER attributes while
 * hydrating, so Emotion's inlined `mui-*` classes freeze against the wrong tier
 * *permanently*. A stale frame heals on the next commit; a frozen class name
 * does not heal at all.
 *
 * `defaultMatches` is passed explicitly on both queries rather than left to the
 * library default for the same reason the ground and the pre-paint colour are
 * one literal: the SSR answer is a decision this file is making, and a decision
 * that lives in a default is a decision nobody can find later.
 *
 * ── Why the SSR tier is `cinema` ────────────────────────────────────────────
 * Both defaults are `true`, so the server and the first client frame both
 * resolve to `cinema`. That matches `LayoutClient`'s existing desktop-first
 * assumption (`down('md')` with `defaultMatches: false`, i.e. "not mobile").
 * Two components on the same page disagreeing about the SSR viewport is a
 * layout-shift bug waiting to be filed — the header would render its desktop
 * arrangement while the stage rendered its compact one — so they agree by
 * construction rather than by coincidence.
 *
 * It is also the safe direction for the one reader this feature cannot re-render
 * for: with JS off, or in a crawler, the exported HTML is the final answer, and
 * `cinema` is the telling that contains the most of the story. A compact SSR
 * default would ship the shortest telling to exactly the client that can never
 * upgrade from it.
 */
export function useViewport(): NarrativeTier {
    const theme = useTheme();
    const atLeastMd = useMediaQuery(theme.breakpoints.up('md'), { defaultMatches: true });
    const atLeastLg = useMediaQuery(theme.breakpoints.up('lg'), { defaultMatches: true });

    if (atLeastLg) return 'cinema';
    if (atLeastMd) return 'medium';
    return 'compact';
}

/**
 * Resolve a `PerTier<T>` against the current tier.
 *
 * The counterpart to `useViewport` for values rather than layout: a config field
 * may be stated once (the common case — most values do not change with the
 * viewport) or stated three times, and every consumer reads it through here so
 * neither arm needs a call-site `typeof` check. `isPerTier` lives beside the
 * type in `types.ts` so the shape and the test that narrows it cannot disagree.
 *
 * Deliberately a plain function, not a hook: it takes the tier as an argument
 * instead of calling `useViewport` itself, so it is callable from a `.map`, from
 * a render helper, and from a server component that was handed a tier — none of
 * which may call hooks. A hook here would have made per-tier data unusable in
 * the loops that actually consume it.
 */
export function forTier<T>(value: PerTier<T>, tier: NarrativeTier): T {
    return isPerTier(value) ? value[tier] : value;
}
