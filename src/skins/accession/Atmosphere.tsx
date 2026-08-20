'use client';

/**
 * The stock.
 *
 * ── Why this exists at all ──────────────────────────────────────────────────
 * On a light ground the fixed atmosphere layer is usually better empty than
 * filled: a glow on cream is a stain, and a gradient on cream is a print
 * defect. So this layer does exactly one thing, and it is the one thing paper
 * has that a screen does not — TOOTH. A tiling grain at 3.5% and a warm edge
 * fall-off, both completely static.
 *
 * ── Why it is a component and not a pseudo-element ──────────────────────────
 * Both of `body`'s pseudo-slots are already owned — `cinema.css` paints the
 * page grade on `::before` and `coder.css` the scanlines on `::after` — so a
 * skin that wants a full-viewport layer has to be given one. `SkinAtmosphere`
 * owns the frame (fixed, `z-index: -1`, pointer-transparent, `aria-hidden`,
 * print-hidden); this file only supplies the paint.
 *
 * ── The performance contract ────────────────────────────────────────────────
 * There is no canvas, no rAF, no filter and no animation in this layer. The
 * grain is a data-URI SVG with `feTurbulence` used as a BACKGROUND IMAGE, which
 * the browser rasterises once at decode and then treats as a bitmap tile — as
 * opposed to a live `filter: url(#…)` over the viewport, which is re-evaluated
 * on every composite and is the single most expensive thing a "subtle paper
 * texture" is commonly implemented as. This layer costs zero frames, forever,
 * which matters because the assistant on this page runs ONNX on the main
 * thread and every frame it does not have to share is inference it gets to do.
 */
export default function Atmosphere() {
    return (
        <div className="ac-atmos">
            <div className="ac-atmos-grain" />
            <div className="ac-atmos-edge" />
        </div>
    );
}
