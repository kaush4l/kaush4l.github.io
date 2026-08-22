/**
 * The DAG, as geometry — the only file in this world that knows what a graph
 * looks like, and the reason `Graph.tsx` is a `.map` over arrays rather than a
 * page of arithmetic.
 *
 * ── Why this is pure, synchronous and React-free ────────────────────────────
 * Every value here is a function of two things the caller already has: the
 * resolved spine (`Story.spine`, built at BUILD time and serialised into the
 * static HTML) and the nine authored integers in `trunk`'s `stageProps`. There
 * is no clock, no DOM read, no measurement, no `getTotalLength()`. That matters
 * twice over:
 *
 *   • It is what lets the whole graph render in the static export, before
 *     hydration and with JS off — the same posture `buildStory` takes toward
 *     markdown.
 *   • It is what makes the art and the content unable to disagree. Node Y
 *     positions come from `StorySpineChapter.arcStart/arcEnd`, which are the
 *     spine's own WEIGHT prefix-sums. Retune a chapter's weight in
 *     `src/lib/story.ts` and this graph re-paces itself; nobody has to remember
 *     to edit a second table. CREATIVE-SPEC §5.4.2 asks for exactly this — "all
 *     four are generated at build time from the spine" — and it is the whole
 *     reason `stageProps` carries nine integers instead of nine path strings.
 *
 * ── Why the lane columns are AUTHORED and not computed ──────────────────────
 * CREATIVE-SPEC §4.2 closes with the note that halves this world's risk: a
 * lane-assignment pass is the only genuinely risky code in the concept, it is
 * the least visible, and a wrong-looking DAG destroys the entire credibility
 * play. So the column of each of the nine branches is an integer a human wrote
 * and can read back. Everything *derived* from those integers — fork curves,
 * merge curves, offshoot lanes, the cherry-pick arc — is computed here, because
 * that arithmetic is verifiable by looking at it.
 */
import type { ChapterId, StorySpineChapter, StoryBeat } from '@/lib/story';

// ─── What a chapter authors ─────────────────────────────────────────────────

/**
 * The per-chapter half of the graph, as it authored in `branches.ts` and
 * published to the schema as `trunk.stageProps`.
 *
 * `WorldProps` is `Record<string, unknown>` by design — the shape is a world's
 * own and only that world's Stage reads it — but this world never casts back out
 * of it. `TRUNK_BRANCHES` is declared against THIS interface and then handed to
 * `stageProps`, so the config field and the thing the graph reads are one
 * object: the compiler checks the record, the schema publishes it, and there is
 * no `as` anywhere in the folder. A world that instead read `stageProps` back
 * would be type-checking a value it had already erased.
 */
// A `type` and not an `interface`, and that is load-bearing rather than
// stylistic: an interface has no implicit index signature, so it is not
// assignable to `WorldProps` (`Record<string, unknown>`) and `stageProps` would
// not typecheck. A type alias over an object literal gets one.
export type TrunkChapter = {
    /** The branch name. A CONTENT SLUG, never an invented one. */
    branch: string;
    /** The authored lane. 0 is the trunk. See the header note. */
    column: number;
    /**
     * Whether this chapter's non-lead beats fork onto their own lane and merge
     * back — a project is a commit on a topic branch off the engagement that
     * earned it, which is both true to git and true to the résumé.
     *
     * `false` on the coda alone: eight skill groups and contact tiles fanning
     * into eight topic branches would be a graph making a claim the content does
     * not support.
     */
    offshoots: boolean;
    /**
     * Extra hairline lines that split from the lead node and merge back inside
     * this chapter's own vertical range — the visual rhyme for partitioned
     * throughput, and the one purely decorative element in the graph. Declared
     * on `scale` and nowhere else.
     */
    fan?: number;
    /** 2px instead of a hairline: the branch this career turns on. */
    lit?: boolean;
    /** `saturate(0.65)` and 0.86 alpha — the two deliberately quiet chapters. */
    quiet?: boolean;
    /** An oversized lead node. `depth` only: two years on one thing. */
    emphasis?: boolean;
    /**
     * A real git tag. There are exactly two in the whole graph — `curam` on the
     * 2017 commit and `HEAD` on the current one — because a graph with a tag on
     * every node has told you nothing about which two matter.
     */
    tag?: string;
    /** Drawn as a ring rather than a fill, which is what `HEAD` is. */
    head?: boolean;
};

// ─── What this file produces ────────────────────────────────────────────────

export interface TrunkNode {
    /** The beat id, so a node and a commit card can never drift apart. */
    id: string;
    x: number;
    y: number;
    r: number;
    /** First 7 of a stable hash of the beat id. Never invented, never sequential. */
    hash: string;
    /** The REAL role title. No commit messages are authored anywhere in this world. */
    label: string;
    /** The REAL authored period string. `periodLabel`, never a reconstruction. */
    meta: string;
    /** Lead beats are the branch tip; `also` beats are commits on it. */
    lead: boolean;
    quiet: boolean;
    head: boolean;
    tag?: string;
    /** 0 → 1 down the graph. What the walked-path `calc()` compares against. */
    t: number;
}

export interface TrunkEdge {
    id: string;
    d: string;
    lit: boolean;
    quiet: boolean;
    /** Decoration rather than history: the `scale` fan. Never carries a node. */
    ornament: boolean;
}

export interface TrunkDag {
    width: number;
    height: number;
    nodes: readonly TrunkNode[];
    edges: readonly TrunkEdge[];
    /** The trunk, as one continuous path, drawn twice: dim beneath, lit over. */
    spine: string;
    /**
     * The cherry-pick. `null` only if the spine ever stops declaring `echoes`,
     * which is the point of reading the field instead of hardcoding the chapter:
     * this world contains no code that names `return` or `crossing`.
     */
    arc: string | null;
    /** Where down the graph the echo LANDS, 0 → 1. Drives the arc's draw. */
    arcAt: number;
    /** Branch names with the lane and the vertical span each occupies. */
    branches: readonly { id: ChapterId; name: string; x: number; y: number; lit: boolean }[];
}

export interface TrunkGeometry {
    /** How many lanes this tier draws. `Experience.density`, resolved. */
    lanes: number;
    /** Lane pitch in px. The SVG is rendered 1:1, so these ARE pixels. */
    lane: number;
    /** Left/right breathing room around the outermost lane. */
    margin: number;
    /** Total graph height in px. Taller than the viewport — the camera pans it. */
    height: number;
}

// ─── The hash ───────────────────────────────────────────────────────────────

/**
 * FNV-1a/32, hex, first seven characters — a real hash of the real beat id.
 *
 * Not `crypto`: this module is in a client graph and importing `node:crypto`
 * would drag a Node built-in into the browser bundle, which is the same reason
 * `story.ts` refuses to import `content.ts`. Not `Math.random`: a hash that
 * changes between two renders of the same page is a hash a reader can catch
 * changing, and the entire premise of this world is that an engineer looking
 * closely finds nothing fake.
 *
 * 28 bits over ~24 inputs is a collision probability around one in seven
 * million; `TRUNK_HASH_COLLISIONS` reports rather than throws for the reason
 * `resolveSpine` reports rather than throws — a duplicate hash is a cosmetic
 * defect and failing the build of `/` over it would be the wrong trade.
 */
export function commitHash(id: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i += 1) {
        h ^= id.charCodeAt(i);
        // The FNV prime, as the shift-and-add form, because `h * 16777619`
        // overflows a double's exact-integer range and silently rounds.
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0').slice(0, 7);
}

/** Beat ids whose hashes collide. Empty in every shipped configuration. */
export function hashCollisions(ids: readonly string[]): readonly string[] {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const id of ids) {
        const hash = commitHash(id);
        const first = seen.get(hash);
        if (first) clashes.push(`${first} / ${id} → ${hash}`);
        else seen.set(hash, id);
    }
    return clashes;
}

// ─── The build ──────────────────────────────────────────────────────────────

/** Vertical breathing room at the top and bottom of the graph, in px. */
const PAD = 56;

/**
 * Clamp an authored lane into the lanes this tier actually draws.
 *
 * At compact this collapses every branch onto lane 0, and that is not a
 * degradation — it is what `git log --graph` looks like in a narrow terminal,
 * which makes it the honest telling of this world at 390px rather than a
 * desktop graph with branches hidden. Nothing is dropped: every node, every
 * commit and the cherry-pick arc are all still drawn, on one spine.
 */
function laneX(column: number, geo: TrunkGeometry): number {
    return geo.margin + Math.min(Math.max(column, 0), geo.lanes - 1) * geo.lane;
}

/** A fork or a merge: vertical out of the parent, vertical into the child. */
function join(x0: number, y0: number, x1: number, y1: number): string {
    if (x0 === x1) return `M ${x0} ${y0} L ${x1} ${y1}`;
    const bend = Math.max(18, Math.abs(y1 - y0) * 0.42);
    return `M ${x0} ${y0} C ${x0} ${y0 + bend}, ${x1} ${y1 - bend}, ${x1} ${y1}`;
}

/**
 * The same segment, CONTINUING the pen rather than starting a new subpath.
 *
 * Drops the whole leading `M x y ` token, not just the `M`. QA-2026-08-22/T1:
 * the fan edge used to be built with `join(…).slice(1)`, which removed the
 * letter and left the two coordinates behind — so the path read
 * `… C 158 1090, 114 1100, 114 1128 158 1062 C …`: a bare pair with no command
 * in front of it. An implicit repeat of `C` needs six numbers, the parser found
 * two and then a letter, and every trunk page logged five
 * `<path> attribute d: Expected number` errors on load. It rendered *almost*
 * right, which is why reading the drawing never found it.
 *
 * A segment is only safe to hand to this when the pen is already standing on its
 * start point — which is the fan's case by construction, because the second
 * segment starts exactly where the first one ended.
 */
function continuing(segment: string): string {
    return segment.replace(/^M [^ ]+ [^ ]+ /, '');
}

/**
 * Build the whole graph.
 *
 * Reads: the resolved spine (order, weights, which beats belong to which
 * chapter), the story's beats (title, period — the only strings that ever reach
 * a node label), and the authored columns. Writes: coordinates.
 */
export function buildDag(
    chapters: readonly StorySpineChapter[],
    beats: readonly StoryBeat[],
    authored: (id: ChapterId) => TrunkChapter,
    geo: TrunkGeometry,
): TrunkDag {
    const span = geo.height - PAD * 2;
    const nodes: TrunkNode[] = [];
    const edges: TrunkEdge[] = [];
    const branches: { id: ChapterId; name: string; x: number; y: number; lit: boolean }[] = [];
    /** The lead node of each chapter, by id — what forks and merges attach to. */
    const leads = new Map<ChapterId, TrunkNode>();
    /** Each chapter's branch tip — what its offshoots merge into and the next
     *  chapter forks from. A point, not a node: a tip is a position in the graph,
     *  and there is no commit there to invent a label for. */
    const tails = new Map<ChapterId, { x: number; y: number }>();

    for (const chapter of chapters) {
        const props = authored(chapter.id);
        const x = laneX(props.column, geo);
        const own = chapter.beats.map((index) => beats[index]).filter(Boolean);
        if (own.length === 0) continue;

        // Beats spread across the chapter's WEIGHT share of the arc, inset so a
        // 1.6-weight chapter reads as room rather than as a gap the graph fell
        // through. `arcStart`/`arcEnd` are the spine's own prefix-sums, so the
        // pacing of the picture and the pacing of the prose are one number.
        const top = PAD + chapter.arcStart * span;
        const bottom = PAD + chapter.arcEnd * span;
        const step = (bottom - top) / (own.length + 1);

        const chapterNodes = own.map((beat, k) => {
            const lead = k === 0;
            // An `also` beat rides one lane out — a project is a commit on a
            // topic branch off the engagement that earned it. The coda declines
            // (`offshoots: false`): eight skill groups on eight branches would
            // be a graph making a claim the content does not support.
            const offshoot = !lead && props.offshoots;
            const y = top + step * (k + 1);
            const node: TrunkNode = {
                id: beat.id,
                x: offshoot ? laneX(props.column + 1, geo) : x,
                y,
                r: lead ? (props.emphasis ? 8.5 : 6.5) : 4.5,
                hash: commitHash(beat.id),
                // The REAL role title and the REAL authored period. This world
                // authors no commit messages, which is the whole craft signal:
                // an engineer spots a fake DAG instantly and the respect inverts.
                label: beat.title,
                meta: beat.periodLabel ?? '',
                lead,
                quiet: props.quiet === true,
                head: lead && props.head === true,
                tag: lead ? props.tag : undefined,
                t: (y - PAD) / span,
            };
            return node;
        });

        nodes.push(...chapterNodes);
        leads.set(chapter.id, chapterNodes[0]);

        /**
         * The branch TIP: where this chapter's line ends, where its offshoots
         * merge back, and where the next chapter forks from.
         *
         * It is one step BELOW the lowest node in the chapter, and that is not
         * cosmetic spacing — it is what makes every merge edge run downward. Tie
         * the merge to the last node on the trunk lane instead and a chapter
         * whose only lane node is its lead (origin, return) draws its merge
         * curving back UP the page, which reads as a graph that does not know
         * which way time runs. A tip is also what git actually merges into.
         */
        const lowest = chapterNodes.reduce((y, node) => Math.max(y, node.y), chapterNodes[0].y);
        const tip = { x, y: Math.min(lowest + step * 0.5, bottom) };
        tails.set(chapter.id, tip);

        branches.push({
            id: chapter.id,
            name: props.branch,
            x,
            y: chapterNodes[0].y,
            lit: props.lit === true,
        });

        // The branch's own line, lead to tip.
        const last = tip;
        if (last.y > chapterNodes[0].y) {
            edges.push({
                id: `${chapter.id}:line`,
                d: `M ${x} ${chapterNodes[0].y} L ${x} ${last.y}`,
                lit: props.lit === true,
                quiet: props.quiet === true,
                ornament: false,
            });
        }

        // Fork out to each offshoot and merge it back to the branch tip. Two
        // edges per project, which is what a topic branch actually is.
        for (const node of chapterNodes) {
            if (node.x === x) continue;
            edges.push({
                id: `${node.id}:fork`,
                d: join(x, chapterNodes[0].y, node.x, node.y),
                lit: false,
                quiet: props.quiet === true,
                ornament: false,
            });
            edges.push({
                id: `${node.id}:merge`,
                d: join(node.x, node.y, x, last.y),
                lit: false,
                quiet: props.quiet === true,
                ornament: false,
            });
        }

        // The fan: partitioned throughput, drawn as what it was.
        for (let i = 1; i <= (props.fan ?? 0); i += 1) {
            const fx = laneX(props.column + i, geo);
            if (fx === x) continue;
            const mid = (chapterNodes[0].y + last.y) / 2;
            edges.push({
                id: `${chapter.id}:fan-${i}`,
                d: `${join(x, chapterNodes[0].y, fx, mid)} ${continuing(join(fx, mid, x, last.y))}`,
                lit: false,
                quiet: false,
                ornament: true,
            });
        }

        // The edge in from every declared parent. `parents` is not authored —
        // the spine's ORDER is the parent relation, which is the same claim the
        // résumé makes and therefore the only one this graph is allowed to make.
        const previous = chapters[chapter.index - 1];
        const parent = previous ? tails.get(previous.id) : undefined;
        if (parent) {
            edges.push({
                id: `${chapter.id}:in`,
                d: join(parent.x, parent.y, x, chapterNodes[0].y),
                lit: props.lit === true,
                quiet: props.quiet === true,
                ornament: false,
            });
        }
    }

    // ── The echo, read from the spine rather than named here ────────────────
    // `SpineChapter.echoes` is one field, declared on `return` → `crossing` and
    // nowhere else. This world contains no code that names either chapter: it
    // looks the field up, finds the two nodes, and draws its own answer. A
    // future world declares its own rendering and inherits the fact for free.
    let arc: string | null = null;
    let arcAt = 1;
    const echoing = chapters.find((chapter) => chapter.echoes);
    const from = echoing?.echoes ? leads.get(echoing.echoes) : undefined;
    const to = echoing ? leads.get(echoing.id) : undefined;
    if (from && to) {
        // A wide bezier that leaves the 2017 commit sideways and arrives at the
        // 2025 one from the same side, so the arc reads as a REACH across the
        // graph rather than as one more branch running down it.
        const reach = Math.max(geo.lane * 1.6, 44);
        const bow = Math.max(from.x, to.x) + reach;
        arc = `M ${from.x} ${from.y} C ${bow} ${from.y + (to.y - from.y) * 0.18}, ${bow} ${to.y - (to.y - from.y) * 0.18}, ${to.x} ${to.y}`;
        arcAt = to.t;
    }

    // ── The walked path ─────────────────────────────────────────────────────
    // The trunk, and ONLY the trunk: the lead node of every chapter, in order.
    // Offshoots are deliberately excluded, because that is what the reader is
    // actually doing — you walk the trunk and you read the commits hanging off
    // it. A lit path that detoured through every project would claim the reader
    // had visited each one.
    const walk = chapters.map((chapter) => leads.get(chapter.id)).filter((n): n is TrunkNode => !!n);
    const spine = walk.length > 1
        ? `M ${walk[0].x} ${walk[0].y} ${walk.slice(1).map((n) => `L ${n.x} ${n.y}`).join(' ')}`
        : '';

    return {
        width: geo.margin * 2 + (geo.lanes - 1) * geo.lane,
        height: geo.height,
        nodes,
        edges,
        spine,
        arc,
        arcAt,
        branches,
    };
}
