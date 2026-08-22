/**
 * The station silhouettes — eight `<symbol>` nodes, declared once per document.
 *
 * ── Why a `<defs>` block and not eight components ───────────────────────────
 * `crossing` and `return` are the same building. CREATIVE-SPEC §4.4 is explicit
 * that station 1's civic silhouette is *stored and reused verbatim* at station
 * 6 — "that reuse is the peak and it must be the same node, not a copy". A
 * component invoked twice is a copy: two subtrees that can drift the instant
 * somebody edits one of them, which is exactly the failure the rhyme cannot
 * survive. A `<symbol>` referenced by two `<use>` elements is one node,
 * enforced by the DOM rather than by a comment asking nobody to touch it.
 *
 * It also buys the compact telling for free: a 180px vignette is a second SVG
 * with a cropped viewBox that `<use>`s the same ids, so the small telling is
 * drawn from the same art as the large one rather than being a second drawing
 * that has to be kept in step.
 *
 * ── Materials (§4.4) ───────────────────────────────────────────────────────
 * Matte flat fills, one 1px hairline where a region meets the ground, no
 * bevels, no drop shadows, no gradients, nothing isometric. Every fill is
 * `currentColor` at a stated alpha, so the ramp stop a station wears is set
 * ONCE on the `<use>` — which is also how the peak token is referenced exactly
 * once for a station that is drawn from shared art.
 *
 * `vector-effect="non-scaling-stroke"` on every hairline: the same symbol is
 * drawn at 1× at station 1 and at 3× at station 6, and a hairline that scaled
 * with it would be a 3px rule at the one place the spec fixes at 1px, always.
 *
 * No colour literal appears in this file, by the §5.2 rule.
 */

/** Ground line at y=100, centred on x=50, drawn to be legible at 40px wide. */
const BOX = '0 0 100 100';

export const SYMBOL_IDS = {
    plain: 'ow-sym-plain',
    civic: 'ow-sym-civic',
    ward: 'ow-sym-ward',
    cut: 'ow-sym-cut',
    yard: 'ow-sym-yard',
    lantern: 'ow-sym-lantern',
    plateau: 'ow-sym-plateau',
    coda: 'ow-sym-coda',
} as const;

/**
 * Mounted once by the Stage, `aria-hidden`, zero-sized, print-hidden.
 *
 * It is a real element in the flow rather than a portal: a `<use>` in another
 * inline SVG resolves against the same document, and a document that has not
 * rendered its defs yet draws nothing at all — which is the difference between
 * "the map is late" and "the map is empty".
 */
export default function MapDefs() {
    return (
        <svg
            aria-hidden
            focusable="false"
            className="no-print"
            width={0}
            height={0}
            style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
            <defs>
                {/* The lowest ground and the coolest light: a mound and three
                    tufts. Nothing has been built here yet, which is the whole
                    statement of chapter 0. */}
                <symbol id={SYMBOL_IDS.plain} viewBox={BOX}>
                    <path d="M6 100 Q50 62 94 100 Z" fill="currentColor" fillOpacity="0.55" />
                    <path
                        d="M6 100 Q50 62 94 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                    <path d="M32 88 v-10 M50 84 v-13 M68 88 v-10" stroke="currentColor" strokeWidth="2" fill="none" />
                </symbol>

                {/* THE BUILDING. Drawn once, used at station 1 at 1x and at
                    station 6 at 3x. A plaque, deliberately blank: the word on it
                    is spoken by the narration at chapters 1 and 6 and by nothing
                    else on the page, which is the copy rule the rhyme depends
                    on. Lettering here would break it in the one place it would
                    be least noticed. */}
                <symbol id={SYMBOL_IDS.civic} viewBox={BOX}>
                    <path d="M18 46 L50 26 L82 46 Z" fill="currentColor" fillOpacity="0.85" />
                    <rect x="20" y="46" width="60" height="7" fill="currentColor" fillOpacity="0.7" />
                    <rect x="26" y="53" width="7" height="39" fill="currentColor" fillOpacity="0.55" />
                    <rect x="40" y="53" width="7" height="39" fill="currentColor" fillOpacity="0.55" />
                    <rect x="54" y="53" width="7" height="39" fill="currentColor" fillOpacity="0.55" />
                    <rect x="68" y="53" width="7" height="39" fill="currentColor" fillOpacity="0.55" />
                    {/* The nameplate. */}
                    <rect x="38" y="62" width="24" height="9" fill="currentColor" fillOpacity="0.9" />
                    <rect x="16" y="92" width="68" height="8" fill="currentColor" fillOpacity="0.75" />
                    <path
                        d="M16 92 h68"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                </symbol>

                {/* A corridor of identical bays. Repetition IS the content of a
                    deliberately quiet chapter, so the silhouette says it before
                    the saturate(0.65) does. */}
                <symbol id={SYMBOL_IDS.ward} viewBox={BOX}>
                    <rect x="10" y="52" width="80" height="48" fill="currentColor" fillOpacity="0.45" />
                    {[16, 32, 48, 64, 80].map((x) => (
                        <rect key={x} x={x - 5} y="62" width="10" height="26" fill="currentColor" fillOpacity="0.8" />
                    ))}
                    <path
                        d="M10 52 h80"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                </symbol>

                {/* The cut. The ground lips sit ABOVE the route, cabling strung
                    across the gap: the only station the reader travels down into
                    rather than up onto. */}
                <symbol id={SYMBOL_IDS.cut} viewBox={BOX}>
                    <path d="M0 40 h30 v40 h40 v-40 h30 v60 H0 Z" fill="currentColor" fillOpacity="0.5" />
                    <path
                        d="M0 40 h30 v40 h40 v-40 h30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                    <path d="M22 34 Q50 54 78 34" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" />
                    <path d="M22 34 v-14 M78 34 v-14" stroke="currentColor" strokeWidth="3" strokeOpacity="0.8" />
                </symbol>

                {/* The widest frame: a rail yard. The carriages that stream
                    across it are NOT in the symbol — they are the map's one
                    ambient loop and they belong to the plane that can be
                    stopped, not to the silhouette that must always be legible. */}
                <symbol id={SYMBOL_IDS.yard} viewBox={BOX}>
                    <rect x="0" y="74" width="100" height="26" fill="currentColor" fillOpacity="0.45" />
                    <path
                        d="M0 74 h100"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                    <path d="M0 84 h100 M0 92 h100" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
                    <path d="M12 54 h30 l8 -14 h20 v34 H12 Z" fill="currentColor" fillOpacity="0.75" />
                </symbol>

                {/* The first light source on the map that is not the sun. */}
                <symbol id={SYMBOL_IDS.lantern} viewBox={BOX}>
                    <rect x="46" y="40" width="8" height="60" fill="currentColor" fillOpacity="0.7" />
                    <path d="M36 40 L50 22 L64 40 Z" fill="currentColor" fillOpacity="0.95" />
                    <rect x="40" y="40" width="20" height="14" fill="currentColor" fillOpacity="0.95" />
                    <path d="M34 58 h32" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" />
                    <rect x="30" y="94" width="40" height="6" fill="currentColor" fillOpacity="0.7" />
                </symbol>

                {/* Flat warm ground. No camera move, nothing built tall: the
                    landing after the peak is deliberately level. */}
                <symbol id={SYMBOL_IDS.plateau} viewBox={BOX}>
                    <rect x="4" y="66" width="92" height="34" fill="currentColor" fillOpacity="0.5" />
                    <path
                        d="M4 66 h92"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                    <rect x="26" y="50" width="48" height="16" fill="currentColor" fillOpacity="0.8" />
                </symbol>

                {/* Five slots, resolved. The coda's silhouette is the inventory
                    the reader has been watching fill, drawn as terrain. */}
                <symbol id={SYMBOL_IDS.coda} viewBox={BOX}>
                    <rect x="0" y="72" width="100" height="28" fill="currentColor" fillOpacity="0.45" />
                    <path
                        d="M0 72 h100"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                    {[14, 32, 50, 68, 86].map((x) => (
                        <rect key={x} x={x - 6} y="48" width="12" height="24" fill="currentColor" fillOpacity="0.85" />
                    ))}
                </symbol>
            </defs>
        </svg>
    );
}
