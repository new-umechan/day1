import { PIECES_DATA, abilityCost } from '../logic/pieces.js';

export function totalConfigCost(config) {
    let total = 0;
    if (!config) return 0;
    for (const abilities of Object.values(config)) {
        total += abilityCost(abilities);
    }
    return total;
}
