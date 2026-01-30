import { PIECES_DATA, abilityCost } from '../logic/pieces.js';

export function totalConfigCost(config) {
    let total = 0;
    const data = PIECES_DATA.length > 0 ? PIECES_DATA : [];
    for (const p of data) {
        const pieceConfig = config[p.id];
        if (pieceConfig) {
            total += abilityCost(pieceConfig) * p.count;
        }
    }
    return total;
}
