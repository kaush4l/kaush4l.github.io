import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { RADIUS } from '@/theme/ThemeProvider';
import { getSiteSections } from '@/lib/content';
import { buildStory, SPINE, type SpineChapter, type Story } from '@/lib/story';
import { EXPERIENCE_MENU, EXPERIENCE_NAV } from '@/experiences/registry';
import type { Experience } from '@/experiences/types';
import { DashboardCard } from '@/experiences/DashboardCard';

/**
 * The Experience Dashboard — the call sheet the header icon opens.
 *
 * ── Why this route DOES use `<Layout>` and the stage routes do not ─────────
 * The dashboard is a browsing surface. The header controls, the chat and the
 * résumé download all still make sense here, and a visitor who opened it out of
 * curiosity should be one click from the document. The stage routes are the
 * opposite case: a 260px permanent drawer of résumé sections beside a cinematic
 * telling is the single fastest way to make this feature read as a toy, and it
 * would fight every world for horizontal space at exactly the breakpoints the
 * responsive strategy cares about. One shell, two answers, both argued.
 *
 * The sidebar's `/#<id>` hash links keep working from here with no change:
 * `getNav()` emits absolute hrefs and `next/link` applies `basePath`, so they
 * are ordinary cross-document links that land on `/` at the right section. The
 * scroll-spy renders nothing here because this page has no `section[id]`, so
 * nothing is highlighted and no `aria-current` is emitted — which is the honest
 * state, since the reader is not in any résumé section. Nothing to fix.
 *
 * ── THE DASHBOARD IS DELIBERATELY NOT A SIXTH WORLD ────────────────────────
 * CREATIVE-SPEC §3, and it is the load-bearing decision on this page. A picker
 * that is itself styled competes with the five things it is selling and becomes
 * the thing that has to load first. So: neutral chrome, five posters, five
 * links, and nothing else. Concretely, three properties are maintained here and
 * each one is a way this page could have gone wrong:
 *
 *   1. It sets no `data-experience`, so not one rule from §1–§7 of
 *      `experiences.css` applies. Its own paint is the delimited `dashboard`
 *      block at the bottom of that file, scoped by a class that exists nowhere
 *      else in the codebase.
 *   2. It loads no display face. Each world's `poster.titlePath` exists so a
 *      card can preview a face as OUTLINES; until a world declares one, the
 *      title is set in the neutral voice. Either way no rule on this page
 *      selects a world's family, so none of the nine `preload: false` faces is
 *      ever fetched to draw a card.
 *   3. It ships no world code to the browser. The five `Experience` records are
 *      read here, on the server, and what crosses into the client bundle is
 *      five sets of strings — see `DashboardCard`'s note on why its props are
 *      all primitives.
 *
 * ── The stamp is load-bearing ──────────────────────────────────────────────
 * Each slot carries `data-experience-id`. `scripts/qa-experiences.sh` enumerates
 * the worlds it sweeps from THIS rendered list rather than from a bash array,
 * and clicks `[data-experience-id='<id>'] a` to cross between worlds — so the
 * stamp must stay on an ANCESTOR of the link, and a card that fails to render is
 * a loud failure rather than a silent gap in coverage.
 */

// ─── The honest meta row ────────────────────────────────────────────────────

/**
 * Words per minute, for the "~N min" figure.
 *
 * 200 is the conservative end of the usual 200–250 range for prose read for
 * comprehension rather than skimmed, and conservative is the right direction:
 * a card that promises four minutes and takes six has lied to the one visitor
 * who was counting.
 */
const WPM = 200;

/**
 * How long the whole telling takes to read, in minutes, derived from the story.
 *
 * Counted from the résumé's own words — headings, orgs, summaries and bullets —
 * because that is what a reader actually reads. The count is deliberately the
 * same for every card: all five worlds tell the SAME nine chapters (the spine
 * is a constant, not per-world config), so a per-world figure would be five
 * statements of one fact, and four of them would eventually be wrong.
 */
function minutesToRead(story: Story): number {
    const words = story.beats.reduce((total, beat) => {
        const text = [
            beat.title,
            beat.org ?? '',
            beat.summary ?? '',
            ...beat.bullets.map((bullet) => `${bullet.label ?? ''} ${bullet.text}`),
        ].join(' ');
        return total + text.split(/\s+/).filter(Boolean).length;
    }, 0);
    return Math.max(1, Math.round(words / WPM));
}

/**
 * The world's motion budget in one word, derived from `motion` rather than
 * typed beside it.
 *
 * A visitor deciding whether to open a world is asking "is this going to move
 * at me", and the three fields that answer it are exactly the three the schema
 * already requires. `still` is reserved for a world that declares no loop, no
 * parallax and no glow — `plain` is the only one, which is the point of it.
 */
function motionWord(motion: Experience['motion']): string {
    if (motion.rafLoops === 0 && !motion.parallax && motion.glowStrength === 0) return 'still';
    return motion.rafLoops === 0 ? 'light' : 'full';
}

/**
 * `9 beats · ~6 min · 0 new fonts · motion: light`.
 *
 * Every figure is derived: the chapter count from the spine, the minutes from
 * the story's own words, the font cost from the world's `fontVariables`, the
 * motion word from its `motion` block. Nothing on this row is typed at a call
 * site, which is what makes it safe to promise — telling a visitor the cost
 * before they click is a craft signal only for as long as the number is true.
 *
 * DEVIATION from CREATIVE-SPEC §3.3, which asks for `0 KB new fonts` generated
 * from the build. A face's transferred weight is knowable only from the emitted
 * `_next/static/media` assets, which this server component cannot see and which
 * would need a build-manifest reader to attribute back to a world. The FAMILY
 * count is knowable exactly, is derived from the same field, and answers the
 * question a visitor is actually asking — "does opening this cost me a
 * download" — so it is what ships until that reader exists.
 */
function metaRow(experience: Experience, minutes: number): string {
    const families = experience.fontVariables.length;
    return [
        `${CHAPTERS.length} beats`,
        `~${minutes} min`,
        `${families} new font${families === 1 ? '' : 's'}`,
        `motion: ${motionWord(experience.motion)}`,
    ].join(' · ');
}

// ─── The poster ─────────────────────────────────────────────────────────────

/**
 * The largest poster this page will inline, in bytes.
 *
 * CREATIVE-SPEC §3.3 budgets 24KB gz per poster; `types.ts` budgets 16KB on
 * disk for the file itself. The tighter of the two wins, and it is checked here
 * rather than in review because an oversized poster is invisible until five of
 * them are on one page.
 */
const POSTER_MAX_BYTES = 16 * 1024;

/**
 * `SPINE` widened to the interface it satisfies.
 *
 * The same widening `registry.ts` performs on `EXPERIENCE_LIST` for
 * `EXPERIENCE_PREPAINT`, and for the same reason: `as const` erases `echoes`
 * entirely from the eight chapters that omit it, so the literal type has no such
 * property to read and `chapter.echoes` is a compile error on the very array
 * that declares it. Widening restores the optional field the interface declares
 * and narrows nothing this file needs — it reads `weight`, `id` and `echoes`,
 * all of which are on `SpineChapter`. It is the same array either way.
 */
const CHAPTERS: readonly SpineChapter[] = SPINE;

/**
 * A world's declared poster, inlined from `public/`.
 *
 * Inlined rather than `<img src>` for two reasons that both matter at this
 * scale: five separate requests on the landing surface, and — the one that is
 * not about bytes — an `<img>` cannot inherit `currentColor` or a custom
 * property, so a poster in a file could not be tinted by the card it sits in.
 *
 * Returns `null` for anything it cannot vouch for: a missing file, an oversized
 * one, or markup that is not an `<svg>`. A world that ships a broken poster gets
 * the generated one and a build-time warning, never a blank card.
 */
async function declaredPoster(experience: Experience): Promise<string | null> {
    const poster = experience.poster;
    if (!poster) return null;

    // `path.join` on a `public/`-relative path, with the leading slash stripped so
    // the join cannot be re-rooted at `/`. The value comes from the registry, not
    // from a request, but a path that is assembled is a path worth constraining.
    const file = path.join(process.cwd(), 'public', poster.src.replace(/^\/+/, ''));
    try {
        const svg = await readFile(file, 'utf8');
        if (Buffer.byteLength(svg) > POSTER_MAX_BYTES) {
            console.warn(
                `[dashboard] poster for '${experience.id}' is over ${POSTER_MAX_BYTES}B — falling back`,
            );
            return null;
        }
        if (!svg.trimStart().startsWith('<svg')) {
            console.warn(`[dashboard] poster for '${experience.id}' is not an <svg> — falling back`);
            return null;
        }
        return svg;
    } catch {
        console.warn(`[dashboard] poster '${poster.src}' for '${experience.id}' is missing`);
        return null;
    }
}

/**
 * The generated poster — what a world gets for declaring no art of its own.
 *
 * ── What it draws, and why it is the same drawing five times ───────────────
 * The nine chapters of the spine as nine columns, each column's height its
 * chapter `weight`, with the one `echoes` link in the whole structure drawn as
 * an arc between the two chapters it names. That is not decoration standing in
 * for art: it is the résumé's actual shape — the deliberate trough at chapters
 * 2 and 7 that lets chapter 6 be the peak, and the 2017↔2025 rhyme that this
 * entire feature exists to make legible.
 *
 * It is identical in composition across all five cards and differs only in the
 * two colours the world declared, and that is the honest statement rather than
 * a shortcut: five worlds tell ONE story, and a shelf that says so in one glance
 * is a better first impression than five unrelated abstractions would be. Every
 * world replaces it the moment it declares `poster`, one world at a time, with
 * no edit here.
 *
 * ── Why it is drawn from `SPINE` and never from a literal ──────────────────
 * A hand-drawn nine-bar chart is a second declaration of the pacing, and the
 * two would part company the first time a weight is tuned. Reading the array
 * means the poster is wrong only if the story is.
 *
 * `preserveAspectRatio="xMidYMid slice"` because this one drawing is cropped to
 * five different aspect ratios across three breakpoints (4/3, 16/10, 21/9, 3/2,
 * and the featured slot's free height). The viewBox is deliberately 320×240 —
 * 4/3 exactly, which is the NARROWEST preview on the shelf — so `slice` never
 * crops horizontally at any breakpoint and a column can never be cut in half.
 * Vertically it does crop, so the composition is held inside y 46–176: the arc's
 * apex clears the 21/9 band's top edge and the horizon clears its bottom one.
 */
function generatedPoster(experience: Experience): string {
    const [accent, ground] = experience.swatch;
    const W = 320;
    const H = 240;
    const BASE = 176; // the horizon the columns stand on
    const PEAK = 108; // the tallest column, in user units — the weight-1.6 chapter
    const LEFT = 40;
    const RIGHT = 280;

    const heaviest = CHAPTERS.reduce((max, chapter) => Math.max(max, chapter.weight), 0);
    const step = (RIGHT - LEFT) / (CHAPTERS.length - 1);
    const x = (index: number) => LEFT + index * step;
    const top = (weight: number) => BASE - (weight / heaviest) * PEAK;

    const columns = CHAPTERS.map((chapter, index) => {
        const cx = x(index);
        const y = top(chapter.weight);
        // The ramp is a luminance ramp, not a hue one: opacity rises with
        // position so the drawing reads as an ascent in greyscale and in print,
        // and the peak — the chapter that echoes — is the only fully lit stop.
        //
        // It STARTS at 0.52 rather than at something prettier because 0.52 is
        // where the dimmest stop clears 3:1 against every one of the five
        // grounds. Measured, composited over each world's own ground: ghost
        // 3.59 · trunk 3.93 · timecode 3.09 · overworld 3.92 · crossing 3.46.
        // The poster is decorative and `aria-hidden`, so the non-text floor does
        // not strictly bind it — but a first chapter nobody can see is a nine-bar
        // chart that reads as eight, and that is a drawing that lies.
        const lit = chapter.echoes ? 1 : 0.52 + (index / (CHAPTERS.length - 1)) * 0.36;
        return `<rect x="${(cx - 5).toFixed(1)}" y="${y.toFixed(1)}" width="10" height="${(BASE - y).toFixed(1)}" rx="3" fill="${accent}" fill-opacity="${lit.toFixed(2)}"/>`;
    }).join('');

    // The one `echoes` declaration in the spine, drawn. `findIndex` rather than a
    // literal pair of indices so moving a chapter moves the arc with it.
    const echoTo = CHAPTERS.findIndex((chapter) => chapter.echoes !== undefined);
    const echoFrom = echoTo < 0 ? -1 : CHAPTERS.findIndex((c) => c.id === CHAPTERS[echoTo]!.echoes);
    const arc =
        echoTo < 0 || echoFrom < 0
            ? ''
            : `<path d="M ${x(echoFrom).toFixed(1)} ${(top(CHAPTERS[echoFrom]!.weight) - 12).toFixed(1)} Q ${((x(echoFrom) + x(echoTo)) / 2).toFixed(1)} 46 ${x(echoTo).toFixed(1)} ${(top(CHAPTERS[echoTo]!.weight) - 12).toFixed(1)}" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 5"/>`;

    return [
        `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" focusable="false">`,
        `<rect width="${W}" height="${H}" fill="${ground}"/>`,
        // The horizon. 1px at this scale, and the only mark in the drawing that
        // is not data — it is what stops nine floating bars from reading as
        // noise. Deliberately BELOW the 3:1 floor the bars are held to (0.35
        // alpha measures 1.9–2.3:1 across the five grounds): it carries nothing,
        // and a grounding rule as loud as the data it grounds is a rule that has
        // started competing. Delete it and the chart is unchanged in meaning.
        `<line x1="${LEFT - 16}" y1="${BASE}" x2="${RIGHT + 16}" y2="${BASE}" stroke="${accent}" stroke-opacity="0.35" stroke-width="1"/>`,
        arc,
        columns,
        `</svg>`,
    ].join('');
}

// ─── The page ───────────────────────────────────────────────────────────────

/**
 * The two radii the shelf uses, handed to the stylesheet as custom properties.
 *
 * SKIN-CONTRACT: geometry is the shipped `RADIUS` const, imported and never
 * re-typed as a px literal. A stylesheet cannot import, so the const crosses the
 * boundary here — one inline style on one element, read by every rule in the
 * `dashboard` block. The literals that remain in that block are `var()`
 * fallbacks and exist for exactly one case: markup rendered before this style
 * applies, which is never, in a static export.
 */
const SHELL_GEOMETRY = {
    '--dash-radius-card': RADIUS.card,
    '--dash-radius-pill': RADIUS.pill,
} as CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
    const sections = await getSiteSections();
    const owner = sections.find((section) => section.layout === 'about')?.items[0]?.title;

    return {
        title: owner ? `${EXPERIENCE_NAV.label} — ${owner}` : EXPERIENCE_NAV.label,
        description: EXPERIENCE_NAV.hint,
    };
}

export default async function ExperienceDashboard() {
    const sections = await getSiteSections();
    const story = buildStory(sections);
    const minutes = minutesToRead(story);

    // Composed on the server, once, at build time. Each card receives a string.
    const cards = await Promise.all(
        EXPERIENCE_MENU.map(async (experience, index) => ({
            id: experience.id,
            href: `${EXPERIENCE_NAV.href}${experience.id}/`,
            label: experience.label,
            hint: experience.hint,
            meta: metaRow(experience, minutes),
            swatch: experience.swatch,
            posterSvg: (await declaredPoster(experience)) ?? generatedPoster(experience),
            index,
            // The featured slot is the FIRST entry, and it is first because
            // `registry.ts` argues the order rather than because this page names
            // a world. Special-casing `ghost` by id here would put the shelf's
            // hierarchy in two files and let them disagree.
            featured: index === 0,
        })),
    );

    return (
        <Layout>
            <div className="xp-dashboard" style={SHELL_GEOMETRY}>
                <div className="xp-dashboard__intro">
                    {/* The heading reads from the same table the header icon's
                        tooltip and `aria-label` read from — the word
                        "Experiences" is typed once in this codebase. */}
                    <h1 className="xp-dashboard__title">{EXPERIENCE_NAV.label}</h1>
                    {/* The one sentence on this page that is not read from a
                        table, so it deliberately counts nothing. "Five ways" or
                        "nine chapters" would each be a second statement of a
                        number the code already knows — `EXPERIENCE_MENU.length`
                        and `CHAPTERS.length` — and prose is the copy nobody
                        remembers to update when either one changes. */}
                    <p className="xp-dashboard__dek">
                        {EXPERIENCE_NAV.hint}. Every telling below is the whole story, and every
                        one of them is one click from the plain document.
                    </p>
                </div>

                <ul className="xp-dashboard__shelf">
                    {cards.map((card) => (
                        <li
                            key={card.id}
                            data-experience-id={card.id}
                            className={
                                card.featured
                                    ? 'xp-dashboard__slot xp-dashboard__slot--featured'
                                    : 'xp-dashboard__slot'
                            }
                        >
                            <DashboardCard {...card} />
                        </li>
                    ))}
                </ul>
            </div>
        </Layout>
    );
}
