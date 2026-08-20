import type { Skin } from '../types';

/**
 * PLACEHOLDER — identity behaviour only.
 *
 * The palette, hero, atmosphere and motion story for this skin are authored in
 * a dedicated pass. Until then it renders the professional page under its own
 * `data-skin` attribute, which is exactly what the skin INVARIANT promises: a
 * skin that contributes nothing must still leave a complete, readable résumé.
 */
const voyager: Skin = {
    id: 'voyager',
    label: 'Voyager',
    hint: 'Leaving is not the same as being lost.',
    swatch: ['#F0B429', '#070A12'],
    pinAppearance: 'dark',
};

export default voyager;
