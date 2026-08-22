/**
 * The single owner of every DOM write this feature makes (M32).
 *
 * Two functions, one element, one style target. `ExperienceProvider` calls the
 * first on mount and whenever the world or the tier changes, and the second from
 * its cleanup. Nothing else in `src/experiences/**` touches `document`.
 *
 * ── Why `document.body` and not `documentElement` ───────────────────────────
 * `data-skin`, `data-theme` and `data-effects` live on `<html>` and stay there.
 * The experience stamp is `body[data-experience]`, and that is load-bearing for
 * one reason: **next/font declares its `--font-*` variables on a class it puts
 * on `<body>`.** `skins.css` already documents the consequence
 * (`html[data-skin='ronin'] body { … }` — "a rule on `html` would be resolving
 * variables that are not in scope yet, and would silently fall through to the
 * fallback stack"). By stamping the attribute on the same element that owns the
 * font variables, `--xp-font-display: var(--font-<id>-display)` resolves with no
 * second mechanism.
 *
 * The secondary benefit is isolation, and it is the one that protects `/`:
 * nothing this feature writes lands on `documentElement`, so it cannot collide
 * with the three theme axes' DOM channel even in principle.
 */
import { EXPERIENCE_TOKEN_KEYS, type ExperienceTokens } from './types';

/**
 * Enter a world, or cross from one world to another.
 *
 * The rule it keeps is M29's, word for word: **no token may be left stale from a
 * previous experience.** Every key in `EXPERIENCE_TOKEN_KEYS` is REMOVED first,
 * unconditionally, and only then is the incoming map written. A key world A sets
 * and world B omits falls back to the stylesheet default rather than surviving
 * the crossing — which, on a route where crossing between worlds is the primary
 * interaction, is not a rare edge case but the main path.
 *
 * The write loop walks `EXPERIENCE_TOKEN_KEYS` rather than the incoming object's
 * own entries. The types already forbid a stray key, but iterating the same list
 * the clear pass used makes the written set a *provable* subset of the cleared
 * set — so a map that reached here from untyped code (a `JSON.parse`, an `as`
 * cast in some future call site) still cannot deposit a property nothing will
 * ever clear. The clear list and the write list being one list is the whole
 * mechanism; keeping them literally the same expression is how it stays true.
 *
 * Called from an effect only, never from a `setState` updater (M32). It touches
 * `document` unguarded and is therefore a client-only call by construction —
 * see the M41 note on `clearExperienceTokens`.
 */
export function applyExperienceTokens(id: string, tokens: ExperienceTokens): void {
    const b = document.body;

    for (const key of EXPERIENCE_TOKEN_KEYS) b.style.removeProperty(key);

    b.dataset.experience = id;

    for (const key of EXPERIENCE_TOKEN_KEYS) {
        const value = tokens[key];
        // An empty string is not a value: `setProperty(k, '')` is spelled
        // `removeProperty` and would leave a declaration that reads as authored.
        // The key was already cleared above, so skipping is the correct no-op.
        if (value) b.style.setProperty(key, value);
    }
}

/**
 * Leave the feature entirely.
 *
 * The escape hatch back to `/` is a full document navigation in the static
 * export, so the browser would have thrown this state away anyway — but a
 * client-side route change between two experience routes is *not* a new
 * document, and neither is a `next/link` back to the dashboard. So this must
 * exist, and it must be called from the provider's cleanup.
 *
 * The bar is stated as an assertion rather than an intention: after this runs,
 * `document.body.getAttribute('style')` is `null` — indistinguishable from a
 * visitor who never opened the feature. QA asserts exactly that on `/`, both
 * before any world is visited and again after every world has been.
 *
 * That is why the attribute is removed and not merely emptied. Clearing the last
 * custom property leaves `style=""` behind, and `getAttribute('style')` then
 * returns `''`, not `null` — a passing intention and a failing assertion. The
 * `length === 0` guard is what keeps this honest: if anything *else* has written
 * an inline style to `<body>`, that write is not ours and removing the whole
 * attribute would be this feature reaching outside its own surface, which is the
 * one thing the file-level invariant forbids.
 *
 * ── M41 ─────────────────────────────────────────────────────────────────────
 * Both functions read `document` directly and neither is guarded. That is
 * deliberate: a guard here would let a caller invoke this from a render path or
 * a `useState` initializer and see nothing happen, which is how a hydration bug
 * gets shipped silently. Unguarded, the first such call throws in SSR and the
 * mistake is found at build time.
 */
export function clearExperienceTokens(): void {
    const b = document.body;

    for (const key of EXPERIENCE_TOKEN_KEYS) b.style.removeProperty(key);
    delete b.dataset.experience;

    if (b.style.length === 0) b.removeAttribute('style');
}
