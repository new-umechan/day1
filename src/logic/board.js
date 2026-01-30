import { PIECES_DATA, mergeAbilities, createEmptyAbilities } from './pieces.js';
import { deepClone } from '../utils.js';

export function withinBoard(r, c) {
    return r >= 0 && r < 9 && c >= 0 && c < 9;
}

export function forwardSign(owner) {
    return owner === 1 ? -1 : 1;
}

function stepDeltasForOwner(step, owner) {
    const fs = forwardSign(owner);
    const deltas = [];
    if (step.n) deltas.push([1 * fs, 0]);
    if (step.s) deltas.push([-1 * fs, 0]);
    if (step.e) deltas.push([0, 1]);
    if (step.w) deltas.push([0, -1]);
    if (step.ne) deltas.push([1 * fs, 1]);
    if (step.nw) deltas.push([1 * fs, -1]);
    if (step.se) deltas.push([-1 * fs, 1]);
    if (step.sw) deltas.push([-1 * fs, -1]);
    return deltas;
}

export function generateMoves(board, fromR, fromC, piece, ownerConfig, includeOwnCapture = false) {
    const configKey = piece.instanceId || piece.kind;
    const abilities = mergeAbilities(ownerConfig[configKey], piece.promoted ? piece.extraAbilities : null);
    const moves = [];
    const owner = piece.owner;

    for (const [dr, dc] of stepDeltasForOwner(abilities.step, owner)) {
        const r = fromR + dr;
        const c = fromC + dc;
        if (!withinBoard(r, c)) continue;
        const target = board[r][c];
        if (!target || target.owner !== owner || includeOwnCapture) {
            moves.push({ r, c, capture: Boolean(target && target.owner !== owner) });
        }
    }

    if (abilities.knight) {
        const fs = forwardSign(owner);
        const candidates = [
            [2 * fs, -1],
            [2 * fs, 1],
        ];
        for (const [dr, dc] of candidates) {
            const r = fromR + dr;
            const c = fromC + dc;
            if (!withinBoard(r, c)) continue;
            const target = board[r][c];
            if (!target || target.owner !== owner || includeOwnCapture) {
                moves.push({ r, c, capture: Boolean(target && target.owner !== owner) });
            }
        }
    }

    const slideDirs = [];
    if (abilities.slide.forward) {
        slideDirs.push([forwardSign(owner), 0]);
    }
    if (abilities.slide.orthogonal) {
        slideDirs.push([forwardSign(owner), 0], [-forwardSign(owner), 0], [0, 1], [0, -1]);
    }
    if (abilities.slide.diagonal) {
        slideDirs.push([forwardSign(owner), 1], [forwardSign(owner), -1], [-forwardSign(owner), 1], [-forwardSign(owner), -1]);
    }

    for (const [dr, dc] of slideDirs) {
        let r = fromR + dr;
        let c = fromC + dc;
        while (withinBoard(r, c)) {
            const target = board[r][c];
            if (!target) {
                moves.push({ r, c, capture: false });
            } else {
                if (target.owner !== owner || includeOwnCapture) {
                    moves.push({ r, c, capture: target.owner !== owner });
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }

    const dedup = new Map();
    for (const m of moves) {
        const key = `${m.r},${m.c}`;
        if (!dedup.has(key)) dedup.set(key, m);
        else if (m.capture) dedup.set(key, m);
    }
    return [...dedup.values()];
}

export function createEmptyBoard() {
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
}

export function placeInitialPieces(board) {
    const counts = {};
    const place = (r, c, kind, owner) => {
        if (!counts[kind]) counts[kind] = 0;
        const instanceId = `${kind}-${counts[kind]}`;
        counts[kind]++;
        board[r][c] = { kind, owner, configOwner: owner, promoted: false, extraAbilities: null, instanceId };
    };

    // Resetting counts per player setup would be better, but for initial setup:
    // Actually, each player has their own set of instances.
    // In standard shogi, player 1 and 2 pieces are identical in type and count.

    // Player 2 (top)
    place(0, 0, "LANCE", 2);
    place(0, 1, "KNIGHT", 2);
    place(0, 2, "SILVER", 2);
    place(0, 3, "GOLD", 2);
    place(0, 4, "KING", 2);
    place(0, 5, "GOLD", 2);
    place(0, 6, "SILVER", 2);
    place(0, 7, "KNIGHT", 2);
    place(0, 8, "LANCE", 2);
    place(1, 1, "ROOK", 2);
    place(1, 7, "BISHOP", 2);
    for (let c = 0; c < 9; c += 1) {
        place(2, c, "PAWN", 2);
    }

    // Reset counts for player 1
    // (In reality, they use the same instanceIds but in different config buckets config[1] vs config[2])
    for (let key in counts) counts[key] = 0;

    // Player 1 (bottom)
    place(8, 0, "LANCE", 1);
    place(8, 1, "KNIGHT", 1);
    place(8, 2, "SILVER", 1);
    place(8, 3, "GOLD", 1);
    place(8, 4, "KING", 1);
    place(8, 5, "GOLD", 1);
    place(8, 6, "SILVER", 1);
    place(8, 7, "KNIGHT", 1);
    place(8, 8, "LANCE", 1);
    place(7, 7, "ROOK", 1);
    place(7, 1, "BISHOP", 1);
    for (let c = 0; c < 9; c += 1) {
        place(6, c, "PAWN", 1);
    }
}

export function promotionZoneRowsForOwner(owner) {
    return owner === 1 ? new Set([0, 1, 2]) : new Set([6, 7, 8]);
}

export function canPromote(kind) {
    return kind !== "KING" && kind !== "GOLD" && kind !== "FUDO" && kind !== "CHUNIN";
}

export function handInit() {
    const hand = {};
    for (const p of PIECES_DATA) {
        hand[p.id] = [];
    }
    return hand;
}

export function countHand(hand) {
    return Object.values(hand).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
}

export function standardConfigForPlayer() {
    const cfg = {};
    for (const p of PIECES_DATA) {
        for (let i = 0; i < p.count; i++) {
            cfg[`${p.id}-${i}`] = deepClone(p.abilities);
        }
    }
    return cfg;
}
