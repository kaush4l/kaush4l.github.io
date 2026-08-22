/**
 * The contrast and structure gate for `/experience/*` (CREATIVE-SPEC §2.4).
 *
 * Walk `EXPERIENCE_LIST`, compute real WCAG 2.1 ratios from each config's
 * DECLARED colours, and fail on any slot below its floor or any non-monotonic
 * ramp. Without it, world four ships a 4.1:1 muted grey and nobody notices.
 *
 * This is not theoretical. The ramp that arrived from research for `trunk`
 * (`#43584C`, `#4E6A5A`, `#5A7D68`) measured 2.12 / 2.73 / 3.53 on its own
 * deepest card against a claimed "≥ 4.9:1", and `overworld`'s researched ramp
 * rose then FELL on `--xp-surface-alt`, which would have destroyed its greyscale
 * reading. Both were caught by arithmetic, not by looking.
 *
 * ── Why it reads the CONFIG and not the rendered page ───────────────────────
 * A browser gate measures what shipped; this measures what was DECLARED, which
 * is where the mistake is made. The two are complementary and
 * `scripts/qa-experiences.sh` still owns the rendered half — it can catch a
 * world whose stylesheet overrides a token, which this cannot, and it costs a
 * browser to run, which this does not.
 *
 * Usage:
 *   bun --preload ./scripts/xp-next-shim.mjs scripts/xp-contrast.ts
 *   bun --preload ./scripts/xp-next-shim.mjs scripts/xp-contrast.ts --verbose
 *
 * The preload is required once any world declares a `next/font/google` face; it
 * is harmless before that. See `scripts/xp-next-shim.ts`.
 */
import { EXPERIENCE_LIST } from '../src/experiences/registry';
import { SPINE } from '../src/lib/story';
import type { SpineChapter } from '../src/lib/story';
import type { Experience, ExperienceTokens } from '../src/experiences/types';

/**
 * Both tables widened to their interface type before they are read.
 *
 * `as const satisfies …` is what makes `ExperienceId` and `ChapterId` derivable,
 * and its price is that it ERASES an omitted optional field from an entry's
 * literal type entirely — a world that declares no `ground` has no such property
 * to read, so `experience.ground` is a type error rather than `undefined`. This
 * is the identical widening `registry.ts` performs for `EXPERIENCE_PREPAINT`, and
 * for the identical reason: the interface restores the optional fields, and it
 * narrows nothing this file needs, because a gate reads every entry uniformly.
 */
const WORLDS: readonly Experience[] = EXPERIENCE_LIST;
const CHAPTERS: readonly SpineChapter[] = SPINE;

const verbose = process.argv.includes('--verbose');
const failures: string[] = [];
const notes: string[] = [];

// ─── WCAG 2.1 relative luminance and contrast ───────────────────────────────

/** sRGB → linear. The 0.04045 knee is the spec's, not an approximation of it. */
function channel(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * `#RGB` / `#RRGGBB` / `#RRGGBBAA` → luminance, or `null` for anything else.
 *
 * `null` rather than a throw or a zero: a token may legitimately be
 * `rgba(…)`, `transparent`, `var(--x)` or a bare number
 * (`--xp-glow-strength`). Those are not colours this gate can grade, and
 * silently grading them as black would produce confident nonsense. Unmeasurable
 * is reported, never assumed to pass — see `require()`.
 */
function luminance(hex: string | undefined): number | null {
    if (!hex) return null;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: string | undefined, b: string | undefined): number | null {
    const x = luminance(a);
    const y = luminance(b);
    if (x === null || y === null) return null;
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ─── The floors ─────────────────────────────────────────────────────────────

/**
 * Every graded slot, its floor, and what it is graded against.
 *
 * `--xp-text-muted` is 5.0 rather than 4.5 on purpose: 4.5 passes with no
 * margin, and a muted token is exactly the one a later author nudges by a shade.
 * `--xp-counter` is 3.0 and ground-only because it is non-text UI — and the
 * schema says it MAY NEVER CARRY TEXT, which is a review rule this file cannot
 * check and which is therefore restated in every world's config comment.
 */
const SLOTS: readonly { key: keyof ExperienceTokens; floor: number; grounds: readonly (keyof ExperienceTokens)[] }[] = [
    { key: '--xp-text', floor: 4.5, grounds: ['--xp-bg', '--xp-surface-alt'] },
    { key: '--xp-text-muted', floor: 5.0, grounds: ['--xp-bg', '--xp-surface-alt'] },
    { key: '--xp-link', floor: 4.5, grounds: ['--xp-bg', '--xp-surface-alt'] },
    { key: '--xp-accent', floor: 4.5, grounds: ['--xp-bg', '--xp-surface-alt'] },
    { key: '--xp-beat-peak', floor: 4.5, grounds: ['--xp-bg', '--xp-surface-alt'] },
    { key: '--xp-counter', floor: 3.0, grounds: ['--xp-bg'] },
];

const RAMP = [1, 2, 3, 4, 5, 6, 7].map((n) => `--xp-stage-${n}` as keyof ExperienceTokens);

function fail(id: string, message: string) {
    failures.push(`${id}: ${message}`);
}

for (const experience of WORLDS) {
    const id = experience.id;
    // `cinema` is the widest telling and the one the static export ships as its
    // SSR answer, so it is the tier a crawler and a JS-off reader see. Colours
    // do not vary by tier in any shipped world, but grading the tier that is
    // guaranteed to render is the honest choice if one ever does.
    const t = experience.tokens({ ground: experience.ground, tier: 'cinema' }) as ExperienceTokens;

    // A world with no declared ground inherits the visitor's appearance, which
    // this gate cannot know. That is `plain`, and it is graded by the DOCUMENT's
    // own contrast rules on `/` rather than skipped silently.
    if (!t['--xp-bg']) {
        notes.push(`${id}: inherits the visitor's appearance — no declared ground to grade.`);
        continue;
    }

    for (const slot of SLOTS) {
        for (const ground of slot.grounds) {
            const r = ratio(t[slot.key], t[ground]);
            if (r === null) {
                // Unmeasurable is reported. A gate that quietly skips what it
                // cannot parse reports green for a world it never graded.
                notes.push(`${id}: ${slot.key} on ${ground} is not a hex pair — not graded.`);
                continue;
            }
            if (r < slot.floor) {
                fail(id, `${slot.key} on ${ground} is ${r.toFixed(2)}:1, floor ${slot.floor.toFixed(1)}`);
            } else if (verbose) {
                console.log(`  ok  ${id} ${slot.key} on ${ground} ${r.toFixed(2)}`);
            }
        }
    }

    // ── The ramp: every stop >= 5.0 on BOTH grounds, so any stop may legally
    // carry a role title, and luminance-MONOTONIC, which is what makes a stage
    // readable in greyscale, in print, in forced-colors, and for the ~8% of male
    // readers with red-green deficiency.
    const stops = RAMP.map((key) => t[key]);
    if (stops.every(Boolean)) {
        let previous = -1;
        stops.forEach((stop, i) => {
            for (const ground of ['--xp-bg', '--xp-surface-alt'] as const) {
                const r = ratio(stop, t[ground]);
                if (r !== null && r < 5.0) {
                    fail(id, `--xp-stage-${i + 1} on ${ground} is ${r.toFixed(2)}:1, floor 5.0`);
                }
            }
            const l = luminance(stop);
            if (l !== null) {
                if (l <= previous) fail(id, `ramp is not luminance-monotonic at --xp-stage-${i + 1}`);
                previous = l;
            }
        });

        // The peak must not be the seventh rung wearing a different name, or the
        // reader reads the climax as "one more step".
        if (t['--xp-beat-peak']?.toLowerCase() === stops[6]?.toLowerCase()) {
            fail(id, '--xp-beat-peak equals --xp-stage-7');
        }
    } else if (stops.some(Boolean)) {
        fail(id, 'declares a partial ramp — all seven stops or none');
    }

    // ── The focus pair. One half must clear 3.0 against every fill a control
    // can land on: the ground, and the accent fill. This is a property of the
    // CONSTRUCTION (ink = ground, halo = text), so a failure here means a world
    // broke the construction rather than picked a poor colour.
    for (const [ink, fill] of [
        ['--xp-focus-ink', '--xp-accent'],
        ['--xp-focus-halo', '--xp-bg'],
    ] as const) {
        const r = ratio(t[ink], t[fill]);
        if (r !== null && r < 3.0) fail(id, `${ink} on ${fill} is ${r.toFixed(2)}:1, floor 3.0`);
    }

    // ── Copy, when a world declares it. Both rules are CREATIVE-SPEC §4.0's and
    // both are about the reader rather than about the schema: a narration longer
    // than 180 characters is a second summary nobody asked for, and "Curam"
    // appearing anywhere but chapters 1 and 6 destroys the rhyme those two
    // chapters exist to make.
    if (experience.copy) {
        let curam = 0;
        for (const chapter of CHAPTERS) {
            const entry = experience.copy[chapter.id];
            if (!entry) {
                fail(id, `copy is missing chapter "${chapter.id}"`);
                continue;
            }
            if (entry.narration.length > 180) {
                fail(id, `copy.${chapter.id}.narration is ${entry.narration.length} characters, cap 180`);
            }
            if (/curam/i.test(entry.narration)) {
                curam += 1;
                if (chapter.id !== 'crossing' && chapter.id !== 'return') {
                    fail(id, `"Curam" appears in copy.${chapter.id} — only "crossing" and "return" may say it`);
                }
            }
            if (/how can i help/i.test(entry.narration)) {
                fail(id, `the banned string "How can I help" appears in copy.${chapter.id}`);
            }
        }
        if (curam !== 2) fail(id, `"Curam" appears in ${curam} narrations; it must appear in exactly 2`);
    }

    // ── The glow ceiling. Photophobia and migraine are triggered by a bright
    // resting halo INDEPENDENTLY of motion, so this is a hard cap and not a
    // stylistic preference.
    if (experience.motion.glowStrength < 0 || experience.motion.glowStrength > 0.35) {
        fail(id, `motion.glowStrength is ${experience.motion.glowStrength}; the ceiling is 0.35`);
    }
    if (experience.motion.rafLoops > 1) fail(id, 'motion.rafLoops exceeds 1 (SKIN-CONTRACT)');
}

// ─── The spine, once — it is world-agnostic ─────────────────────────────────
//
// Resolved against the real content by `buildStory`; re-derived here from the
// same module so the gate and the renderer cannot disagree about what "total"
// means. `missing`/`unplaced` are checked by `scripts/qa-spine.ts` against a
// built story; what is checkable without the filesystem is the SHAPE.
if (CHAPTERS.filter((c) => c.echoes).length !== 1) {
    failures.push('spine: `echoes` must be declared on exactly one chapter');
}
if (CHAPTERS.find((c) => c.echoes)?.id !== 'return') {
    failures.push('spine: the one `echoes` must be on `return`');
}

for (const note of notes) console.log(`note  ${note}`);

if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length} contrast/structure violation(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
}

console.log(`\nPASS — ${WORLDS.length} experiences graded, every slot at or above floor.`);
