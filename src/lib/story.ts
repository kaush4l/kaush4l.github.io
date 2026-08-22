/**
 * story.ts — the résumé, re-read as a narrative.
 *
 * The default route renders `SiteSection[]` as a document: sections, cards,
 * chips. That shape is correct for a document and wrong for a story. A story
 * needs an ORDER (which beat comes first), a DURATION (how long that lasted), a
 * POSITION (how far in am I), and BULLETS AS UNITS rather than as a blob of
 * markup. None of those exist in `ContentItem`, and `ARCH-MAP` §5.4 names the
 * two real gaps precisely: bullets live only inside `contentHtml`, and `period`
 * is unparsed free text.
 *
 * ── WHY THIS IS A NEW FILE AND NOT A CHANGE TO content.ts ───────────────────
 * `content.ts` is on the default route's critical path — `page.tsx`,
 * `Layout.tsx`, `resumeContext.ts` and the JSON-LD builder all read what it
 * produces. Widening `ContentItem` to carry bullets and dates would put a
 * regression surface on the one route this project is forbidden from
 * regressing, in service of a feature that route does not use. So the parse
 * lives here instead, as a pure function over the sections the default route
 * already loads. **Delete this file and `/` does not notice.** That is the
 * whole design, and it is the same posture `stripHtml()` already takes toward
 * remark's output.
 *
 * ── WHY THERE IS NO `fs` IMPORT HERE, DELIBERATELY ──────────────────────────
 * `content.ts` imports `fs` at module scope. `Story` is a TYPE that client
 * components (`StageProps`) name, so any value-level edge from this module to
 * `content.ts` would drag Node built-ins into a client module graph. This file
 * therefore imports `contentTypes` and nothing else, re-implementing the two
 * lines of HTML flattening it needs rather than reaching for `stripHtml`.
 *
 * ── WHY THERE IS NO CLOCK HERE, DELIBERATELY ────────────────────────────────
 * Nothing in this module reads `Date.now()`. `buildStory` runs at build time
 * and its output is serialised into the static export, so a wall clock would
 * make the exported HTML a function of the build date — and if a Stage ever
 * rebuilt the story on the client, server and client would disagree, which is
 * the M41 hydration failure wearing a different hat. Where a duration genuinely
 * needs a "now" (a current engagement), the story's own furthest year stands in
 * for it; see `span` and `years` below.
 */

import type { SiteSection, ContentItem } from './contentTypes';

// ─── Periods ────────────────────────────────────────────────────────────────

/**
 * A parsed `period`.
 *
 * `period` is free text and always has been — it is authored for a human
 * reading a résumé card, and it should stay that way. Seventeen distinct shapes
 * exist in `content/` today and every one of them is correct prose. So this
 * parser is written to accept what is there rather than to demand a normal
 * form: no content file changes, and none ever has to.
 *
 * `null` from `parsePeriod` means "not a date" — `Ongoing` is the only such
 * value in the repo — and a beat with a null period is ordered by its section
 * position, never dropped. Losing a résumé entry because a string did not parse
 * is a far worse failure than showing it undated.
 */
export interface Period {
    startYear: number;
    /** 1–12. Absent for a bare-year period like `2011-2015`. */
    startMonth?: number;
    /** `null` when the engagement is current. */
    endYear: number | null;
    endMonth?: number;
    isPresent: boolean;
    /** The string as authored — always render this, never a re-format of it. */
    raw: string;
}

const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Every dash the content could plausibly contain, normalised to ASCII `-`.
 *
 * U+2010–U+2015 (hyphen, non-breaking hyphen, figure/en/em dash, horizontal
 * bar) plus U+2212 (minus). An en-dash pasted out of a word processor is not a
 * different period, and discovering that in QA — as a résumé entry silently
 * missing its end date — is exactly the kind of failure this module exists to
 * make impossible.
 */
const DASHES = /[‐-―−]/g;

/** `Aug 2017` | `April 2025` | `Sept. 2020` | `2015` → `{ year, month? }`. */
function parseEndpoint(s: string): { year: number; month?: number } | null {
    const t = s.trim();
    // Month first, so `March 2020` does not fall through to the bare-year branch.
    const m = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(t);
    if (m) {
        // First three letters only: `Aug`, `August`, `Sept` and `September` all
        // land on the same key, which is what lets one repo mix abbreviation
        // lengths inside a single string (`Aug 2018 - March 2020`) without the
        // author ever being asked to normalise their own résumé.
        const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
        return month ? { year: Number(m[2]), month } : { year: Number(m[2]) };
    }
    const y = /^(\d{4})$/.exec(t);
    return y ? { year: Number(y[1]) } : null;
}

/**
 * Parse an authored `period` string, or `null` if it does not name a date.
 *
 * Accepts, because all of these are in `content/` today: `2011-2015` (no spaces
 * around the hyphen), `2024 - Present` (spaces), `2016` (a point), `Aug 2017 -
 * Aug 2018`, `Aug 2018 - March 2020` (mixed abbreviation lengths in one
 * string), `April 2025 - Present`, and the bare sentinel `Ongoing`.
 */
export function parsePeriod(raw: string | undefined): Period | null {
    if (!raw) return null;
    const s = raw.replace(DASHES, '-').trim();
    if (!s || /^(ongoing|present|current|n\/a|tbd)$/i.test(s)) return null;

    // `2011-2015` has no spaces around its separator and `2024 - Present` does;
    // splitting on /\s*-\s*/ covers the pair without a lookahead. Month names
    // never contain a hyphen in this content, so no token can be split apart.
    const parts = s.split(/\s*-\s*/);
    const start = parseEndpoint(parts[0]);
    if (!start) return null;

    if (parts.length === 1) {
        // A single endpoint is a point, not an open range: `2016` is one year,
        // and reading it as "2016 → now" would put a one-semester project on the
        // same footing as a current job.
        return {
            startYear: start.year, startMonth: start.month,
            endYear: start.year, endMonth: start.month,
            isPresent: false, raw,
        };
    }

    const tail = parts.slice(1).join(' - ').trim();
    if (/^(present|now|current|ongoing)$/i.test(tail)) {
        return { startYear: start.year, startMonth: start.month, endYear: null, isPresent: true, raw };
    }
    const end = parseEndpoint(tail);
    if (!end) {
        // A start we understood and an end we did not. Keep the start — an entry
        // placed correctly on the timeline with an unknown end is strictly more
        // useful than an entry that vanished from it.
        return { startYear: start.year, startMonth: start.month, endYear: null, isPresent: false, raw };
    }
    return {
        startYear: start.year, startMonth: start.month,
        endYear: end.year, endMonth: end.month,
        isPresent: false, raw,
    };
}

/**
 * A year/month pair as an absolute month count, for arithmetic only.
 *
 * A missing month resolves to January rather than to the middle of the year:
 * `2011-2015` is authored as the widest honest reading of those years, and
 * splitting the difference would make `2011-2015` and `Jan 2011 - Jan 2015`
 * report different durations for what the author wrote as the same span.
 */
function absoluteMonths(year: number, month?: number): number {
    return year * 12 + ((month ?? 1) - 1);
}

// ─── Bullets ────────────────────────────────────────────────────────────────

/**
 * One achievement bullet, lifted out of `contentHtml` at build time.
 *
 * Every bullet in this repo has a lead-in — a short noun phrase before the
 * first colon that is really the beat's sub-heading — and it is authored two
 * different ways depending on the section: `- **Label:** detail` in projects and
 * education, `- Label: detail` in experience. Both are correct markdown and
 * neither is going to be rewritten to please a parser, so both are read here.
 *
 * A theme renders EITHER `html` on its own, OR `label` + `text`. Never both:
 * `html` is the untouched original and already contains the label.
 */
export interface StoryBullet {
    /** The lead-in before the first colon, when there is one. */
    label?: string;
    /** The rest, as plain text. Safe to render as a string. */
    text: string;
    /** The original inner HTML, for a theme that wants the emphasis preserved. */
    html: string;
    /**
     * Every `<strong>` run in the bullet that is not the label — in this repo
     * that is reliably the technology names. A useful signal for a world that
     * wants to surface tech without re-deriving it from `tags`.
     */
    emphasis: readonly string[];
}

/**
 * The named entities `remark-html` can emit, plus numeric refs.
 *
 * remark escapes `&` as `&#x26;`, which means a bullet reading "API Integration
 * & Testing" arrives here as markup. Flattening to text without decoding would
 * put a literal `&#x26;` on screen in every story world.
 */
const NAMED_ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

function decodeEntities(s: string): string {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X'
                ? parseInt(body.slice(2), 16)
                : parseInt(body.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    });
}

/** Flatten a fragment of remark's output to plain text. */
function toPlainText(fragment: string): string {
    return decodeEntities(fragment.replace(/<[^>]+>/g, ' '))
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * The lead-in split. Returns the label and the remaining HTML, or `null` when
 * the bullet has no lead-in at all (which is legal — it is then all `text`).
 *
 * Two authored shapes, in order:
 *   1. `<strong>Label:</strong> detail` / `<strong>Label</strong>: detail`
 *   2. `Label: detail` — the lead-in is plain text before any tag.
 *
 * Shape 2 needs a guard, because "a colon somewhere in the sentence" is not a
 * lead-in. The colon must appear in the run BEFORE the first tag, the candidate
 * must be short, and it must not carry sentence punctuation — so "API
 * Integration & Testing: Standardised…" splits and a bullet whose only colon
 * arrives mid-sentence, after a clause or after a tag, is left whole.
 */
function splitLeadIn(inner: string): { label: string; rest: string } | null {
    const strong = /^\s*<strong>([\s\S]*?)<\/strong>\s*:?\s*/.exec(inner);
    if (strong) {
        const label = decodeEntities(strong[1]).replace(/\s*:\s*$/, '').trim();
        if (label) return { label, rest: inner.slice(strong[0].length) };
    }

    const firstTag = inner.indexOf('<');
    const leading = firstTag === -1 ? inner : inner.slice(0, firstTag);
    const colon = leading.indexOf(':');
    if (colon === -1) return null;
    // Decode BEFORE the guard, never after. remark escapes `&` as `&#x26;`, so
    // "API Integration & Testing: …" arrives carrying a semicolon that a guard
    // reading raw markup would score as sentence punctuation — six real bullets
    // in `content/` lost their lead-in to exactly that. The colon index is taken
    // from the raw run because no entity in remark's output contains one.
    const label = decodeEntities(leading.slice(0, colon)).trim();
    // Sentence punctuation *followed by a space*, or ending the candidate — so
    // "Accessibility & WCAG 2.1" survives and a finished sentence does not.
    if (!label || label.length > 80 || /[.;!?](\s|$)/.test(label)) return null;
    return { label, rest: inner.slice(colon + 1) };
}

/**
 * Every bullet in a rendered entry, in document order.
 *
 * A string parse, not a DOM parse, and at BUILD time. The alternative — parsing
 * on the client — needs `DOMParser`, which does not exist during static export;
 * the beat content would be absent from the exported HTML, invisible to
 * crawlers and to a reader with JS off, and would arrive one paint after the
 * stage rendered. It is the same work done at the worst possible moment, on the
 * reader's machine, once per visit, forever.
 *
 * A regex over `<li>` is safe here specifically because the input is not
 * arbitrary HTML: it is `remark-html`'s output over this repo's markdown, whose
 * whole vocabulary is `<p> <ul> <li> <strong> <em> <a> <code>`. There are no
 * attributes on the `<li>` and no nested lists in `content/`; a nested list
 * would flatten into its parent bullet's text rather than crash, which is the
 * right failure for a résumé.
 */
export function extractBullets(contentHtml: string | undefined): StoryBullet[] {
    if (!contentHtml) return [];
    const bullets: StoryBullet[] = [];
    const li = /<li>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;
    while ((match = li.exec(contentHtml)) !== null) {
        // A loose list wraps its item content in `<p>`; a tight one does not.
        const inner = match[1].replace(/^\s*<p>([\s\S]*)<\/p>\s*$/, '$1').trim();
        if (!inner) continue;

        const split = splitLeadIn(inner);
        const rest = split ? split.rest : inner;
        const emphasis: string[] = [];
        const strongRun = /<strong>([\s\S]*?)<\/strong>/gi;
        let run: RegExpExecArray | null;
        while ((run = strongRun.exec(rest)) !== null) {
            const value = toPlainText(run[1]);
            if (value) emphasis.push(value);
        }

        bullets.push({
            label: split?.label,
            text: toPlainText(rest),
            html: inner,
            emphasis,
        });
    }
    return bullets;
}

/**
 * The entry's opening prose — the paragraph before the bullets.
 *
 * Falls back to the authored `description` (projects declare one) so a beat
 * whose body opens straight into a list still has a line of orientation.
 */
function extractSummary(item: ContentItem): string | undefined {
    const p = /<p>([\s\S]*?)<\/p>/i.exec(item.contentHtml ?? '');
    const text = p ? toPlainText(p[1]) : '';
    return text || (item.description?.trim() || undefined);
}

// ─── Beats ──────────────────────────────────────────────────────────────────

export type BeatKind = 'about' | 'work' | 'education' | 'project' | 'skills' | 'contact';

/**
 * An empty bucket for every kind, written as a literal on purpose.
 *
 * A theme that reads `byKind.education` must get an empty array rather than
 * `undefined` when a résumé happens not to have that act. Seeding from a literal
 * rather than from a `.filter()` per kind also makes the compiler the guard:
 * add a member to `BeatKind` and this object stops satisfying its own
 * annotation, which is a build failure instead of one silently missing bucket.
 */
function emptyByKind(): Record<BeatKind, StoryBeat[]> {
    return { about: [], work: [], education: [], project: [], skills: [], contact: [] };
}

/**
 * What a section's declared `layout` says about the KIND of beat it holds.
 *
 * Preferred over the section id, and derived rather than hardcoded to a folder
 * name, for the reason `buildPersonJsonLd` gives in `page.tsx`: renaming or
 * reordering a section must not break this. `timeline` is deliberately absent —
 * both `03-experience` and `05-education` declare it, so it carries no kind
 * information and the id table below decides.
 */
const LAYOUT_KIND: Partial<Record<SiteSection['layout'], BeatKind>> = {
    about: 'about',
    skills: 'skills',
    contact: 'contact',
    grid: 'project',
};

/** The fallback signal: the section's own id, matched on its stem. */
const ID_KIND: readonly (readonly [RegExp, BeatKind])[] = [
    [/education|school|academ/i, 'education'],
    [/experience|work|career|employ/i, 'work'],
    [/project|build|lab/i, 'project'],
    [/skill|stack|tool/i, 'skills'],
    [/contact|reach/i, 'contact'],
    [/about|intro|profile/i, 'about'],
];

function beatKind(section: SiteSection): BeatKind {
    const byLayout = LAYOUT_KIND[section.layout];
    if (byLayout) return byLayout;
    for (const [pattern, kind] of ID_KIND) {
        if (pattern.test(section.id)) return kind;
    }
    // A timeline of things we cannot otherwise name is a career timeline. This
    // is a default, not a guess about content: no beat is ever dropped for
    // failing to classify.
    return 'work';
}

/**
 * The technology eras, authored, ordered, first match wins.
 *
 * The arc of this résumé is legible precisely because the eras are — public
 * benefits, then healthcare and cloud infrastructure, then planet-scale data,
 * then agents, then back to benefits — and a world that wants to narrate that
 * should not each re-derive it from a tag list.
 *
 * Two rules keep this honest. **Order is the whole algorithm**: the most
 * specific domain signal is listed first, so an engagement carrying both
 * `Curam` and `Java` is a benefits engagement and not a Java one. And **a beat
 * whose tags carry no era signal gets no era** — `undefined`, never a nearest
 * guess. `era` is a bonus a theme may lean on; it is not a field a theme is
 * entitled to have populated, and inventing one would put a wrong claim about a
 * career on screen.
 */
const ERAS: readonly { era: string; tags: readonly string[] }[] = [
    { era: 'Public benefits', tags: ['curam', 'cobol', 'websphere', 'medicaid'] },
    {
        era: 'Applied AI',
        tags: [
            'langchain', 'langgraph', 'ollama', 'faiss', 'chroma', 'rag', 'openai',
            'anthropic', 'gpt-4 turbo', 'apple mlx', 'whisper', 'webgpu',
            'transformers.js', 'onnx runtime web', 'pydantic',
        ],
    },
    { era: 'Cloud infrastructure', tags: ['oci', 'aws', 'terraform', 'helm', 'graalvm', 'jenkins', 'kubernetes'] },
    { era: 'Planet-scale data', tags: ['kafka', 'bazel', 'protobuf', 'grafana', 'hive'] },
    { era: 'Web platform', tags: ['angular', 'ngrx', 'rxjs', 'reactjs', 'react', 'next.js', 'prisma', 'nextauth v5', 'htmx'] },
    { era: 'Systems', tags: ['rust', 'webassembly'] },
];

function beatEra(tags: readonly string[]): string | undefined {
    if (tags.length === 0) return undefined;
    const lower = tags.map((t) => t.toLowerCase());
    for (const { era, tags: signals } of ERAS) {
        if (lower.some((t) => signals.some((s) => t.includes(s)))) return era;
    }
    return undefined;
}

/**
 * One narrative unit. A theme renders beats; it never touches `SiteSection` or
 * `ContentItem`, and it never parses anything.
 *
 * The design rule: a beat carries FACTS and DERIVED SIGNALS, never
 * presentation. There is no `color`, no `size`, no `variant` here. The moment a
 * beat carries a presentational field, every theme has to agree on what it
 * means, and the config-driven property is gone.
 */
export interface StoryBeat {
    /** Stable and unique across the whole story: `${sectionId}:${slug}`. */
    id: string;
    kind: BeatKind;
    /** The content section this came from — for a theme that groups by act. */
    sectionId: string;

    /** 1-based position in the full ordered story. */
    chapter: number;
    /**
     * 0 → 1 across the whole story. The single most useful derived signal for a
     * narrative theme: it drives progress rails, colour ramps, and "how far in
     * am I" without a theme ever counting beats or knowing how many exist.
     */
    arcIndex: number;

    title: string;
    /** Employer, school, or client — `ContentItem.subtitle`. */
    org?: string;
    /** The staffing agency, when the engagement was contracted (`via`). */
    via?: string;
    location?: string;
    period?: Period;
    /** The authored period string. Render THIS, never a reconstruction. */
    periodLabel?: string;

    tags: readonly string[];
    bullets: readonly StoryBullet[];
    /** The leading prose paragraph of the entry, plain text. */
    summary?: string;
    link?: string;
    featured: boolean;

    // ── Derived signals ──────────────────────────────────────────────────────
    /** Whole years of duration. 0 for an undated or single-point beat. */
    years: number;
    /** Years between the story's first beat and this one — "how far in". */
    yearsElapsed: number;
    /** True while the engagement is current. */
    isPresent: boolean;
    /** The technology era, derived from `tags` against the table above. */
    era?: string;
}


// ─── The spine ──────────────────────────────────────────────────────────────

/**
 * The nine chapters, ordered, world-agnostic.
 *
 * ── Why the spine lives HERE and not in `src/experiences/` ──────────────────
 * CREATIVE-SPEC §5.1 proposes `src/experiences/spine.ts`. It is one directory
 * off, and the reason to move it is the reason this file exists at all: the
 * spine's `lead` and `also` fields are `StoryBeat.id` values, so the spine is
 * only meaningful once it has been RESOLVED against a real story. Declaring it
 * beside the resolver means the two cannot disagree and `buildStory` can hand a
 * Stage a spine whose beat indices are already looked up — a Stage never
 * searches `story.beats` for a string, which is the same "a Stage receives
 * everything and computes nothing" rule that keeps the parse at build time.
 *
 * It also keeps `src/experiences/types.ts` a pure schema file: it imports these
 * three type names from here exactly as it already imports `Story`, and there is
 * no second module in the import graph that both the schema and the story layer
 * have to agree about.
 *
 * ── Why it is a CONSTANT and not a per-world field ──────────────────────────
 * All five worlds tell the same nine chapters in the same order. If the
 * structure were config, five worlds would be five structures, the shared chrome
 * would have nothing shared to render, and the peak in §4.0 would have to be
 * re-declared five times. A world supplies COPY and TOKENS for the spine
 * (`Experience.copy`); it never supplies content and it never reorders time.
 */
export type ChapterId =
    | 'origin'
    | 'crossing'
    | 'trials'
    | 'depth'
    | 'scale'
    | 'ignition'
    | 'return'
    | 'mastery'
    | 'coda';

/**
 * The six camera moves, plus `cut`.
 *
 * Closed on purpose (CREATIVE-SPEC §2.3: "Six camera moves, no others"). A world
 * that wants a whip-pan discovers that at compile time rather than in review.
 */
export type Camera = 'push' | 'pull' | 'pan' | 'hold' | 'dissolve' | 'match' | 'cut';

/**
 * The five skill groups a chapter can grant to a HUD.
 *
 * These are the `content/02-skills` slugs with their numeric prefix stripped —
 * the one place in this module where a content filename is named. It is a union
 * rather than a `string` so a typo in a `grants` array is a build error, and the
 * membership is asserted at resolve time (`StorySpine.grantsUnknown`) so a
 * RENAMED skill file is loud instead of a HUD slot that quietly never fills.
 */
export type SkillGroupId = 'languages' | 'frameworks' | 'cloud' | 'ai' | 'tools';

/**
 * One chapter of the shared spine, as authored.
 *
 * `lead` and `also` are `StoryBeat.id` values (`${sectionId}:${slug}`), so a
 * chapter cannot reference content that does not exist without the resolver
 * noticing — see `StorySpine.missing`.
 */
export interface SpineChapter {
    id: ChapterId;
    /** The beat whose heading, dates and bullets are this chapter's spine. */
    lead: string;
    /** Beats folded into this chapter: a degree, project drawers, skill groups. */
    also: readonly string[];
    /**
     * Pacing scalar.
     *
     * Drives BOTH the chapter's `margin-block-start` and its transition
     * duration, and the first of those is the load-bearing one: **beat rhythm is
     * spacing, not time** (CREATIVE-SPEC §2.2). A weight-1.6 chapter arrives
     * after 154px of silence where a weight-0.7 chapter gets 67px, so the pacing
     * survives `prefers-reduced-motion` and print — media in which time does not
     * exist. Flat weights across nine chapters produce no peak and therefore no
     * memory; chapters 2 and 7 are deliberately light so chapter 6 can be heavy.
     */
    weight: number;
    camera: Camera;
    /** Skill groups this chapter grants to a world's HUD. */
    grants: readonly SkillGroupId[];
    /**
     * THE HIGHEST-LEVERAGE FIELD IN THE SCHEMA.
     *
     * "This chapter references that earlier one." Declared on `return` →
     * `crossing` and nowhere else, because that rhyme — IBM Curam eligibility
     * work in 2017 and again in 2025 — is the one fact this whole feature exists
     * to make legible.
     *
     * Five worlds render it five ways (a converging trace, a cherry-pick arc, a
     * match-cut, a station glyph redrawn at 3×, a coastline the arc touches) and
     * not one of them contains bespoke peak code: each reads this field, looks up
     * the chapter it names, and draws its own answer. A sixth world declares its
     * own rendering and inherits the fact for free.
     */
    echoes?: ChapterId;
}

/**
 * THE SPINE. The one hand-authored structure in the narrative layer.
 *
 * Every id below is checked against the real story at build time, and the
 * mapping is exhaustive: seven jobs + two degrees + six projects + five skill
 * groups + one bio + three contact tiles = the 24 beats `buildStory` produces
 * from `content/`. No chapter exists to fill space, and no beat is left out —
 * `StorySpine.unplaced` proves the second half of that claim rather than
 * asserting it.
 *
 * `as const satisfies readonly SpineChapter[]` for the same two reasons
 * `EXPERIENCE_LIST` uses the idiom: `satisfies` type-checks every entry, and
 * `as const` preserves the literal `id`s so `CHAPTER_IDS` below is a union of
 * literals rather than `string[]`.
 */
export const SPINE = [
    {
        id: 'origin',
        lead: 'education:01-srm-university',
        also: ['about:01-bio'],
        weight: 0.6,
        camera: 'hold',
        grants: [],
    },
    {
        id: 'crossing',
        lead: 'experience:02-esystems-inc',
        also: ['education:02-unc-charlotte', 'projects:05-take2'],
        weight: 0.9,
        camera: 'push',
        grants: ['languages'],
    },
    {
        // Deliberately quiet (CREATIVE-SPEC §4.0). A flat intensity curve across
        // nine chapters yields no peak and therefore no memory; this chapter and
        // `mastery` are what buy `return` its brightness.
        id: 'trials',
        lead: 'experience:03-cerner',
        also: [],
        weight: 0.7,
        camera: 'hold',
        grants: ['cloud', 'tools'],
    },
    {
        id: 'depth',
        lead: 'experience:04-oracle',
        also: [],
        weight: 1.0,
        camera: 'push',
        grants: ['cloud'],
    },
    {
        id: 'scale',
        lead: 'experience:05-salesforce',
        also: ['projects:09-harness'],
        weight: 1.0,
        camera: 'pan',
        grants: ['frameworks'],
    },
    {
        // The chapter where the on-device model's fetch begins, in every world:
        // this is the engagement where he learned to build agentic systems, so
        // the dramatic timing and the performance decision are one decision.
        id: 'ignition',
        lead: 'experience:06-cisco',
        also: ['projects:06-local-agents', 'projects:07-cognix', 'projects:10-document-qa'],
        weight: 1.3,
        camera: 'push',
        grants: ['ai'],
    },
    {
        // THE PEAK, and the only `echoes` in the table.
        id: 'return',
        lead: 'experience:07-dhhs-nc',
        also: [],
        weight: 1.6,
        camera: 'match',
        grants: [],
        echoes: 'crossing',
    },
    {
        // The second deliberately quiet chapter, and it is quiet AFTER the peak
        // on purpose — so the shape of the career says "the interesting thing
        // was the return", not "behold how high I got".
        id: 'mastery',
        lead: 'experience:08-fidelity',
        also: ['projects:08-resume-website'],
        weight: 1.0,
        camera: 'hold',
        grants: ['frameworks'],
    },
    {
        // The handoff, not a bow. The five skill groups resolve here and the
        // contact tiles are the last panel — small, quiet, and AFTER the reader
        // has been given something.
        id: 'coda',
        lead: 'skills:01-languages',
        also: [
            'skills:02-frameworks',
            'skills:03-cloud',
            'skills:04-ai',
            'skills:05-tools',
            'contact:01-github',
            'contact:02-linkedin',
            'contact:03-email',
        ],
        weight: 1.0,
        camera: 'dissolve',
        grants: ['languages', 'frameworks', 'cloud', 'ai', 'tools'],
    },
] as const satisfies readonly SpineChapter[];

/** The nine ids in order, derived. Never a second hand-written list. */
export const CHAPTER_IDS = SPINE.map((chapter) => chapter.id);

/**
 * One chapter of the spine, resolved against a real story.
 *
 * The extra fields are all *lookups a Stage would otherwise have to do itself*,
 * and every one of them is a lookup that is wrong to do on the reader's machine
 * once per render: an index search over 24 beats, a weight prefix-sum, and a
 * chapter-id → position map. Doing them here means a Stage's render is a `.map`
 * over this array and nothing else.
 */
export interface StorySpineChapter extends SpineChapter {
    /** 0-based position in the spine. `index + 1` is what the reader is shown. */
    index: number;
    /**
     * Indices into `Story.beats`, LEAD FIRST, then `also` in authored order.
     * Every index is valid — an id the story does not contain is dropped from
     * here and reported in `StorySpine.missing` instead, so a Stage indexing
     * this array can never read `undefined`.
     */
    beats: readonly number[];
    /** Index into `Story.beats` of `lead`, or `-1` when the lead is missing. */
    leadIndex: number;
    /**
     * 0 → 1: this chapter's share of the story measured in WEIGHT, not in beats.
     *
     * The honest fill for a progress affordance whose pacing is weighted — a bar
     * that moved by beat count would jump a third of its length on `coda` (nine
     * beats) and creep through `return` (one beat), which is the opposite of
     * what the reader is being told. CREATIVE-SPEC §2.6: "a progress affordance
     * that lies once makes everything else on the page suspect."
     */
    arcStart: number;
    arcEnd: number;
}

/**
 * The spine as resolved, plus everything the CI gate needs to prove it is total.
 *
 * ── Why the drift is REPORTED and not thrown ────────────────────────────────
 * A missing id means someone renamed or deleted a content file. Throwing here
 * would fail `bun run build` for the whole site — including `/`, which does not
 * use this module at all — turning "a résumé entry was renamed" into "the site
 * does not deploy". That trade is wrong in the same way and for the same reason
 * `parsePeriod` refuses to drop an entry it cannot parse: the loud-but-recoverable
 * answer beats the correct-but-fatal one.
 *
 * So the resolver keeps going, records exactly what it could not place, and the
 * contrast/structure gate (`scripts/xp-spine.ts`) fails the BUILD PIPELINE on a
 * non-empty `missing` or `unplaced`. The failure is still loud; it is just loud
 * in the place that can afford to be red.
 */
export interface StorySpine {
    chapters: readonly StorySpineChapter[];
    /** Beat ids the spine names that the story does not contain. */
    missing: readonly string[];
    /**
     * Beat ids the story contains that no chapter named.
     *
     * These are NOT dropped — they are appended to `coda`, because the coda is
     * already the chapter that carries everything which is not a job, and a
     * résumé entry the spine has not been told about is by definition not on the
     * career line yet. Nothing this module produces ever loses a beat; that rule
     * has no exceptions and this is the one place it could plausibly have got one.
     */
    unplaced: readonly string[];
    /** `grants` entries whose skill group is not in the story. */
    grantsUnknown: readonly SkillGroupId[];
}

/**
 * Resolve the spine against the beats just built.
 *
 * Pure, allocation-light, and deliberately written so that the ORDER of
 * `chapters` is `SPINE`'s order rather than the story's: the spine is the
 * argument about how this career should be read, and `buildStory`'s own
 * section-then-chronology order is the argument about how it should be filed.
 * They agree today; if they ever stop, the spine wins on the experience route
 * and the résumé wins on `/`, which is exactly the separation this file was
 * created to make possible.
 */
function resolveSpine(beats: readonly StoryBeat[]): StorySpine {
    const indexOf = new Map<string, number>();
    beats.forEach((beat, index) => indexOf.set(beat.id, index));

    const missing: string[] = [];
    const claimed = new Set<number>();

    const totalWeight = SPINE.reduce((sum, chapter) => sum + chapter.weight, 0) || 1;
    let running = 0;

    const chapters: StorySpineChapter[] = SPINE.map((chapter, index) => {
        const resolve = (id: string): number => {
            const found = indexOf.get(id);
            if (found === undefined) {
                missing.push(id);
                return -1;
            }
            claimed.add(found);
            return found;
        };

        const leadIndex = resolve(chapter.lead);
        const alsoIndices = chapter.also.map(resolve).filter((i) => i >= 0);
        const arcStart = running / totalWeight;
        running += chapter.weight;

        return {
            ...chapter,
            index,
            leadIndex,
            beats: leadIndex >= 0 ? [leadIndex, ...alsoIndices] : alsoIndices,
            arcStart,
            arcEnd: running / totalWeight,
        };
    });

    // Anything the spine did not name, in story order, appended to `coda`.
    const unplacedIndices = beats
        .map((_, index) => index)
        .filter((index) => !claimed.has(index));

    if (unplacedIndices.length > 0) {
        const coda = chapters[chapters.length - 1];
        chapters[chapters.length - 1] = {
            ...coda,
            beats: [...coda.beats, ...unplacedIndices],
        };
    }

    // A skill group is "in the story" when a beat's id ends in its slug — the
    // `skills:NN-<group>` shape `content/02-skills` produces. Matched on the
    // suffix rather than on the whole id so renumbering the folder does not
    // silently empty a HUD.
    const skillSlugs = new Set(
        beats.filter((beat) => beat.kind === 'skills').map((beat) => beat.id.split(':')[1]?.replace(/^\d+-/, '')),
    );
    const grantsUnknown = [
        ...new Set(SPINE.flatMap((chapter) => chapter.grants)),
    ].filter((group) => !skillSlugs.has(group));

    return {
        chapters,
        missing,
        unplaced: unplacedIndices.map((index) => beats[index].id),
        grantsUnknown,
    };
}

export interface StoryChapter {
    sectionId: string;
    title: string;
    kind: BeatKind;
    /** Indices into `Story.beats`. */
    beats: readonly number[];
}

export interface Story {
    beats: readonly StoryBeat[];
    chapters: readonly StoryChapter[];
    /**
     * The nine-chapter narrative spine, resolved against `beats`.
     *
     * `chapters` above is the résumé's own filing order — one entry per content
     * section. `spine` is the ARGUMENT: the ordered structure every world tells
     * this career in, with each chapter's beats already looked up. The two are
     * different questions and both are answered here, so no consumer has to
     * choose between "which section is this" and "which chapter is this".
     */
    spine: StorySpine;
    /**
     * Earliest and latest year anywhere in the story.
     *
     * A current engagement contributes its START year, not "this year": see the
     * no-clock note at the top of this file. `endYear` is therefore the furthest
     * year the résumé itself reaches, and it is what a present engagement's
     * duration is measured against — the story's own present.
     */
    span: { startYear: number; endYear: number };
    byKind: Readonly<Record<BeatKind, readonly StoryBeat[]>>;
}

/** A beat under construction: everything but the story-wide derived signals. */
type DraftBeat = Omit<StoryBeat, 'chapter' | 'arcIndex' | 'years' | 'yearsElapsed'>;

function draftBeat(section: SiteSection, item: ContentItem, kind: BeatKind): DraftBeat {
    const period = parsePeriod(item.period) ?? undefined;
    // `tags` and `tools` are aliases in the frontmatter contract; `coursework` is
    // deliberately NOT folded in — contentTypes is explicit that classes taken
    // are not production technologies and must never render in the same token.
    const tags = item.tags ?? item.tools ?? [];
    return {
        id: `${section.id}:${item.slug}`,
        kind,
        sectionId: section.id,
        title: item.title,
        org: item.subtitle,
        via: item.via,
        location: item.location,
        period,
        periodLabel: item.period,
        tags,
        bullets: extractBullets(item.contentHtml),
        summary: extractSummary(item),
        // Contact tiles carry their destination as `url`; everything else as
        // `link`. One field on the beat, because a theme should not have to know
        // which section it is rendering to find a href.
        link: item.link ?? item.url,
        featured: item.featured ?? false,
        isPresent: period?.isPresent ?? false,
        era: beatEra(tags),
    };
}

/**
 * Build the whole story from the sections the default route already loads.
 * Pure, synchronous, no filesystem — called from the experience route's server
 * component, so every byte of it lands in the static HTML.
 *
 * ── ORDERING, and the one place it disagrees with the résumé ────────────────
 * Beats run in content-section order first (the `NN-` prefix — the author's
 * intended act order), then chronologically WITHIN a section by parsed period
 * ascending. That second clause is the change that matters. `getSiteSections`
 * hoists `featured: true` to the front, which is right for a résumé card grid
 * and wrong for a story: a narrative that opens on the fourth job and then
 * jumps back to the first has no arc. `featured` survives as a FLAG on the
 * beat, so a theme can still emphasise those beats without letting them
 * reorder time.
 *
 * Undated entries keep the order the section gave them and follow the dated
 * ones. An entry with no period has no place on a timeline, so it cannot be
 * inserted into one — and it is never dropped, which is the rule that matters.
 * In practice no section in `content/` mixes the two: about, skills and contact
 * are entirely undated and keep their authored order exactly.
 */
export function buildStory(sections: readonly SiteSection[]): Story {
    const beats: StoryBeat[] = [];
    const chapters: StoryChapter[] = [];
    const drafts: DraftBeat[] = [];

    for (const section of sections) {
        const kind = beatKind(section);
        const sectionDrafts = section.items.map((item) => draftBeat(section, item, kind));

        const dated = sectionDrafts
            .map((beat, index) => ({ beat, index }))
            .filter((entry) => entry.beat.period !== undefined)
            .sort((a, b) => {
                const byStart =
                    absoluteMonths(a.beat.period!.startYear, a.beat.period!.startMonth) -
                    absoluteMonths(b.beat.period!.startYear, b.beat.period!.startMonth);
                // The index tie-break is not decoration: two entries can share a
                // start year, and without it the section's authored order — the
                // only remaining signal — would be at the mercy of the sort.
                return byStart !== 0 ? byStart : a.index - b.index;
            })
            .map((entry) => entry.beat);
        const undated = sectionDrafts.filter((beat) => beat.period === undefined);

        const ordered = [...dated, ...undated];
        if (ordered.length === 0) continue;

        chapters.push({
            sectionId: section.id,
            title: section.title,
            kind,
            beats: ordered.map((_, i) => drafts.length + i),
        });
        drafts.push(...ordered);
    }

    // The span, computed before the per-beat durations because a current
    // engagement is measured against it.
    const years = drafts.flatMap((beat) =>
        beat.period ? [beat.period.startYear, beat.period.endYear ?? beat.period.startYear] : [],
    );
    const span = years.length > 0
        ? { startYear: Math.min(...years), endYear: Math.max(...years) }
        : { startYear: 0, endYear: 0 };
    const originMonths = absoluteMonths(span.startYear);
    const horizonMonths = absoluteMonths(span.endYear);

    drafts.forEach((draft, index) => {
        const period = draft.period;
        const startMonths = period ? absoluteMonths(period.startYear, period.startMonth) : 0;
        const endMonths = period
            ? period.endYear === null
                ? Math.max(horizonMonths, startMonths)
                : absoluteMonths(period.endYear, period.endMonth)
            : 0;
        beats.push({
            ...draft,
            chapter: index + 1,
            // A one-beat story is at its own beginning, not at its own end;
            // dividing by `length - 1` without this guard is a NaN on the rail.
            arcIndex: drafts.length > 1 ? index / (drafts.length - 1) : 0,
            // Closed periods FLOOR — the engagement ended, and it lasted exactly
            // that many whole years. Open ones ROUND against the story horizon,
            // because flooring a current role that began nine months before the
            // résumé's furthest year reports it as "0 years" while the résumé's
            // oldest side-project reports 2. `isPresent` says it is still going;
            // `years` should not contradict that with an understatement.
            years: period
                ? Math.max(0, (period.endYear === null ? Math.round : Math.floor)((endMonths - startMonths) / 12))
                : 0,
            yearsElapsed: period ? Math.max(0, Math.floor((startMonths - originMonths) / 12)) : 0,
        });
    });

    const byKind = emptyByKind();
    for (const beat of beats) byKind[beat.kind].push(beat);

    // Last, because it indexes the finished beats. Everything it needs is
    // already derived; nothing above it depends on it.
    return { beats, chapters, span, byKind, spine: resolveSpine(beats) };
}
