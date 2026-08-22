import type { Experience, ExperienceGround } from './types';
import ghost from './ghost';
import trunk from './trunk';
import timecode from './timecode';
import overworld from './overworld';
import crossing from './crossing';
import plain from './plain';

/**
 * THE ARRAY — the one hand-maintained statement in this entire feature.
 *
 * Dashboard order is this order, and the order is an argument: put the most
 * legible world first, because it is what a hiring manager who clicks once and
 * only once will meet.
 *
 * Everything below this line is DERIVED, and that is not a stylistic
 * preference. `SKIN_LIST` in `src/skins/registry.ts` is a hand-maintained
 * *second* list beside `SKINS`, and it is the edit point that fails silently
 * (ARCH-MAP §2): a skin missing from it never appears in the menu, the code
 * compiles, the page renders, and nothing anywhere complains. Deriving the
 * record from the array — rather than writing the array beside the record —
 * makes that entire bug class unrepresentable.
 *
 * ── Why `as const satisfies readonly Experience[]` and not an annotation ────
 * The two do different jobs and this needs both:
 *
 *   - `satisfies` type-checks every entry against `Experience`, so a missing
 *     `fontVariables`, a typo'd token key or a `telling` short one tier is a
 *     compile error at the array rather than a blank region found in QA.
 *   - `as const` preserves the literal `id` types, which is the only reason
 *     `ExperienceId` below can be derived at all. A plain
 *     `: readonly Experience[]` annotation widens `id` to `string`, the derived
 *     union collapses to `string`, and every `Record<ExperienceId, …>` in the
 *     codebase silently stops guarding anything.
 *
 * ── Why all six entries are ALREADY HERE, before four of them are finished ──
 * This used to say "each of the five world authors appends one import and one
 * array slot". That was the plan and it was the one merge-conflict risk in the
 * whole build: five agents, working in parallel, all editing the same two
 * regions of the same file, with a mis-merge that silently drops an entry.
 *
 * So the entries were pre-registered instead. Every world is in the array from
 * the first day as a complete, valid, config-only record that renders through
 * the shared `Stage` — a correct telling of the résumé in that world's palette
 * and voice, with no `Stage` of its own yet. A world's author then owns
 * `src/experiences/<id>/` and **nothing else**, this file included. There is no
 * shared edit point left, which means there is no mis-merge left to catch.
 *
 * The property that made the old note true still holds and is worth keeping:
 * everything downstream is derived, so a dropped entry would fail LOUDLY — the
 * route disappears from `generateStaticParams`, the card disappears from the
 * dashboard, and the QA gate enumerates from the rendered dashboard and notices.
 *
 * ── The order is an argument ────────────────────────────────────────────────
 * Dashboard order is this order. `ghost` is first because it is the featured
 * card: it is the most legible world, it costs zero new font bytes, and its
 * central image — two lines converging — is the résumé's central fact drawn as a
 * chart that reads at 248px with no text at all. That is what a hiring manager
 * who clicks once and only once should meet.
 *
 * `plain` is LAST and is `listed: false`. It keeps its route and loses its card;
 * see the note on `EXPERIENCE_MENU` below.
 */
export const EXPERIENCE_LIST = [
    ghost,
    trunk,
    timecode,
    overworld,
    crossing,
    plain,
] as const satisfies readonly Experience[];

/**
 * The worlds a visitor is OFFERED, derived — as against the worlds that EXIST.
 *
 * `EXPERIENCE_LIST` answers "what can be reached", and everything structural
 * reads it: the static routes, the font join, the pre-paint record, the QA
 * sweep. This answers the different question "what should be on the dashboard",
 * and only the dashboard reads it.
 *
 * They differ by exactly one entry today. `plain` is the null world — the
 * engine's own acceptance test, and the only thing in the codebase that renders
 * the `experiences.css` token defaults, so it must keep `/experience/plain/`
 * forever. But a dashboard that offers five worlds and then "the one with
 * nothing in it" is apologising for the other five, and the entry whose entire
 * purpose is to be unremarkable is the worst possible thing to put in front of a
 * visitor who will click exactly once.
 *
 * ── Why a flag and not a deletion ───────────────────────────────────────────
 * Deleting `plain` from the array would remove its route, its `<title>`, its
 * pre-paint entry, its font contribution and its QA coverage — five things —
 * in order to remove one card. `listed` changes the one thing that should
 * change. The default is `true` precisely so that a new world is visible unless
 * someone deliberately says otherwise: an opt-OUT cannot be forgotten, whereas
 * an opt-in would let a finished world ship invisible.
 *
 * The interim dashboard still renders `EXPERIENCE_LIST`. Switching it to read
 * this const is a one-word edit in `src/app/experience/page.tsx`, which this
 * file's author does not own — see the report.
 */
export const EXPERIENCE_MENU: readonly Experience[] =
    (EXPERIENCE_LIST as readonly Experience[]).filter((e) => e.listed !== false);

/**
 * The id union, derived. NOT hand-maintained, and the distinction is the whole
 * point of the file.
 *
 * `SkinId` is a hand-written union today, which means the union and the table
 * are two statements of the same fact that a human keeps equal. Here the array
 * is the only statement and this type is merely what it says. Add an entry and
 * every `Record<ExperienceId, …>` in the codebase immediately demands its key —
 * fonts, pre-paint, static params, QA. The compiler becomes the checklist that
 * ARCH-MAP §2 says you currently have to have read.
 */
export type ExperienceId = (typeof EXPERIENCE_LIST)[number]['id'];

/**
 * The lookup, derived.
 *
 * `Object.fromEntries` types its result as an index signature — it cannot
 * express "the keys are exactly the ids in the array" — so the shape is stated
 * once, here, three lines under the array it is derived from. It is the only
 * assertion in this file and it is the price of the derivation; the alternative
 * is a hand-written record beside a hand-written array, which is exactly the
 * pair being removed. The assertion is narrow — it claims the KEYS, and the
 * value type is the interface every entry was already checked against by the
 * `satisfies` above, so nothing about an entry is being asserted here.
 */
export const EXPERIENCES = Object.fromEntries(
    EXPERIENCE_LIST.map((e) => [e.id, e as Experience]),
) as Record<ExperienceId, Experience>;

/**
 * The runtime guard, for the two places an id arrives as an untyped string: a
 * pathname segment read by the pre-paint script's TypeScript siblings, and a
 * route param. It reads `EXPERIENCES` rather than a separate id list for the
 * same reason everything else here does — one statement, no drift.
 *
 * `hasOwnProperty` via `Object.prototype`, not `v in EXPERIENCES`, so a visitor
 * navigating to `/experience/constructor/` gets a miss instead of a hit on the
 * prototype chain.
 */
export function isExperienceId(v: unknown): v is ExperienceId {
    return typeof v === 'string' && Object.prototype.hasOwnProperty.call(EXPERIENCES, v);
}

/**
 * The `next/font` variable class names for `<body>`, derived.
 *
 * This replaces `skinFontVariables` — the hand-joined array in `layout.tsx`
 * that is an unguarded edit point today: forget to append to it and the world
 * ships with a silently wrong face, because a missing custom property falls
 * through to the fallback stack and looks merely *plain* rather than broken.
 * Here the join is a projection of the array, so `layout.tsx` imports this one
 * const, prints it, and never learns another font name.
 *
 * It is legitimately `''` while every shipped entry declares no faces (see
 * `plain`), which is why the consumer must join it into `className` with the
 * usual whitespace-tolerant template rather than assuming a leading token.
 */
export const EXPERIENCE_FONT_VARIABLES = EXPERIENCE_LIST
    .flatMap((e) => e.fontVariables)
    .join(' ');

/**
 * What the route segment's blocking pre-paint script needs, derived.
 *
 * A projection, not a table: it cannot drift from the array because it *is* the
 * array. Contrast `SKIN_PREPAINT`, which is correct-by-`Record` but is still a
 * second hand-written declaration of a colour that also exists in the skin's
 * own `groundTokens()` — two people remembering the same hex. Here the ground
 * literal is written once, in the experience's own config, and read twice: by
 * this script and by `tokens()`. The frame that paints first and the frame
 * hydration settles on are one value by construction.
 *
 * Keyed by `string`, deliberately, and not by `ExperienceId`: the sole consumer
 * looks the id up from `location.pathname`, which is whatever the visitor typed.
 * A narrower key type would buy nothing and cost a cast at the one call site
 * that matters. Entries without a `ground` are absent, not present-and-empty —
 * the script's `if(!g)return;` is then the complete handling of "this world
 * inherits the visitor's appearance", which is the recommended default and is
 * why this record is empty today.
 *
 * The projection walks `EXPERIENCE_LIST` widened to `readonly Experience[]`
 * rather than at its literal type. `as const` erases `ground` entirely from an
 * entry that omits it, so the literal type of a groundless array has no such
 * property to read; the widening restores the optional field the interface
 * declares. It narrows nothing this projection needs — only `id` and `ground`
 * are read — and it is the same array either way.
 */
const GROUNDED: readonly Experience[] = EXPERIENCE_LIST;

export const EXPERIENCE_PREPAINT: Readonly<Record<string, ExperienceGround>> =
    Object.fromEntries(
        GROUNDED.filter(
            (e): e is Experience & { ground: ExperienceGround } => e.ground !== undefined,
        ).map((e) => [e.id, e.ground] as const),
    );

/**
 * Header and dashboard copy, single-table per M3.
 *
 * The `IconButton`, its tooltip, its `aria-label` and the dashboard's own
 * heading all read from here; none of them re-declares the word. `label` and
 * `hint` are deliberately different sentences rather than the same one twice —
 * a tooltip that repeats the accessible name adds nothing for a sighted reader
 * and is noise for everyone else.
 *
 * `href` carries its trailing slash because the export is `trailingSlash: true`
 * and `next/link` applies `basePath` on top of it; a bare `/experience` would
 * cost a redirect hop on GitHub Pages.
 */
export const EXPERIENCE_NAV = {
    href: '/experience/',
    label: 'Experiences',
    hint: 'Read this career as a story',
} as const;
