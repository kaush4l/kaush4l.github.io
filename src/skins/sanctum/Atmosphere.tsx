'use client';

/**
 * The sanctum's air.
 *
 * Five layers, and only one of them ever moves. The problem this solves is the
 * specific failure mode of a near-black page: with nothing painted on it,
 * #0A0806 does not read as "dark and deliberate", it reads as "the CSS did not
 * load". The fix is not more light — light pollution is what turns a sanctum
 * into a lounge — it is STRUCTURE at almost no luminance:
 *
 *   1. APERTURE   one soft plane of warm light, high and on the axis. Turrell's
 *                 Space Division Constructions are the reference: a single
 *                 aperture of light against a dark field reads as either
 *                 perfectly flat or infinitely deep, and the eye keeps
 *                 re-deciding which. Two lamps would resolve that ambiguity and
 *                 the depth would collapse.
 *   2. DIYA       the one breathing element on the page. ≤5% opacity, 8s cycle,
 *                 opacity + a 7% scale only. A small element blurred and then
 *                 scaled up, because blur cost is radius² × area.
 *   3. GRAIN      a static tiled SVG at 4.5%. Not animated, and not a live
 *                 `feTurbulence` over the viewport — it is rasterised once per
 *                 160px tile. This is the layer that gives the void a tooth.
 *   4. YANTRA     a gold hairline mandala whose arc is drawn by the scroll
 *                 position and nothing else. Pure CSS `animation-timeline:
 *                 scroll()`, so it runs on the compositor — which matters on a
 *                 page that also runs ONNX inference on the main thread.
 *   5. VIGNETTE   neutral, and it only ever darkens, so it cannot lift a text
 *                 pair out of AA.
 *
 * The frame around this — fixed, `z-index: -1`, pointer-transparent,
 * `aria-hidden`, print-hidden — is owned by `SkinAtmosphere`, not by this file.
 */
export default function SanctumAtmosphere() {
    return (
        <div className="sx-atmos">
            <div className="sx-atmos-aperture" />
            <div className="sx-atmos-diya" />
            <div className="sx-atmos-grain" />
            <div className="sx-atmos-vignette" />

            {/*
              The yantra rail. `pathLength="1"` normalises every path to a unit
              length, so the dash geometry below is written once in the
              stylesheet instead of being recomputed per radius.

              The static ring is the STILL — it is always there, at rest. The
              arc is the only part the scroll drives, so a browser without
              scroll-driven animations (or a visitor who asked for stillness)
              still sees the complete figure rather than an empty corner.
            */}
            <svg
                className="sx-atmos-yantra"
                viewBox="0 0 120 120"
                fill="none"
                aria-hidden
                focusable="false"
            >
                <g className="sx-yantra-still">
                    <circle cx="60" cy="60" r="52" pathLength="1" />
                    <circle cx="60" cy="60" r="40" pathLength="1" />
                    {/* The two interlocked triangles, drawn as line, not fill. */}
                    <path d="M60 24 L91 78 L29 78 Z" pathLength="1" />
                    <path d="M60 96 L29 42 L91 42 Z" pathLength="1" />
                    <circle cx="60" cy="60" r="9" pathLength="1" />
                </g>
                <circle
                    className="sx-yantra-arc"
                    cx="60"
                    cy="60"
                    r="52"
                    pathLength="1"
                    transform="rotate(-90 60 60)"
                />
            </svg>
        </div>
    );
}
