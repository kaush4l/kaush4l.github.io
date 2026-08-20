import type { Skin } from './types';

/**
 * The identity skin.
 *
 * It contributes nothing on purpose: with `professional` selected the page is
 * byte-for-byte the site that shipped before the skin axis existed — the same
 * cinematic hero, the same page grade, the same reveal choreography, and the
 * full light/dark/coder × a–d matrix still under the visitor's control.
 *
 * That is what makes it the safe default and the honest baseline: every other
 * skin is measured against a page that is already finished, so a skin has to
 * *earn* its atmosphere rather than merely differ from a blank one.
 */
const professional: Skin = {
    id: 'professional',
    label: 'Professional',
    hint: 'The résumé, unadorned. Light, dark or coder — your call.',
    swatch: ['#7C3AED', '#06B6D4'],
};

export default professional;
