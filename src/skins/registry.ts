import type { Skin, SkinId } from './types';
import professional from './professional';
import ronin from './ronin/index';
import sanctum from './sanctum/index';
import terminal from './terminal/index';
import accession from './accession/index';

/**
 * The skin table. Order is the menu order, and the menu order is an argument:
 * the unadorned résumé first (it is what a hiring manager should meet), then
 * the three perspectives, each of which is a complete point of view rather than
 * a colour scheme.
 */
export const SKINS: Record<SkinId, Skin> = {
    professional,
    ronin,
    sanctum,
    terminal,
    accession,
};

export const SKIN_LIST: readonly Skin[] = [
    professional,
    ronin,
    sanctum,
    terminal,
    accession,
];

export const DEFAULT_SKIN: SkinId = 'professional';

export function isSkinId(v: unknown): v is SkinId {
    return typeof v === 'string' && Object.prototype.hasOwnProperty.call(SKINS, v);
}
