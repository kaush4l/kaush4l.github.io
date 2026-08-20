/**
 * Shared motion vocabulary.
 *
 * The site has exactly one motion language and it is defined here, not at the
 * call sites. Two rules hold everywhere:
 *
 *  1. **Reduced motion is a hard gate, not a shorter duration.** Everything that
 *     moves asks `prefersReducedMotion()` first and, when it is true, jumps
 *     straight to the resting state. No decorative loop starts at all.
 *  2. **Nothing animates that the user cannot see.** Ambient loops (canvas,
 *     grain, beams) are owned by `runWhileVisible`, which pauses on tab-hide and
 *     on scroll-out. An idle hero must cost zero frames.
 */

/**
 * The house curve — a long tail, like a camera settling on its mark.
 *
 * Only the CSS spelling lives here. The anime.js twin is built with that
 * library's `cubicBezier()` **at its call site**: anime.js 4 removed the string
 * form (`'cubicBezier(…)'` now warns and silently falls back to *linear*, which
 * is how every entrance on this page ran dead-flat for a while), and importing
 * anime.js here would drag the whole library into every module that only wants
 * `prefersReducedMotion`.
 */
export const EASE_CINEMA_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';
/** Snappier curve for controls the user just pressed. */
export const EASE_UI_CSS = 'cubic-bezier(0.2, 0, 0, 1)';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The in-page opt-out, stamped on `<html>` when the visitor has asked for
 * stillness from the appearance menu.
 *
 * WCAG 2.2 SC 2.3.3 asks that interaction-triggered motion be disableable, and
 * the OS setting does not satisfy that on its own: a visitor on a managed,
 * shared, or borrowed machine frequently cannot reach it, and one on a desktop
 * OS that has no such setting never could. Since the perspective skins are the
 * most motion-heavy thing on this site, an in-page control is a requirement
 * rather than a courtesy.
 *
 * It is an OVERRIDE IN ONE DIRECTION ONLY: it can ask for stillness, never for
 * motion. A visitor whose OS says "reduce" is never given animation back by a
 * stored preference — including one they set on a different machine.
 */
export const REDUCE_MOTION_ATTR = 'data-reduce-motion';

function reduceMotionStamped(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(REDUCE_MOTION_ATTR);
}

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return reduceMotionStamped() || window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Subscribe to reduced-motion changes. The setting is toggleable at OS level
 * while the page is open, so treating it as a one-shot read leaves loops
 * running for a user who just asked for them to stop.
 */
export function onReducedMotionChange(fn: (reduced: boolean) => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) return () => { };
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    // Report the RESOLVED preference, never the media query alone — a caller
    // that trusted `e.matches` would restart its loop the moment the OS setting
    // flipped off, silently discarding an in-page request for stillness.
    const emit = () => fn(prefersReducedMotion());
    mq.addEventListener('change', emit);
    // The attribute is toggled by the appearance menu while the page is open,
    // so a one-shot read leaves loops running for a visitor who just asked them
    // to stop — the same reason the media query is subscribed to at all.
    const observer =
        typeof MutationObserver === 'undefined'
            ? null
            : new MutationObserver(emit);
    observer?.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [REDUCE_MOTION_ATTR],
    });
    return () => {
        mq.removeEventListener('change', emit);
        observer?.disconnect();
    };
}

/**
 * Drive a rAF loop only while `el` is on screen **and** the tab is visible.
 *
 * `tick` receives the seconds elapsed since the loop last ran, clamped to
 * 1/30s. The clamp matters: after a tab is restored the raw delta is however
 * long the tab was hidden, and an unclamped integration makes every particle
 * teleport on the first restored frame.
 *
 * Returns a disposer that stops the loop and detaches every listener.
 */
export function runWhileVisible(
    el: Element,
    tick: (deltaSeconds: number, elapsedSeconds: number) => void,
): () => void {
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let onScreen = false;
    let disposed = false;

    const frame = (now: number) => {
        if (disposed) return;
        const delta = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
        last = now;
        elapsed += delta;
        tick(delta, elapsed);
        raf = requestAnimationFrame(frame);
    };

    const start = () => {
        if (raf || disposed) return;
        last = 0; // force the 1/60 seed rather than a stale timestamp
        raf = requestAnimationFrame(frame);
    };
    const stop = () => {
        if (!raf) return;
        cancelAnimationFrame(raf);
        raf = 0;
    };
    const sync = () => {
        if (onScreen && document.visibilityState === 'visible') start();
        else stop();
    };

    const io = new IntersectionObserver(
        ([entry]) => {
            onScreen = entry.isIntersecting;
            sync();
        },
        // A little slack so the loop is already warm as the section scrolls in.
        { rootMargin: '10% 0px' },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', sync);

    return () => {
        disposed = true;
        stop();
        io.disconnect();
        document.removeEventListener('visibilitychange', sync);
    };
}

/** Fire `fn` once, the first time `el` crosses into view. */
export function onFirstVisible(
    el: Element,
    fn: () => void,
    options: IntersectionObserverInit = { rootMargin: '0px 0px -12% 0px' },
): () => void {
    const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        fn();
    }, options);
    io.observe(el);
    return () => io.disconnect();
}

function parseHex(hex: string): [number, number, number] | null {
    const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `#rrggbb` → `r, g, b` for use inside `rgba(…)`. */
export function rgbChannels(hex: string): string {
    const rgb = parseHex(hex);
    return rgb ? rgb.join(', ') : '124, 58, 237';
}

/**
 * `r, g, b` channels for `hex` pulled `amount` of the way toward `toward`.
 *
 * This exists for one specific problem: on a near-white ground, a high-chroma
 * hue is candy long before it is light. The theme's `secondary` (a saturated
 * cyan) at any alpha strong enough to be *visible* in light mode resolves to
 * mint — so the frame read as pastel, not as lit. Pulling the bounce light
 * toward the page ground first gives a cool grey that behaves like light,
 * while dark and coder keep the hue at full chroma, where it belongs.
 */
export function mixChannels(hex: string, toward: string, amount: number): string {
    const a = parseHex(hex);
    const b = parseHex(toward);
    if (!a || !b) return rgbChannels(hex);
    const t = Math.min(1, Math.max(0, amount));
    return a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ');
}
