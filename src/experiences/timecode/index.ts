import type { Experience } from '../types';
import Atmosphere from './Atmosphere';
import Stage from './Stage';

/**
 * TIMECODE — a documentary cut of nine years, with one reused shot from 2017
 * spliced into 2025.
 *
 * An editing suite in which the FILM is what you see and never the software. A
 * warm near-black grading room; the frame occupies the upper field and one
 * timeline track sits beneath it. No chrome, no fake transport controls, no play
 * button, no letterbox, no filmstrip sprockets, no audio, ever. Just a thin
 * track with in/out marks, a playhead, and a burned-in timecode in the corner.
 *
 * No footage exists and none is faked: **the film is made of type and rules**,
 * which is exactly how title sequences by Saul Bass or Kyle Cooper are made.
 * Each shot is a composed title card of the role, the dates and one metric — set
 * large, held, then cut. This is the only world with a legitimate claim to
 * cinematic language, because cut, dissolve and match-cut are literal here
 * rather than metaphorical.
 *
 * The track is drawn to REAL duration, so a three-month contract is visibly a
 * short clip and a two-year role is a long one. The honest proportions are the
 * craft signal, and they are what make chapter 6 physically small and therefore
 * conspicuous. Nothing about that geometry is authored: `timeline.ts` derives
 * every clip from the periods `story.ts` parsed out of `content/`, so the track
 * cannot disagree with the résumé.
 *
 * ── THE FOUR-SLOT CARD, WHICH THIS WORLD LIVES OR DIES ON ───────────────────
 * eyebrow (`SEQ 03 · THE DISSOLVE`, mono caps) · role and employer (display
 * serif, one size per tier) · a 1px rule · mono meta (dates, place, the one
 * metric, tabular). It is composed once in `TitleCard.tsx` and every sequence is
 * that composition with different words — which is what makes this a film rather
 * than nine slides. It renders in TWO variants and the difference is
 * accessibility, not decoration: `card` carries the chapter's real `<h2>` and is
 * the compact telling's chapter header; `frame` is `aria-hidden` spectacle in
 * the sticky plane, duplicating a heading the flow beneath it already carries.
 *
 * ── Measured contrast, on `--xp-bg` / `--xp-surface-alt` ────────────────────
 *   text     #EDE6DA  16.04 / 13.32      muted    #9B9082   6.35 / 5.27
 *   accent   #D9A441   8.85 /  7.34      link     = accent
 *   counter  #7A93C4   6.44 (non-text, floor 3.0 — track hairlines, B-roll)
 *   peak     #E8B44A  10.48 /  8.70      focus ink on accent fill 8.85
 *   ramp     6.35 → 8.85 on bg · 5.27 → 7.34 on surface-alt, monotonic
 *
 * `--xp-beat-peak` is deliberately one step warmer and brighter than
 * `--xp-accent` so the two stay distinguishable IN THE SAME FRAME. It is
 * referenced exactly once in the whole world — the reused shot's date pair, in
 * the `timecode` block of `experiences.css` — which is what keeps amber meaning
 * "this is the peak" rather than meaning "this is a highlight".
 */
const timecode = {
    id: 'timecode',
    label: 'Timecode',
    hint: 'A documentary cut. Nine sequences, real durations, one reused shot.',
    premise:
        'Nine years cut as a documentary: nine sequences on a timeline drawn to true duration, so a '
        + 'three-month contract is visibly a short clip. No footage exists and none is faked — the '
        + 'film is made of type and rules. In sequence six the title card from sequence one returns '
        + 'in its exact original composition and its date changes from 2017 to 2025.',

    /** The grading suite's one warm light over the room it is graded in. */
    swatch: ['#D9A441', '#0A0908'],

    /**
     * The shelf card's art: the cut itself, at true duration.
     *
     * Eight clips on one lane, each drawn the length it actually ran — which is
     * why the three-month contract is a 3px sliver beside a 37px one, and why
     * the dashed link from the first title card to that sliver is the only thing
     * in the drawing that had to be explained. `2017` and `2025` are burned in as
     * seven-segment geometry rather than as `<text>`, because the dashboard loads
     * no display face and a text node would render in whatever the card inherits.
     * No `titlePath`: nothing has ever read that field.
     */
    poster: { kind: 'svg', src: '/xp/timecode.svg' },

    /**
     * A grading room is a specific darkness — warm, not neutral, and never pure
     * black, because a black frame has to be able to read as black against it.
     */
    ground: { stamp: 'dark', bg: '#0A0908' },

    /**
     * Zero new families — the second reason this world ships early.
     *
     * Display is Instrument Serif 400 + italic (`--font-accession-display`) for
     * the title cards; text is Newsreader (`--font-accession-serif`), a genuine
     * text face with real oldstyle figures for the bullets; label and data are
     * JetBrains Mono (`--font-mono`) for the burned-in timecode, the clip
     * durations and the mix strip. All three are already loaded for the skins.
     */
    fontVariables: [],

    tokens: ({ ground, tier }) => ({
        '--xp-bg': ground!.bg,
        '--xp-bg-alt': '#121010',
        '--xp-surface': '#1A1613',
        '--xp-surface-alt': '#231E19',
        '--xp-text': '#EDE6DA',
        '--xp-text-muted': '#9B9082',
        '--xp-border': 'rgba(237, 230, 218, 0.13)',
        '--xp-link': '#D9A441',

        '--xp-accent': '#D9A441',
        '--xp-accent-soft': 'rgba(217, 164, 65, 0.22)',
        // Non-text: the track hairlines and the B-roll track. Cool against a warm
        // room, so the two tracks separate without either of them being lit.
        '--xp-counter': '#7A93C4',
        // A grading room has one practical light. There is no bloom anywhere in
        // this world except the ember in the frame corner from sequence five.
        '--xp-glow-strength': '0.22',

        '--xp-focus-ink': '#0A0908',
        '--xp-focus-halo': '#EDE6DA',

        // ── The ramp: candle count. SATURATION only, so the room warms across
        // the film without any stop becoming a second lit hue. Every clip also
        // carries its ordinal and a fixed x-position, so meaning survives
        // greyscale and forced-colors, where the ramp does not.
        '--xp-stage-1': '#9B9082',
        '--xp-stage-2': '#AA9378',
        '--xp-stage-3': '#B6976A',
        '--xp-stage-4': '#C19A5A',
        '--xp-stage-5': '#CB9D4B',
        '--xp-stage-6': '#D2A147',
        '--xp-stage-7': '#D9A441',

        // The match cut, and the only place amber appears.
        '--xp-beat-peak': '#E8B44A',

        '--xp-atmos-a': 'rgba(217, 164, 65, 0.06)',
        '--xp-atmos-b': 'rgba(122, 147, 196, 0.04)',

        '--xp-font-display': 'var(--font-accession-display), Georgia, serif',
        '--xp-font-body': 'var(--font-accession-serif), Georgia, serif',
        '--xp-font-label': 'var(--font-mono), ui-monospace, monospace',
        '--xp-font-mono': 'var(--font-mono), ui-monospace, monospace',

        // Card entry is 560ms `translateY(24px → 0)`. The distance is larger than
        // the other worlds' because a title card ARRIVES; it does not fade up.
        '--xp-beat-distance': tier === 'compact' ? '16px' : '24px',
        '--xp-beat-duration': '560ms',
        '--xp-beat-stagger': '60ms',
        '--xp-beat-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',

        '--xp-rail-width': tier === 'cinema' ? '260px' : tier === 'medium' ? '148px' : '0px',
        '--xp-gutter': tier === 'compact' ? '16px' : tier === 'medium' ? '32px' : '48px',
        '--xp-measure': tier === 'compact' ? '36ch' : tier === 'medium' ? '48ch' : '66ch',
        '--xp-nav-h': tier === 'compact' ? '96px' : '0px',
        // Tracks drawn at once: the cut alone at compact, plus B-roll at medium,
        // plus the five-stem mix strip at cinema.
        '--xp-density': tier === 'compact' ? '1' : tier === 'medium' ? '2' : '3',
    }),

    Stage,
    Atmosphere,

    spineCostume: 'track',
    /** The one who decides what stays in. */
    companionAlias: 'the Editor',
    /**
     * Five audio stems that enter as the cut progresses — visible but empty
     * ahead of time, so the reader can see the mix filling. At compact they
     * appear once, complete, in the end card rather than following a reader down
     * a 390px screen that has no room for them.
     */
    hud: { kind: 'stems', dock: 'bottom-left', mobileMode: 'coda-only' },
    ramp: 'saturation',
    scaleDisplay: 1.5,
    density: { compact: 1, medium: 2, cinema: 3 },

    /**
     * The nine sequences, in the voice of a cutting room.
     *
     * `chapter` is the poetic name and it is a SUBTITLE — the rail reads company
     * names, always, because a skimmer scanning for "did he do Kafka at scale"
     * will not click "The Dissolve". Every narration is additive: it says what
     * the CUT is doing, never what the bullets beneath it already say, which is
     * the one thing that stops a narrated portfolio from being read twice and
     * believed once.
     *
     * "Curam" appears in `crossing` and `return` and nowhere else. That rhyme is
     * the whole reason this world exists, and stating it a third time would
     * make it a theme rather than a rhyme.
     */
    copy: {
        origin: {
            chapter: 'Cold Open',
            narration:
                'Two degrees, five years and one ocean apart. The track exists and the playhead has '
                + 'not started; no timecode is burned in yet.',
        },
        crossing: {
            chapter: 'First Print',
            narration:
                'The first frame of the career: Curam eligibility screens for New Jersey. This '
                + 'composition is filed here and printed once more, eight years later.',
        },
        trials: {
            chapter: 'Second Unit',
            narration:
                'Cut deliberately flat — straight cuts, no dissolve, nothing lit. Being unremarkable '
                + 'on purpose is what buys the peak its light.',
        },
        depth: {
            chapter: 'The Dissolve',
            narration:
                'One card holds on the old number and is replaced, in the identical position, by the '
                + 'new one. Here the dissolve is the measurement.',
        },
        scale: {
            chapter: 'Montage',
            narration:
                'The only rapid section in the film: five cards at a third of a second each, then a '
                + 'hold long enough to read the number they add up to.',
        },
        ignition: {
            chapter: 'The Ember',
            narration:
                'The AI stem enters the mix and a light comes up in the corner of the frame. '
                + 'Everything after this was cut on a different machine.',
        },
        return: {
            chapter: 'Reused Shot',
            narration:
                'The same Curam framework, the same eligibility rules, a different state and a '
                + 'different decade — and three months to ship it in.',
        },
        mastery: {
            chapter: 'Landing Sequence',
            narration:
                'A calm landing after the peak. No dissolve and no accent: grant software for '
                + 'nonprofits, and an accessibility pass that had to be measured.',
        },
        coda: {
            chapter: 'End Card',
            narration:
                'The mix resolves. Five stems at full level, nine years of footage behind them, and '
                + 'one model that runs on your machine rather than mine.',
        },
    },

    /**
     * The shot list — the pressure-release valve, used for exactly what §5.4.2
     * describes and nothing more.
     *
     * Every field here is something no custom property can hold: a string the
     * card burns in, an enum the Stage switches on, a budget spent twice. What
     * is NOT here is anything derivable — durations, positions, ordinals and
     * dates all come from the parsed résumé at build time, because a hand-typed
     * duration is a duration that will be wrong the first time a date moves.
     */
    stageProps: {
        origin: { kind: 'cold-open', caption: 'no timecode' },
        crossing: {
            kind: 'cut',
            metric: { to: '~40% less boilerplate' },
            // Stored composition. `return` re-prints this card, and it does so by
            // following `SpineChapter.echoes` rather than by naming this id.
            caption: 'composition A',
        },
        trials: { kind: 'quiet', metric: { to: 'thousands of events / day' } },
        depth: {
            kind: 'dissolve',
            // The only `from` in the film: the card holds on `4s` and `under
            // 100ms` replaces it in the identical position.
            metric: { from: '4s', to: 'under 100ms' },
            push: true,
        },
        scale: { kind: 'burst', metric: { to: '10M+ events / hour' } },
        ignition: { kind: 'ignition', metric: { to: '100GB+ indexed' }, push: true },
        return: { kind: 'match', metric: { to: '3-month contract' }, caption: 'reused shot' },
        mastery: { kind: 'landing', metric: { to: 'WCAG 2.1 AA' } },
        coda: {
            kind: 'end-card',
            closing: 'Nine years. Seven employers. Two of them were the same problem.',
        },
    },

    /**
     * Three tellings, one film, the same nine sequences in every one.
     *
     * COMPACT IS THE DESIGNED TELLING, not the residue of the wide one — and
     * this world survives the phone better than any other because a title card is
     * already a portrait composition. There the frame is not sticky: each
     * sequence's card is a solid card in the flow, at the top of its own chapter,
     * and the reader scrolls through a film one card at a time. Narration is
     * never overlaid on a stage at 390px, because overlaid text on a portrait
     * phone loses contrast against anything moving behind it.
     *
     * `medium` takes `rail` rather than `dots` (CREATIVE-SPEC §2.6: "medium —
     * same rail, labels always visible, rail width 148px"), which is why
     * `--xp-rail-width` is 148px at that tier. `compact` keeps `dots`, which this
     * world renders as the shared 3px top bar — drawn as the cut track, in real
     * proportions — plus the 44px chapter pill and its sheet.
     */
    telling: {
        compact: { flow: 'scroll', beatsInView: 1, show: ['summary', 'tags'], chrome: 'dots' },
        medium: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org'], chrome: 'rail' },
        cinema: { flow: 'scroll', beatsInView: 2, show: ['summary', 'bullets', 'tags', 'org', 'location'], chrome: 'rail' },
    },

    /**
     * `parallax: false`, and it is the only `false` in the set.
     *
     * A film frame does not parallax, and refusing it is the taste signal. The
     * camera vocabulary is literal and stays disciplined: cut at 0ms, dissolve at
     * 720ms linear with 240ms overlap, match-cut at 520ms behind `@supports`,
     * push-in used EXACTLY TWICE in the whole film (`stageProps.push`), and hold
     * as a first-class beat. Zero rAF, zero canvas: every effect in this world is
     * a CSS animation whose resting frame is the finished state.
     */
    motion: { rafLoops: 0, parallax: false, glowStrength: 0.22 },
} as const satisfies Experience;

export default timecode;
