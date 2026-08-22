/**
 * The experience axis.
 *
 * The site already has three orthogonal theme axes (appearance / hue / skin) and
 * all three answer the same *kind* of question: how should this document LOOK.
 * An experience answers a different kind of question entirely — how should this
 * career be READ. It is not a fourth theme axis, and folding it into `Skin`
 * would have been the mistake: a skin repaints the résumé, an experience
 * replaces the act of reading it with the act of travelling through it.
 *
 * That is why this lives on its own route with its own registry rather than as
 * five more entries in `SKINS`. A skin must leave the document intact — "skins
 * own atmosphere, entrance and hero, never structure" (`src/skins/types.ts`).
 * An experience owns structure; it is allowed to *be* the structure. The two
 * contracts are incompatible, so they get two tables.
 *
 * ── INVARIANT (the experience twin of the skins.css invariant) ──────────────
 * Delete `src/app/experiences.css` and every `Experience.Stage`, and `/` must be
 * bit-identical. No experience may reach outside `body[data-experience]`, write
 * a token outside `EXPERIENCE_TOKEN_KEYS`, or leave a single byte of state
 * behind when the visitor walks back to the résumé. The default route is not a
 * shared surface; it is a surface this feature is a guest on.
 *
 * ── Why this file is DATA-FIRST ─────────────────────────────────────────────
 * Every field below is either a literal, a pure function of a literal, or a
 * component reference. There is no field whose value can only be produced by
 * reading the DOM, calling an API, or knowing what the other four experiences
 * did. That is the whole test for "config-driven": you can author a complete
 * experience in a text editor with no other file open.
 */
import type { ComponentType } from 'react';
import type {
    ChapterId,
    SkillGroupId,
    SpineChapter,
    Story,
    StorySpineChapter,
} from '@/lib/story';

/**
 * Re-exported so a world's `index.ts` imports its whole vocabulary from
 * `'../types'` and never learns that the spine lives in the story layer. That
 * boundary is the point: a world author writes copy against nine chapter ids and
 * has no reason to know how those ids get resolved against `content/`.
 */
export type { ChapterId, Camera, SkillGroupId, SpineChapter, StorySpineChapter } from '@/lib/story';
export { SPINE, CHAPTER_IDS } from '@/lib/story';

/**
 * Every custom property an experience is allowed to write.
 *
 * This is the M29 discipline, transplanted. `applyExperienceTokens` clears this
 * ENTIRE list before writing the incoming map, so a key that experience A sets
 * and experience B omits falls back to the stylesheet default instead of
 * surviving the crossing. A key not on this list is never cleared and is
 * therefore a latent cross-experience leak — the exact bug class M29 exists to
 * kill. On a route where crossing between worlds *is* the primary interaction,
 * that leak is not a rare edge case; it is the main path.
 *
 * Adding a token means adding it here. There is no other option and there is
 * deliberately no escape hatch: `ExperienceTokens` is a `Partial<Record<…>>` of
 * this tuple, so a stray key is a type error, not a leak found in QA. That is
 * the one place this list improves on `SKIN_TOKEN_KEYS`, which is a tuple whose
 * omissions still compile.
 *
 * `as const` is load-bearing twice over: it is what makes `ExperienceTokenKey` a
 * union of literals rather than `string`, and it is what makes the array
 * readonly so no caller can push a key onto the list at runtime and desync the
 * clear pass from the write pass.
 */
export const EXPERIENCE_TOKEN_KEYS = [
    // ── Ground. An experience that declares a `ground` (see `ExperienceGround`)
    // MUST own these, for the same reason a pinning skin must: the segment's
    // pre-paint script has already painted this ground before React exists, so
    // leaving the ground at the inherited value repaints the document at
    // hydration — the visible colour shift M42 was written to kill.
    //
    // `--xp-surface-alt` and `--xp-link` are here because the contrast floors
    // (CREATIVE-SPEC §2.4) MEASURE against them: every text slot is graded on
    // `--xp-bg` *and* on the deepest card a world paints, and a link colour that
    // is not a token is a link colour nobody measured.
    '--xp-bg',
    '--xp-bg-alt',
    '--xp-surface',
    '--xp-surface-alt',
    '--xp-text',
    '--xp-text-muted',
    '--xp-border',
    '--xp-link',

    // ── The lit hue, its suppressed counterpart, the non-text ordinal channel,
    // and the glow budget.
    //
    // `--xp-counter` has a 3.0:1 floor rather than 4.5:1 and it MAY NEVER CARRY
    // TEXT — it is the one channel in the vocabulary that is allowed to be
    // decorative, which is exactly why it needs a name of its own rather than
    // being borrowed from the accent. `--xp-glow-strength` is a scalar (0–1) so
    // print and reduced motion can force the whole glow budget to zero from one
    // declaration instead of hunting shadows.
    '--xp-accent',
    '--xp-accent-soft',
    '--xp-counter',
    '--xp-glow-strength',

    // ── The double focus ring, which REPLACES the shipped single
    // `--xp-focus-ring`.
    //
    // A single light ring is invisible on exactly the controls that matter most:
    // `#FFFFFF` on `#FFC53D` measures 1.58:1. The pair is the world's own ground
    // (`ink`) and its own `--xp-text` (`halo`), so one half always clears 3:1 no
    // matter what fill the control is standing on — the geometry is identical in
    // every world and the colours are the only thing that varies.
    '--xp-focus-ink',
    '--xp-focus-halo',

    // ── The timeline, as colour. THE ramp.
    //
    // Seven stops, luminance-monotonic, every one of them cleared to 5.0:1 on
    // the deepest card so ANY stop may legally carry a role title. Monotonic is
    // not a nicety: it is what makes a stage readable in greyscale, in print, in
    // forced-colors, and for the ~8% of male readers with red-green deficiency.
    '--xp-stage-1',
    '--xp-stage-2',
    '--xp-stage-3',
    '--xp-stage-4',
    '--xp-stage-5',
    '--xp-stage-6',
    '--xp-stage-7',

    // ── The peak. Referenced exactly once per world, and it must not equal
    // `--xp-stage-7`, or the peak reads as merely "the next rung".
    '--xp-beat-peak',

    // ── Atmosphere. An `Atmosphere` may draw from these two, from the ground,
    // and from `--xp-accent` at ≤ 0.35 alpha. Never from `--xp-text`: decoration
    // that reaches for the text token is how a background ends up competing with
    // the words standing on it.
    '--xp-atmos-a',
    '--xp-atmos-b',

    // ── Typographic voice. Mapped from the experience's own next/font vars.
    // `--xp-font-mono` is separate from `--xp-font-label` because every metric
    // on the page is `tabular-nums` mono in EVERY world identically (§2.5),
    // while the label face is a world's own choice.
    '--xp-font-display',
    '--xp-font-body',
    '--xp-font-label',
    '--xp-font-mono',

    // ── Narrative choreography, consumed by experiences.css and by Stage.
    '--xp-beat-distance',
    '--xp-beat-duration',
    '--xp-beat-stagger',
    '--xp-beat-ease',

    // ── Stage geometry. The values a world most often wants to retune without
    // writing a line of CSS. `--xp-nav-h` is the reserved bottom band the chat
    // FAB offsets from; `--xp-density` is "how much detail at this width",
    // stated as data so it is never a media query nobody can find.
    '--xp-rail-width',
    '--xp-gutter',
    '--xp-measure',
    '--xp-nav-h',
    '--xp-density',
] as const;

export type ExperienceTokenKey = (typeof EXPERIENCE_TOKEN_KEYS)[number];

/**
 * What an experience may write to `document.body`.
 *
 * `Partial<Record<…>>` rather than a hand-written interface so the key set and
 * the clear list are one statement. Two statements of the same fact is exactly
 * the drift `SKIN_LIST` demonstrates.
 */
export type ExperienceTokens = Partial<Record<ExperienceTokenKey, string>>;

/**
 * The narrative tier. Three tellings of one story, never one telling with
 * things hidden (charter non-negotiable 4).
 *
 * The names are narrative, not pixel measurements, because the tier is a
 * statement about what the reader is doing:
 *
 *   compact  one beat at a time; the reader travels.
 *   medium   two beats; the reader compares.
 *   cinema   the whole rail; the reader surveys.
 *
 * Naming them `sm` / `md` / `lg` would have invited exactly the failure the
 * charter forbids — treating the small one as the big one minus things.
 */
export type NarrativeTier = 'compact' | 'medium' | 'cinema';

/**
 * A value an experience may state differently per tier.
 *
 * The bare `T` arm is not a convenience — it is the honest encoding of "this
 * value does not change with the viewport", which is true of most values. A
 * shape that forced all three keys everywhere would fill configs with triplicated
 * literals, and triplicated literals are how a tier quietly drifts.
 */
export type PerTier<T> = T | Readonly<Record<NarrativeTier, T>>;

/**
 * Runtime discriminator for `PerTier<T>`, consumed by `forTier` in
 * `viewport.ts`.
 *
 * It lives here, beside the type it narrows, so the type and the test that
 * decides which arm you are on cannot disagree. The test is "all three tier keys
 * are present", not "it is an object": a `T` that happens to be an object is the
 * common case (a token map, a spec), and only a complete tier record is a
 * per-tier statement.
 */
export function isPerTier<T>(value: PerTier<T>): value is Readonly<Record<NarrativeTier, T>> {
    return (
        typeof value === 'object' &&
        value !== null &&
        'compact' in value &&
        'medium' in value &&
        'cinema' in value
    );
}

/**
 * The ground an experience paints before React exists.
 *
 * `undefined` means "inherit whatever the résumé's appearance resolved to" — the
 * honest default, and the one that costs nothing. Declaring a ground opts the
 * experience into the segment pre-paint script and REQUIRES the matching
 * `--xp-bg` in `tokens`, exactly as `groundTokens()` / `groundTheme()` require
 * the pair for a pinning skin. Setting only one of the two is a visible bug.
 *
 * `bg` is the single owner of that colour: the pre-paint script and the token
 * map both read it from here, so the frame that paints first and the frame
 * hydration settles on are one value *by construction*, not because two people
 * remembered the same hex. That is deliberately the opposite of M28's
 * triplication — the ground literals on `/` are repeated in three places because
 * nothing could be shared there; here it can be, so it is written once.
 */
export interface ExperienceGround {
    /** The `color-scheme` / native-control hint. */
    stamp: 'light' | 'dark';
    /** The document ground and the `theme-color` mobile chrome takes. */
    bg: string;
}

/**
 * What an experience's Stage is handed.
 *
 * Everything here is derived server-side at build time and serialised into the
 * static HTML — a Stage never parses, fetches, or guesses. A Stage that needed
 * to parse would be doing build-time work on the reader's machine, once per
 * visit, forever.
 */
export interface StageProps {
    /**
     * The whole story, spine included.
     *
     * CREATIVE-SPEC §5.3 proposes widening this interface with
     * `chapters: readonly SpineChapter[]` and `activeChapter: ChapterId`. It is
     * not done, and the reason is that the shipped engine already answered both
     * questions, in writing, the other way:
     *
     *   • `chapters` would be `story.spine.chapters` copied onto a second prop.
     *     A Stage that receives `story` already has it, and the duplicate is a
     *     field every world's interface carries so that nothing reads it twice.
     *   • `activeChapter` is reading-position state, and `ExperienceProvider`'s
     *     header states plainly that it holds none: *"there is no 'current
     *     chapter' here… Those belong to a Stage, because a Stage is the thing
     *     that decides what a chapter even means in its world."* Hoisting it
     *     into the frame would put a scroll observer above the component that
     *     owns the scroller, and `flow: 'paged'` makes that observer's root the
     *     Stage's own element — which the frame does not have a handle on.
     *
     * So a Stage derives its active chapter from the beats it rendered, which is
     * the only place that answer is knowable. The shared Stage does exactly that
     * and hands the result to the shared chrome.
     */
    story: Story;
    /** The resolved narrative tier for the current viewport. */
    tier: NarrativeTier;
    /** True when the visitor has asked for stillness, OS or in-page. */
    reduceMotion: boolean;
}

/**
 * Per-world copy for one chapter of the shared spine.
 *
 * The spine supplies STRUCTURE and `content/` supplies FACTS; this is the only
 * thing a world is allowed to say in its own voice about a chapter, and both
 * fields are deliberately subordinate to the real heading.
 */
export interface ChapterCopy {
    /**
     * The poetic name. A SUBTITLE — never the rail label, never the heading.
     *
     * This is the single most common fatal error of narrative portfolios: a
     * skimmer scanning for "did he do Kafka at scale" will not click
     * "IV — The Widening". The rail label is the COMPANY NAME, always, in every
     * world; this string is an 11px 0.55-alpha line revealed under it.
     */
    chapter: string;
    /**
     * ≤ 180 characters, CI-validated. Additive only — it never restates a
     * bullet, because a narration that repeats the evidence beneath it is the
     * fastest way to make a reader stop reading both.
     */
    narration: string;
}

/**
 * Which rendering of the shared progress affordance a world wears.
 *
 * The chrome is world-agnostic in POSITION, GEOMETRY, LABELS and BEHAVIOUR
 * (CREATIVE-SPEC §2.6) — a costume changes what it is drawn as and nothing else.
 * A closed union rather than a string so a typo is a build error and so the
 * shared chrome's switch is exhaustive.
 */
export type SpineCostume = 'table' | 'graph' | 'track' | 'route' | 'altimeter';

/**
 * What discipline a world's seven-stop ramp follows.
 *
 * Declared so the contrast gate knows what to ASSERT beyond monotonicity:
 * `hue` is the only ramp whose stops are all on screen simultaneously and is
 * therefore the only one allowed to travel around the wheel; the other four are
 * monochrome by construction, which is what stops a stage from becoming an
 * infographic.
 */
export type RampDiscipline = 'hue' | 'saturation' | 'chroma' | 'luminance';

/**
 * The persistent accumulating surface — the thing that grows as the reader
 * travels and is complete at the coda.
 *
 * `mobileMode` is the field that matters: `'page'` means the HUD *is* the
 * compact experience (Ghost's table is a phone-native employment history, and
 * it is the most defensible failure mode in the set), `'coda-only'` means it
 * appears once, complete, as the coda's first panel rather than following the
 * reader down a 390px screen it has no room on.
 */
export interface HudSpec {
    kind: 'table' | 'inventory' | 'stems';
    dock: 'left' | 'right' | 'bottom-left';
    mobileMode: 'page' | 'coda-only';
}

/**
 * The pressure-release valve (CREATIVE-SPEC §5.4.2).
 *
 * SVG path data, lane columns, ledger rows — data of a shape no custom property
 * can hold. It goes in here, per chapter, rather than becoming a new top-level
 * key, and that is the whole reason the top-level schema stays honest: anything
 * genuinely bespoke has a named place to live that is not the interface every
 * world shares.
 *
 * `unknown` values rather than `string | number`: the shape is the world's own
 * and only that world's Stage reads it, so a wider type here would be a lie
 * about who the audience is. A Stage narrows it once, at its own boundary.
 */
export type WorldProps = Readonly<Record<string, unknown>>;

export interface Experience {
    /**
     * URL segment and DOM stamp. Lowercase, hyphen-free, stable forever — it is
     * in a link a hiring manager may have forwarded. Renaming one is a redirect
     * problem, not a refactor.
     */
    id: string;

    /** Dashboard copy. Single source — never re-declared at a call site (M3). */
    label: string;
    /** One line, in the voice of the world. Promises the IDEA, not the effects. */
    hint: string;
    /**
     * A longer paragraph for the dashboard card's expanded state. Still copy,
     * still single-source: the card, the `<title>`, and the route's
     * `description` metadata all read this field.
     */
    premise: string;
    /** Two colours the dashboard card previews itself with, as SkinMenu does. */
    swatch: readonly [string, string];

    /**
     * The ground this world paints before React exists. Optional — see
     * `ExperienceGround`. Omit it and the experience runs on the visitor's own
     * appearance, which is the right answer for any world whose argument is not
     * a specific darkness, and is the recommended default.
     */
    ground?: ExperienceGround;

    /**
     * The custom-property map.
     *
     * Receives the resolved ground so a world can derive from a colour it
     * declared once, and the tier so it can state geometry per viewport as DATA
     * rather than as a media query nobody can find later. The rule the whole
     * feature is graded on: **if it is a number, it is a token; if it is a
     * structure, it is `telling`.** Media queries in `experiences.css` are for
     * nothing but `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`
     * and `print`.
     */
    tokens(ctx: { ground?: ExperienceGround; tier: NarrativeTier }): ExperienceTokens;

    /**
     * The next/font variable class names this experience needs on `<body>`.
     *
     * This is the one field whose VALUE cannot be config, and it is worth saying
     * why plainly rather than pretending: `next/font/google` is a build-time
     * macro. It must be called at module scope with literal options so the
     * bundler can see the family, the weights and the subsets and emit the
     * `@font-face` rules. `Google_Font(someConfigObject)` does not compile.
     *
     * So the CALL lives in the experience's own `index.ts` — a file the author is
     * writing anyway — and only its `.variable` string crosses this boundary.
     * `registry.ts` joins every entry's string, `layout.tsx` prints the join. The
     * owner of `layout.tsx` never edits it again, and an experience that forgets
     * this field fails to typecheck rather than shipping with a silently wrong
     * face — which is precisely how the `skinFontVariables` join fails today.
     *
     * Every face MUST be `preload: false` + latin subset, for the reason
     * documented above the skin faces in `layout.tsx`: nine extra families are
     * affordable only because a browser fetches a face when a rule selects it,
     * and no rule selects another world's face.
     */
    fontVariables: readonly string[];

    /**
     * The stage. `dynamic(() => import('./Stage'), { ssr: false })` for anything
     * with a motion timeline, statically imported otherwise — the E1 rule from
     * `HeroSwitcher`, unchanged.
     *
     * Omit it and the experience renders the shared `Stage`, which is a complete,
     * readable, correctly-graded telling on its own. `Skin.SectionRenderer` is
     * declared and never consumed; that is the warning this field is written
     * against — an optional component slot with no shipped default behind it is a
     * slot nobody can use. An experience whose only content is a config object
     * and a token map is a valid, shippable experience; that is the point.
     */
    Stage?: ComponentType<StageProps>;

    /**
     * A fixed, pointer-transparent, `z-index: -1`, `aria-hidden`, print-hidden
     * layer, mounted by the frame — the same contract and the same wrapper rules
     * as `SkinAtmosphere`. An experience supplies paint; it does not get to
     * choose its own stacking context.
     */
    Atmosphere?: ComponentType<{ tier: NarrativeTier }>;

    /**
     * The third and last component slot: the dashboard card's art.
     *
     * Exactly three slots exist — `Stage`, `Atmosphere`, `Poster` — and that is
     * a ceiling rather than a coincidence. The creative concepts proposed five
     * stage components per world (twenty-five in total); that was rejected in
     * favour of ONE Stage per world switching on per-beat DATA (`camera`,
     * `echoes`, `stageProps`), which is strictly more config-driven and twenty
     * fewer components.
     *
     * Omitted, the card renders `poster.src` inline. No world in v1 declares
     * this — all five posters are static SVG — and the slot exists so that the
     * first world which genuinely needs a live preview does not have to invent
     * the seam under deadline. It is declared WITH a shipped default behind it,
     * which is the one thing `Skin.SectionRenderer` failed to do.
     */
    Poster?: ComponentType;

    /**
     * The dashboard card's art, and the world's title as an SVG path.
     *
     * A path rather than a live text node so the card previews a world's display
     * face without loading it: nine families that are `preload: false` are
     * affordable only because no rule selects them until a visitor enters that
     * world, and a dashboard that set five headings in five faces would fetch
     * all five to render one page. Optional — a world with no poster renders its
     * `swatch` and its copy, which is what the interim dashboard already does.
     */
    poster?: {
        kind: 'svg';
        /** Inline-able SVG under `public/`, ≤ 16KB. Read by the card. */
        src: string;
        /**
         * The world's name as outlines, so a card could set a world's display
         * face without loading it.
         *
         * OPTIONAL, and the reason is worth recording. It shipped REQUIRED, and
         * nothing has ever read it — `grep titlePath src/` finds this
         * declaration and one comment. A required field with no consumer is not
         * a stricter contract, it is a toll: authoring outline data by hand
         * needs a font pipeline this project does not have, so the cost of
         * declaring a poster at all was a field nobody would render. All five
         * worlds paid it by shipping no poster, and the shelf they produced
         * showed the same generated drawing five times — which is precisely the
         * one thing a SELECTION surface may not do.
         *
         * The card renders the world's name from `label` as live text in the
         * dashboard's own neutral face, which is what it was already doing. When
         * a card genuinely wants a world's display face in its art, that art is
         * an `<svg>` file which can carry its own outlines inline — no registry
         * field required. Until something reads it, it stays optional.
         */
        titlePath?: string;
    };

    /**
     * The nine chapter names and narrations, in this world's voice.
     *
     * `Record<ChapterId, …>` and not `Partial<…>`: the compiler demands all nine
     * keys the moment a world declares one, which is strictly better than the
     * CI check CREATIVE-SPEC §5.1 asks for — a world cannot ship eight chapters
     * of copy and one silent gap. The ≤180-character rule is the half a type
     * cannot express and stays with the gate.
     *
     * Optional at the top level, because a world with no copy is a real answer
     * rather than an unfinished one: the rail still reads company names, the
     * headings still read role and dates, and `plain` declines to narrate on
     * purpose.
     */
    copy?: Readonly<Record<ChapterId, ChapterCopy>>;

    /**
     * Which rendering of the shared progress affordance this world wears.
     * Omitted means the shared rail, which is a complete affordance on its own.
     */
    spineCostume?: SpineCostume;

    /**
     * What the on-device model is called in this world.
     *
     * A name, never a personality: the companion has one unprompted line in its
     * whole arc and the string "How can I help" is banned repo-wide, because that
     * one sentence converts a genuinely rare differentiator — a model running on
     * the reader's own machine — into a SaaS template.
     */
    companionAlias?: string;

    /** The persistent accumulating surface, if this world has one. */
    hud?: HudSpec;

    /**
     * The discipline this world's ramp follows, for the contrast gate.
     * A world that declares no `--xp-stage-*` tokens declares no ramp.
     */
    ramp?: RampDiscipline;

    /**
     * The display ladder's ratio.
     *
     * The BODY ladder is fixed at 1.200 for every world — a résumé bullet is a
     * résumé bullet — and only the display ladder above the 28px body ceiling is
     * a world's to argue with. A flat ladder (Trunk's 1.125) is what makes a
     * machine read as a machine; a wide one (1.5) is what makes a title card.
     * Defaults to 1.5, the value four of the five worlds want.
     */
    scaleDisplay?: number;

    /**
     * How much detail this world draws at this width — map segments, annotation
     * columns, ledger columns.
     *
     * `PerTier<number>` and never a media query: complexity that scales with the
     * viewport is a NUMBER, and the rule the whole feature is graded on is that
     * a number is a token. It is published to `--xp-density` by the world's own
     * `tokens()`; this field is the same value in a form a Stage can read
     * without parsing a computed style.
     */
    density?: PerTier<number>;

    /**
     * The pressure-release valve: per-chapter data of a shape no token can hold.
     * See `WorldProps`. Every one of the nine keys is required once declared,
     * for the same reason `copy` requires all nine — a chapter that silently has
     * no stage data is a chapter that silently renders nothing.
     */
    stageProps?: Readonly<Record<ChapterId, WorldProps>>;

    /**
     * Whether this world appears on the dashboard.
     *
     * Defaults to `true`; only `plain` declares `false`. See the note on
     * `EXPERIENCE_MENU` in `registry.ts` for the whole argument — briefly: the
     * null world has to keep its ROUTE (it is the engine's acceptance test and
     * the honest floor for a reader who wants the arc without the argument) and
     * must not have a CARD (it is not a sixth theme, and offering "the one with
     * nothing in it" beside five worlds is an apology, not a choice).
     *
     * A boolean rather than deleting `plain` from the array, because everything
     * in this feature is derived from that array: the route, the QA sweep, the
     * font join and the pre-paint record all vanish with the entry, and the
     * thing being suppressed is one card.
     */
    listed?: boolean;

    /**
     * How this world tells itself at each viewport. NOT a hint — the Stage reads
     * it.
     *
     * Three complete statements, never a base plus overrides. That is the same
     * argument M25 makes about light mode ("light is not dark with the lights on
     * and is not derived from dark by ternary… branching is done by *looking a
     * value up*"). A base-plus-override shape would make compact a degraded
     * cinema, which is exactly the failure charter non-negotiable 4 forbids.
     */
    telling: Readonly<Record<NarrativeTier, TellingSpec>>;

    /**
     * The motion budget, honoured by the shared Stage and asserted by QA.
     *
     * `rafLoops` may never exceed 1 (SKIN-CONTRACT). Under reduced motion the
     * frame forces every field to its still value, so an experience never has to
     * remember to check — and because the frame stills rather than unmounts,
     * nothing can be HIDDEN by the still, only stopped.
     */
    motion: {
        rafLoops: 0 | 1;
        /** Beat entrance is stilled, never hidden, under reduced motion. */
        parallax: boolean;
        /**
         * The glow budget, 0–1, published to `--xp-glow-strength`.
         *
         * REQUIRED, and required rather than optional on purpose: a bright
         * resting halo is a documented discomfort trigger for photophobia and
         * migraine INDEPENDENTLY of motion (M19), and glow is the single
         * effect most likely to be added late by someone who is not thinking
         * about that. A required field makes every world state a number it can
         * be held to; `0` is a complete and common answer.
         *
         * Forced to 0 in print, under `prefers-reduced-motion`, and under
         * `forced-colors`, from `experiences.css` — a world never has to
         * remember.
         */
        glowStrength: number;
    };
}

/** What one viewport's telling of the story looks like, as data. */
export interface TellingSpec {
    /** Vertical scroll, horizontal rail, or discrete paged chapters. */
    flow: 'scroll' | 'rail' | 'paged';
    /** How many beats are on screen at once before the reader must move. */
    beatsInView: number;
    /**
     * Which optional beat parts survive at this tier.
     *
     * This is the enforcement point for charter non-negotiable 4, and it is
     * enforced by what the field CANNOT express: there is no `hide` list. A tier
     * NEVER drops a beat — it re-tells it. Omitting `bullets` at `compact` means
     * the beat is a headline, a date and its tags; it does not mean the beat is
     * gone. QA asserts the beat count is identical at all three viewports, and
     * `display: none` on a beat is a review-blocking defect.
     */
    show: readonly ('summary' | 'bullets' | 'tags' | 'location' | 'org')[];
    /** Chapter markers: a full rail, a dot strip, or nothing. */
    chrome: 'rail' | 'dots' | 'none';
}
