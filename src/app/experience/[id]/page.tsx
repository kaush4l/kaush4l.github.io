import type { Metadata } from 'next';
import { getSiteSections } from '@/lib/content';
import { buildStory } from '@/lib/story';
import { EXPERIENCE_LIST, EXPERIENCES, isExperienceId } from '@/experiences/registry';
import ExperienceFrame from '@/experiences/ExperienceFrame';

/**
 * One statically exported world per registry entry.
 *
 * ── Why a real route segment and not a hash or a query ─────────────────────
 * Deep-linking IS the product. The charter's success condition is "a hiring
 * manager forwards it", and a forwarded `/experience/<id>/` has to OPEN in that
 * world. `/experience/#<id>` needs JS to resolve, so the first paint of a
 * forwarded link is the dashboard — the visitor watches the wrong page turn into
 * the right one. `?id=` is worse: `output: 'export'` produces no build-time
 * `searchParams`, so reading it client-side needs a `<Suspense>` boundary and
 * still paints the wrong content first.
 *
 * With `trailingSlash: true` each entry exports to
 * `out/experience/<id>/index.html` and GitHub Pages serves that directory index
 * directly. `out/404.html` is reached only for a REMOVED id, which is the
 * correct behaviour rather than a gap.
 *
 * ── Why this page does the story work ──────────────────────────────────────
 * It is a server component, so `getSiteSections()` reads the content folders and
 * `buildStory()` parses periods and bullets at BUILD time; the result is
 * serialised into the static HTML. A Stage never parses, fetches or guesses — a
 * Stage that parsed would be doing build-time work on the reader's machine, once
 * per visit, forever.
 */

/**
 * The whole enumeration, derived. Adding a world adds its route with no edit
 * here — which is the property `SKIN_LIST` fails to have, and the reason
 * `EXPERIENCE_LIST` is the one hand-maintained statement in this feature.
 */
export function generateStaticParams() {
    return EXPERIENCE_LIST.map((experience) => ({ id: experience.id }));
}

/**
 * No id outside `generateStaticParams` may be rendered. In a static export that
 * is also literally true — nothing else is emitted — but stating it means the
 * build fails loudly if someone later adds a dynamic path, rather than shipping
 * a route that only works with a server.
 */
export const dynamicParams = false;

interface StageRouteProps {
    /** Next 15+ hands route params in as a promise, on every route. */
    params: Promise<{ id: string }>;
}

/**
 * Per-world `<title>` and `description`, from the copy table and nowhere else.
 *
 * `label` and `premise` are the same two fields the dashboard card renders (M3 —
 * one table, never re-declared at a call site). This is the concrete thing a
 * hash router could not have done: a forwarded link that unfurls in Slack as the
 * world's own name and its own premise.
 *
 * The owner's name is read from the content folders — the same derivation
 * `Layout.tsx` uses for the footer — rather than typed in here, because no
 * résumé fact is hardcoded in a component anywhere in this repo.
 */
export async function generateMetadata({ params }: StageRouteProps): Promise<Metadata> {
    const { id } = await params;
    if (!isExperienceId(id)) return {};

    const experience = EXPERIENCES[id];
    const sections = await getSiteSections();
    const owner = sections.find((section) => section.layout === 'about')?.items[0]?.title;

    return {
        title: owner ? `${experience.label} — ${owner}` : experience.label,
        description: experience.premise,
        openGraph: {
            title: experience.label,
            description: experience.premise,
        },
    };
}

export default async function ExperienceStageRoute({ params }: StageRouteProps) {
    const { id } = await params;

    // The same sections the résumé renders, ordered into a story: content-section
    // order first, then chronologically within a section. `content.ts` and every
    // file under `content/` are untouched by this feature.
    const sections = await getSiteSections();
    const story = buildStory(sections);

    // `id` crosses to the client as a string and the frame looks the record up
    // there — `tokens()` is a function and `Stage` is a component reference, so
    // the `Experience` record is not serialisable and must not be passed.
    return <ExperienceFrame id={id} story={story} />;
}
