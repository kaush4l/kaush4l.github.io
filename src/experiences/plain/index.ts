import type { Experience } from '../types';

/**
 * The identity experience — and the engine's own acceptance test.
 *
 * `professional` is the identity *skin*: it contributes nothing on purpose, so
 * every other skin is measured against a page that is already finished. `plain`
 * is the same idea one axis over, with one extra job. It is the answer to the
 * question the charter grades this project on (non-negotiable 3): *is adding an
 * experience really a config object plus a token map?*
 *
 * So this file is written under a deliberate handicap. It declares:
 *
 *   - no `ground`      — it runs on whatever appearance the visitor already
 *                        chose, so it is invisible to the pre-paint script and
 *                        cannot flash on a cold deep link;
 *   - no `fontVariables` — it borrows the document's own faces, so it adds not
 *                        one byte to what a browser fetches;
 *   - an empty token map — every `--xp-*` custom property falls through to the
 *                        stylesheet default, which is exactly the fallback path
 *                        `applyExperienceTokens`'s unconditional clear pass
 *                        creates and which nothing else would ever exercise;
 *   - no `Stage`, no `Atmosphere` — it renders the shared `Stage` and nothing
 *                        else.
 *
 * If `plain` is a complete, readable, correctly-graded telling of the résumé at
 * all three tiers under those conditions, then the shared Stage is real, the
 * token defaults are real, and a world author is free to spend their entire
 * budget on the world. If it is not, the engine has a hole and no amount of
 * atmosphere in the other entries will cover it — which is why this ships first
 * and stays shipped rather than being deleted once the worlds land.
 *
 * It is also the honest floor for the reader. A visitor who wants the arc
 * without the argument gets one telling here that asks nothing of them.
 */
const plain = {
    id: 'plain',
    label: 'Plain',
    hint: 'The career as a straight line, told once, in order.',
    premise:
        'Seven engagements, two degrees and a shelf of projects, laid end to end in the order they '
        + 'happened. No world, no weather — the same story every other experience tells, with the '
        + 'argument taken out so you can see the shape underneath it.',

    /**
     * The site's own accent pair, not a palette of this experience's own.
     *
     * Every other entry's swatch previews a ground the card cannot otherwise
     * show. `plain` has no ground to preview — it inherits the visitor's — so a
     * bespoke pair here would be advertising a colour the world never paints.
     * The site's accents are the truthful preview: this card is telling you it
     * looks like the page you are standing on.
     */
    swatch: ['#7C3AED', '#06B6D4'],

    /**
     * No faces. `next/font` is a build-time macro and every family declared
     * costs bytes in the exported CSS whether or not a rule selects it, so the
     * experience with no typographic argument declares none. An empty array is
     * a complete answer to this field, not a stub.
     */
    fontVariables: [],

    /**
     * The empty map, and it is empty on purpose.
     *
     * `--xp-*` all resolve to their `experiences.css` defaults, which means this
     * entry is the only thing in the codebase that continuously proves those
     * defaults are legible on their own. A default nobody renders is a default
     * nobody has checked.
     */
    tokens: () => ({}),

    /**
     * Three complete tellings, never a base plus overrides.
     *
     * `flow` stays `scroll` at every tier, and that is a statement rather than a
     * gap: a rail is an argument about how a career should be read, and `plain`
     * is the entry that declines to make one. What changes across the tiers is
     * how much of each beat is in view at once and how much chapter chrome the
     * width can carry — never whether a beat exists. `compact` drops `bullets`
     * and `org`, so a beat there is a headline, a date and its tags: a shorter
     * telling of the same beat, which is the whole of charter non-negotiable 4.
     */
    telling: {
        compact: {
            flow: 'scroll',
            beatsInView: 1,
            show: ['summary', 'tags'],
            chrome: 'dots',
        },
        medium: {
            flow: 'scroll',
            beatsInView: 2,
            show: ['summary', 'bullets', 'tags', 'org'],
            chrome: 'dots',
        },
        cinema: {
            flow: 'scroll',
            beatsInView: 3,
            show: ['summary', 'bullets', 'tags', 'org', 'location'],
            chrome: 'rail',
        },
    },

    /**
     * No loop, no parallax, no glow. The shared Stage's entrance choreography is
     * CSS, so `plain` runs the feature with a JS motion budget of zero — which
     * makes it the baseline QA's rAF probe (E.2 assertion 9) is measured
     * against, and `glowStrength: 0` makes it the baseline the glow ceiling is
     * measured against too.
     */
    motion: { rafLoops: 0, parallax: false, glowStrength: 0 },

    /**
     * The null world keeps its ROUTE and loses its CARD.
     *
     * `/experience/plain/` stays reachable, because that route is the engine's
     * own acceptance test — it is the only thing in the codebase that renders
     * the `experiences.css` token defaults, and a default nobody renders is a
     * default nobody has checked — and because it is the honest floor for a
     * reader who wants the arc without the argument.
     *
     * But it must not be a sixth card. A dashboard that offers five worlds and
     * then "the one with nothing in it" is apologising for the other five, and
     * the entry whose entire purpose is to be unremarkable is the worst possible
     * thing to put in front of a visitor who will click exactly once.
     *
     * `listed: false` is the whole mechanism, and it is one boolean rather than
     * a deletion from `EXPERIENCE_LIST` because everything else in this feature
     * is derived from that array — the static route, the QA sweep, the font
     * join, the pre-paint record — and only ONE of those things should change.
     */
    listed: false,
} as const satisfies Experience;

export default plain;
