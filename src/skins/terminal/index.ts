import type { Skin } from '../types';

/**
 * PLACEHOLDER — identity behaviour only.
 *
 * The palette, hero, atmosphere and motion story for this skin are authored in
 * a dedicated pass. Until then it renders the professional page under its own
 * `data-skin` attribute, which is exactly what the skin INVARIANT promises: a
 * skin that contributes nothing must still leave a complete, readable résumé.
 */
const terminal: Skin = {
    id: 'terminal',
    label: 'Terminal',
    hint: 'Everything is a system. Watch it think.',
    swatch: ['#4ADE80', '#080B10'],
    pinAppearance: 'coder',
};

export default terminal;
