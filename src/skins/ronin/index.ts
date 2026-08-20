import type { Skin } from '../types';

/**
 * PLACEHOLDER — identity behaviour only.
 *
 * The palette, hero, atmosphere and motion story for this skin are authored in
 * a dedicated pass. Until then it renders the professional page under its own
 * `data-skin` attribute, which is exactly what the skin INVARIANT promises: a
 * skin that contributes nothing must still leave a complete, readable résumé.
 */
const ronin: Skin = {
    id: 'ronin',
    label: 'Rōnin',
    hint: 'Ink, breath, and the moment before the strike.',
    swatch: ['#E23A2E', '#0B0B0D'],
    pinAppearance: 'dark',
};

export default ronin;
