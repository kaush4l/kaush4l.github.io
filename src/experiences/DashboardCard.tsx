'use client';

import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * One poster on the call sheet — CREATIVE-SPEC §3.3, card anatomy.
 *
 * ── Why this file is a CLIENT component and how little of it is ─────────────
 * Almost nothing here needs JavaScript, and that is on purpose. The card is a
 * server-rendered `<a href>` wrapping a server-rendered SVG; the entrance, the
 * 4px lift, the preview scale, the focus ring, the two-line clamp and every
 * breakpoint live in the delimited `dashboard` block of `experiences.css`. With
 * scripting off the shelf still reads, still navigates and still animates
 * (§3.5), because the only thing this boundary buys is PREFETCH — and prefetch
 * is by definition a thing that cannot matter when there is no client router.
 *
 * That split is also why the props are all strings and numbers. A server
 * component may not hand a function or a class instance across this line, and
 * the deeper reason to keep it to primitives is that the dashboard "ships zero
 * world code" (§3): the five `Experience` records stay on the server, and what
 * crosses into the browser bundle is five copies of this component's props.
 *
 * ── Why prefetch is opt-IN and dwell-gated ─────────────────────────────────
 * `next/link` prefetches on viewport entry by default. On this page that means
 * five worlds' route payloads the moment the shelf scrolls into view, which is
 * exactly the failure the spec names: the picker must not pull five worlds up
 * front. So every link here is `prefetch={false}` and the warm-up is deliberate
 * — 120ms of pointer or focus dwell, per §3.3. 120ms is long enough that a
 * cursor crossing the shelf on its way somewhere else warms nothing, and short
 * enough that it has already finished by the time a hand completes a click.
 */

/** The one honest fact a card cannot derive: which slot it is standing in. */
export interface DashboardCardProps {
    /** Registry id. The DOM stamp the QA gate enumerates from lives on the slot. */
    id: string;
    /** `/experience/<id>/`, built once on the server so no card concatenates a URL. */
    href: string;
    /** `Experience.label` — the world's name, in the neutral voice. */
    label: string;
    /** `Experience.hint` — the dek, clamped to two lines by CSS, never truncated here. */
    hint: string;
    /**
     * The honest meta row, pre-composed on the server: beats, minutes, font cost,
     * motion budget. Every figure is derived from the story and the world's own
     * config; see `metaRow()` in `src/app/experience/page.tsx`.
     */
    meta: string;
    /** `Experience.swatch` — `[accent, ground]`, the `SkinMenu` idiom verbatim. */
    swatch: readonly [string, string];
    /** The poster, as an inline `<svg>` markup string. Server-composed, ≤24KB. */
    posterSvg: string;
    /** Position in the shelf, 0-based. Drives the 40ms entry stagger, nothing else. */
    index: number;
    /** True for the one card in the featured slot. Adds the eyebrow and the span. */
    featured: boolean;
}

/**
 * The connection types on which warming a route is a hostile act.
 *
 * `saveData` is an explicit request and is honoured absolutely. The 2G test
 * catches the case where the visitor never got to express a preference and the
 * radio is answering for them: a speculative payload on a 2G link competes with
 * the navigation the visitor actually asked for.
 */
interface FrugalConnection {
    saveData?: boolean;
    effectiveType?: string;
}

function prefetchIsRude(): boolean {
    const conn = (navigator as Navigator & { connection?: FrugalConnection }).connection;
    if (!conn) return false;
    return conn.saveData === true || /2g/.test(conn.effectiveType ?? '');
}

/**
 * The key under which the dashboard remembers the last world entered.
 *
 * Written here, on activation, and read here, on mount. It is deliberately the
 * card's own business rather than the world's: the dashboard is the only
 * surface that can act on the answer, and a value written by a page that never
 * reads it is a value nobody notices has gone stale.
 */
const LAST_WORLD_KEY = 'xp:last';

export function DashboardCard({
    id,
    href,
    label,
    hint,
    meta,
    swatch,
    posterSvg,
    index,
    featured,
}: DashboardCardProps) {
    const router = useRouter();
    /**
     * The dwell timer, and the latch that stops a second dwell from re-issuing a
     * fetch the router has already served. `useRef` and not `useState` for both:
     * neither changes what is on screen, and a state write per pointerenter
     * would re-render five cards to record something no pixel depends on.
     */
    const dwell = useRef<number | undefined>(undefined);
    const warmed = useRef(false);

    const warm = useCallback(() => {
        if (warmed.current || prefetchIsRude()) return;
        warmed.current = true;
        router.prefetch(href);
    }, [router, href]);

    const startDwell = useCallback(() => {
        if (warmed.current || dwell.current !== undefined) return;
        dwell.current = window.setTimeout(() => {
            dwell.current = undefined;
            warm();
        }, 120);
    }, [warm]);

    const cancelDwell = useCallback(() => {
        if (dwell.current === undefined) return;
        window.clearTimeout(dwell.current);
        dwell.current = undefined;
    }, []);

    /**
     * The returning visitor's one free warm-up.
     *
     * M41: `localStorage` is read here and never in a `useState` initializer —
     * the server has no such storage, so a value read during render is a value
     * the first client render disagrees with, and React throws away the whole
     * tree. Reading it in an effect means the markup the server sent and the
     * markup that hydrates are byte-identical and the warm-up is a thing that
     * happens afterwards.
     *
     * `requestIdleCallback` with a 2s timeout, so it never competes with the
     * ONNX runtime warming on the same page, and never waits forever on a busy
     * main thread either. Safari has no `requestIdleCallback`; the fallback is
     * to do nothing rather than to `setTimeout`, because "the browser was never
     * idle" and "this browser cannot tell me" deserve the same answer, and that
     * answer is that a speculative fetch is optional by definition.
     */
    useEffect(() => {
        let last: string | null = null;
        try {
            last = window.localStorage.getItem(LAST_WORLD_KEY);
        } catch {
            // Private mode, or storage disabled. Nothing here is worth an error.
        }
        if (last !== id) return;

        const idle = window.requestIdleCallback;
        if (typeof idle !== 'function') return;
        const handle = idle(() => warm(), { timeout: 2000 });
        return () => window.cancelIdleCallback?.(handle);
    }, [id, warm]);

    // The dwell timer must not outlive the card; a timer that fires after unmount
    // issues a fetch for a page nobody is standing on.
    useEffect(() => cancelDwell, [cancelDwell]);

    const remember = useCallback(() => {
        try {
            window.localStorage.setItem(LAST_WORLD_KEY, id);
        } catch {
            // See above. Forgetting is a complete and acceptable outcome.
        }
    }, [id]);

    /**
     * The world's two colours, its stagger index and its half of the match cut,
     * as custom properties. Inline because they are per-instance DATA: a
     * stylesheet cannot know five accents, and five generated classes would be
     * five rules that drift from the registry the moment a world is recoloured.
     */
    const vars = {
        '--dash-accent': swatch[0],
        '--dash-ground': swatch[1],
        '--dash-i': index,
        '--dash-vt': `xp-poster-${id}`,
    } as CSSProperties;

    return (
        <Link
            href={href}
            prefetch={false}
            className="xp-dashboard__card"
            style={vars}
            onPointerEnter={startDwell}
            onPointerLeave={cancelDwell}
            onFocus={startDwell}
            onBlur={cancelDwell}
            onClick={remember}
        >
            {/* Stage art is never content. The poster says nothing the caption
                does not, so it is hidden from assistive tech entirely rather
                than given a description that would be read before the title. */}
            <span className="xp-dashboard__preview" aria-hidden="true">
                <span
                    className="xp-dashboard__art"
                    // The markup is composed on the server from the world's own
                    // config and this repo's own `public/` assets — there is no
                    // path by which visitor input reaches it.
                    dangerouslySetInnerHTML={{ __html: posterSvg }}
                />
                <span className="xp-dashboard__swatch" />
            </span>

            <span className="xp-dashboard__caption">
                {/* How the featured card keeps its hierarchy at 360px, where it
                    has lost its span and is the same rectangle as the other
                    four. It is a real word, not a badge colour, so it survives
                    greyscale, forced-colors and a screen reader. */}
                {featured ? <span className="xp-dashboard__eyebrow">Editor’s pick</span> : null}
                <span className="xp-dashboard__name">{label}</span>
                <span className="xp-dashboard__hint">{hint}</span>
                <span className="xp-dashboard__meta">{meta}</span>
            </span>
        </Link>
    );
}

export default DashboardCard;
