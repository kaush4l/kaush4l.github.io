'use client';

/**
 * Reading position, announcement, and the keyboard contract — the four hooks a
 * world's own Stage needs in order to behave exactly like the shared one.
 *
 * ── Why this exists, stated plainly rather than hidden ──────────────────────
 * The shared `Stage.tsx` already implements every rule below, and implements it
 * well. None of it is exported. So a world that must render its own chrome —
 * and Ghost must, because its progress affordance is a `<table>`
 * (`spineCostume: 'table'`) rather than a rail of dots — has exactly two
 * options: reimplement, or edit a file it does not own while four other authors
 * are in the tree.
 *
 * This is the reimplementation, kept deliberately behaviour-identical rather
 * than improved, so that the day these are hoisted into a shared module the
 * diff is a deletion. **The next phase should lift `useActiveMark`,
 * `useReadingAnnouncement` and `useChapterKeys` out of `Stage.tsx` into
 * `src/experiences/reading.ts` and delete this file** — every world after the
 * first will otherwise pay the same tax, and five copies of a keyboard state
 * machine is five chances to bind `Space`.
 *
 * The rules being preserved, all from CREATIVE-SPEC §2.6 / §2.7:
 *   • "active" means *occupying the middle band*, never *topmost*, or the
 *     indicator flickers backwards whenever two chapters straddle the fold.
 *   • `Space`, `PageDown` and native arrow-scroll are NEVER bound. This
 *     augments scrolling; it never replaces it.
 *   • every binding no-ops inside a text control, inside the chat widget, and
 *     under any modifier but the documented `Shift+G`.
 *   • a deliberate jump is a CUT: input is locked for its duration and the last
 *     input during the lock is QUEUED, never dropped, so `4 4 4` lands on 4.
 *   • focus moves only on a jump the reader asked for — never as a side effect
 *     of scrolling, which would take the caret away from someone tabbing.
 *
 * M41 throughout: no `document`, `localStorage`, `matchMedia` or DOM attribute
 * is read in a `useState` initializer. `null` is the server's answer and the
 * first client frame's answer alike.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** A navigable landmark: the overture, then one per spine chapter. */
export interface Mark {
    /** The DOM id this mark scrolls to and is observed by. */
    id: string;
    /** The employer, school or client. What a skimmer is actually looking for. */
    label: string;
    /** How many beats it accounts for, for an honest progress fraction. */
    beatCount: number;
}

/** The cut's duration, and therefore the input lock's. */
const CUT_MS = 560;

/**
 * Which mark the reader is inside.
 *
 * An `IntersectionObserver` over ids this component owns — never a
 * `querySelectorAll('section[id]')`, which would scoop up a world's own
 * sections and light the wrong mark in exactly the worlds that are hardest to
 * debug — and never a scroll handler, so there is no frame loop to throttle and
 * nothing to pause on tab-hide. Ghost declares `rafLoops: 0` and this is one of
 * the two places that claim is kept.
 */
export function useActiveMark(marks: readonly Mark[], rootRef?: RefObject<HTMLElement | null>): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);
    // The ids alone: a re-render that rebuilds an identical array must not tear
    // the observer down and re-create it on every commit.
    const key = marks.map((mark) => mark.id).join('|');

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const ids = key ? key.split('|') : [];
        const elements = ids
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => element !== null);
        if (elements.length === 0) return;

        const visible = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.add(entry.target.id);
                    else visible.delete(entry.target.id);
                }
                // Document order wins among everything in the band, so the mark
                // never jumps forward past a chapter the reader can still see.
                setActiveId(elements.find((element) => visible.has(element.id))?.id ?? null);
            },
            { root: rootRef?.current ?? null, rootMargin: '-35% 0px -55% 0px', threshold: 0 },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [key, rootRef]);

    return activeId;
}

/**
 * The polite announcement, rendered once and mutated.
 *
 * A live region added to the DOM at the same moment its text appears is
 * frequently not announced at all — the assistive tech has nothing to diff
 * against — so the region is always mounted and only this string changes.
 */
export function useReadingAnnouncement(marks: readonly Mark[], activeId: string | null): string {
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!activeId) return;
        const index = marks.findIndex((mark) => mark.id === activeId);
        if (index < 0) return;
        setMessage(`Chapter ${index + 1} of ${marks.length} — ${marks[index].label}`);
    }, [activeId, marks]);

    return message;
}

/**
 * The true fraction of beats completed — derived from the same array the
 * content comes from.
 *
 * Beats and not chapters: a nine-beat coda and a one-beat return are not the
 * same amount of reading, and a bar that treated them as equal would be visibly
 * wrong to anyone who scrolled. A progress affordance that lies once makes
 * everything else on the page suspect.
 */
export function progressFraction(marks: readonly Mark[], activeId: string | null): number {
    const index = marks.findIndex((mark) => mark.id === activeId);
    if (index < 0) return 0;
    const total = marks.reduce((sum, mark) => sum + mark.beatCount, 0);
    if (total === 0) return 0;
    return marks.slice(0, index + 1).reduce((sum, mark) => sum + mark.beatCount, 0) / total;
}

/**
 * The keyboard contract. See the header for every rule it keeps and why.
 */
export function useChapterKeys(
    marks: readonly Mark[],
    activeId: string | null,
    jump: (id: string) => void,
    enabled: boolean,
) {
    // Refs, not state: the handler must see the latest values without the
    // listener being torn down and re-attached on every scroll tick.
    const marksRef = useRef(marks);
    const activeRef = useRef(activeId);
    const jumpRef = useRef(jump);
    // Adopted in an effect, never in the render body. A ref written during
    // render is a render side effect: under StrictMode's double invoke, and
    // under any render React discards before committing, the ref would hold a
    // value that never reached the DOM — and `react-hooks/refs` fails the lint
    // gate on exactly that. The listener below reads these only from an async
    // keyboard event, which cannot land before this effect has run, so the
    // "one render behind" window this trades for is not observable here.
    useEffect(() => {
        marksRef.current = marks;
        activeRef.current = activeId;
        jumpRef.current = jump;
    });

    useEffect(() => {
        if (!enabled) return;

        let lockedUntil = 0;
        let queued: string | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const commit = (id: string) => {
            const now = Date.now();
            if (now < lockedUntil) {
                // Queued, never dropped: the LAST input during the lock wins,
                // which is what makes a repeated key land on its target rather
                // than replaying every intermediate stop.
                queued = id;
                return;
            }
            lockedUntil = now + CUT_MS;
            jumpRef.current(id);
            timer = setTimeout(() => {
                if (queued) {
                    const next = queued;
                    queued = null;
                    commit(next);
                }
            }, CUT_MS);
        };

        let pendingG = false;

        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            const target = event.target as HTMLElement | null;
            if (
                target?.closest(
                    'input, textarea, select, [contenteditable], [role="textbox"], [data-chat-widget]',
                )
            ) {
                return;
            }

            const list = marksRef.current;
            if (list.length === 0) return;
            const current = Math.max(0, list.findIndex((mark) => mark.id === activeRef.current));

            const go = (index: number) => {
                event.preventDefault();
                commit(list[Math.min(Math.max(index, 0), list.length - 1)].id);
            };

            // `G G` then `Shift+G`, in that order, so the pending-G state is
            // cleared by anything that is not the second G.
            if (event.key === 'G') {
                pendingG = false;
                go(list.length - 1);
                return;
            }
            if (event.key === 'g') {
                if (pendingG) {
                    pendingG = false;
                    go(0);
                } else {
                    pendingG = true;
                }
                return;
            }
            pendingG = false;

            if (event.shiftKey) return;

            switch (event.key) {
                case 'j':
                    go(current + 1);
                    return;
                case 'k':
                    go(current - 1);
                    return;
                case 'ArrowRight':
                    go(current + 1);
                    return;
                case 'ArrowLeft':
                    go(current - 1);
                    return;
                default:
                    break;
            }

            if (/^[1-9]$/.test(event.key)) go(Number(event.key) - 1);
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (timer) clearTimeout(timer);
        };
    }, [enabled]);
}

/**
 * A deliberate jump: scroll, then move focus to the heading WITHOUT scrolling
 * again.
 *
 * `preventScroll: true` is load-bearing. Without it the browser performs its own
 * instant scroll-into-view on focus, which lands a fraction off the smooth
 * scroll already in flight and produces a visible double jump — the single most
 * common way a "jump to chapter" control feels broken.
 *
 * Only a deliberate jump pushes history, so Back means "back one decision".
 */
export function useJump(
    headings: RefObject<Map<string, HTMLElement>>,
    reduceMotion: boolean,
): (id: string) => void {
    return useCallback(
        (id: string) => {
            const target = document.getElementById(id);
            target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            headings.current?.get(id)?.focus({ preventScroll: true });
            if (typeof history !== 'undefined') history.pushState(null, '', `#${id}`);
        },
        // A ref object is stable for the lifetime of the component, so it is not
        // a dependency — listing it is what makes the compiler unable to
        // preserve this memoization, and re-creating the handler on every
        // heading registration would re-arm the keyboard listener mid-scroll.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reduceMotion],
    );
}
