/**
 * The nine integers, and the nine branch names.
 *
 * CREATIVE-SPEC §4.2 ends with the note that halves this world's risk:
 * **branch columns are authored explicitly, not computed by a lane-assignment
 * pass.** That pass is the only genuinely risky code in the concept, it is the
 * least visible, and a wrong-looking DAG destroys the entire credibility play.
 * A hand-authored column costs nine integers and can be read back by eye.
 *
 * ── Branch names are CONTENT SLUGS ──────────────────────────────────────────
 * Every `branch` below is the filename of the entry it draws, minus the numeric
 * ordering prefix — `content/03-experience/04-oracle.md` is `oracle`. Nothing
 * here is invented, which is the same rule the node labels keep (real role
 * title, real authored period) and the same rule the hashes keep (a real hash of
 * a real beat id). This world is exact or it is not shipped.
 *
 * ── Why this is a separate file from `index.ts` ─────────────────────────────
 * `index.ts` imports `Stage.tsx` (to fill the `Stage` slot) and `Stage.tsx`
 * needs these columns. Reading them back out of `index.ts` would be an import
 * cycle, and reading them back out of `stageProps` would mean casting out of
 * `WorldProps` — type-checking a value that had already been erased. One module
 * holding the typed record, imported by both, is the shape with neither problem.
 */
import type { ChapterId } from '@/lib/story';
import type { TrunkChapter } from './dag';

export const TRUNK_BRANCHES: Readonly<Record<ChapterId, TrunkChapter>> = {
    /** One node at the top of the graph, no parents. The trunk begins. */
    origin: { branch: 'srm-university', column: 0, offshoots: true },

    /**
     * The fork. `unc-charlotte` and `take2` ride out on their own lane and merge
     * back — a master's and a side project running beside a first job, which is
     * what 2016–2018 actually was. The lead commit carries the tag `curam`: one
     * of exactly two tags in the whole graph, and the anchor the peak reaches
     * back to eight years later.
     */
    crossing: { branch: 'esystems', column: 1, offshoots: true, tag: 'curam' },

    /** Deliberately unlit (weight 0.7). A short branch, no bloom, `saturate(0.65)`. */
    trials: { branch: 'cerner', column: 1, offshoots: true, quiet: true },

    /** One oversized node: two years spent making one thing fast. */
    depth: { branch: 'oracle', column: 1, offshoots: true, emphasis: true },

    /**
     * Five hairlines that split from the lead and merge back inside one screen —
     * the visual rhyme for partitioned throughput, and the only ornamental
     * geometry in the graph. `harness` still rides out as a real offshoot.
     */
    scale: { branch: 'salesforce', column: 2, offshoots: true, fan: 5 },

    /**
     * The branch turns from a hairline to 2px, and three child commits carry the
     * three agent projects. This is also where the on-device model's fetch
     * begins in every world, so the dramatic timing and the performance decision
     * are one decision.
     */
    ignition: { branch: 'cisco', column: 3, offshoots: true, lit: true },

    /**
     * THE PEAK. It is authored here as an ordinary branch on the trunk lane and
     * nothing about it says "peak": the amber arc that lands on it is drawn
     * because the SPINE declares `echoes` on this chapter, and `dag.ts` finds
     * that field without naming the chapter. Delete `echoes` from
     * `src/lib/story.ts` and the arc disappears — which is the test that this is
     * one rendered field rather than bespoke peak code.
     */
    return: { branch: 'dhhs-nc', column: 1, offshoots: true },

    /**
     * The second deliberately quiet chapter, and it is quiet AFTER the peak on
     * purpose. The trunk resolves to a single node marked `HEAD`, drawn as a
     * ring rather than a fill — which is what HEAD is: a pointer, not a commit.
     */
    mastery: { branch: 'fidelity', column: 0, offshoots: true, quiet: true, head: true, tag: 'HEAD' },

    /**
     * `offshoots: false`, and it is the only chapter that declines them. Five
     * skill groups and three contact tiles fanning onto eight topic branches
     * would be a graph making a claim the content does not support; they are
     * commits on the trunk, which is the honest shape of a cumulative
     * `git diff --stat`.
     */
    coda: { branch: 'main', column: 0, offshoots: false },
};
