'use client';

/**
 * Rōnin — the atmosphere.
 *
 * ── The argument ────────────────────────────────────────────────────────────
 * In sumi-e the paper is not the absence of the painting; it is half of it.
 * `yohaku` (余白, "remaining white") is the negative space that gives a stroke
 * its speed and its weight. So this layer paints almost nothing, on purpose:
 * a sheet with a fibre tooth, one soft wash where the ink has been thinnest,
 * one hairline at the right margin where a hanging scroll is mounted, and a
 * fall-off at the foot of the page.
 *
 * ── Why it does not move ────────────────────────────────────────────────────
 * Every other skin's temptation is an ambient loop. This one is the skin whose
 * whole thesis is the stillness AFTER the strike, so a drifting background
 * would contradict the argument as well as burning frames in the reader's
 * periphery (an explicit anti-pattern in the contract). There is no rAF here,
 * no CSS animation, and no live filter over the viewport: the grain is a single
 * pre-rasterised data-URI tile. The atmosphere costs exactly one paint.
 *
 * The frame around it — fixed, `z-index: -1`, pointer-transparent, `aria-hidden`
 * and print-hidden — is owned by `SkinAtmosphere`, not by this file.
 */
export default function Atmosphere() {
    return (
        <>
            {/* The wash. Two very faint bone clouds — the ink that did not
                reach the corners. Sized in vmax so the shape is the same
                gesture on a phone and on a 34" display. */}
            <div className="rn-atmos rn-atmos-wash" />
            {/* The sheet's tooth. Static tile, ~3% — enough to kill the flat
                digital black, far too weak to move any text pair off AA. */}
            <div className="rn-atmos rn-atmos-paper" />
            {/* The mounting edge of a scroll: one hairline down the right
                margin, stopping short of both ends. Desktop only — on a phone
                there is no margin for it to live in. */}
            <div className="rn-atmos rn-atmos-rule" />
            {/* The foot of the sheet falls into ink, so the page has a bottom
                edge instead of running off into nothing. */}
            <div className="rn-atmos rn-atmos-foot" />
        </>
    );
}
