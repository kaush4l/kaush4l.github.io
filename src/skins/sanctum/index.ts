import type { Skin } from '../types';

/**
 * PLACEHOLDER — identity behaviour only.
 *
 * The palette, hero, atmosphere and motion story for this skin are authored in
 * a dedicated pass. Until then it renders the professional page under its own
 * `data-skin` attribute, which is exactly what the skin INVARIANT promises: a
 * skin that contributes nothing must still leave a complete, readable résumé.
 */
const sanctum: Skin = {
    id: 'sanctum',
    label: 'Sanctum',
    hint: 'A single lamp in a dark hall. Nothing moves that need not.',
    swatch: ['#D9A441', '#050505'],
    pinAppearance: 'dark',
};

export default sanctum;
