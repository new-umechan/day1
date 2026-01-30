export function createEmptyAbilities() {
    return {
        step: { n: false, s: false, e: false, w: false, ne: false, nw: false, se: false, sw: false },
        knight: false,
        slide: { forward: false, orthogonal: false, diagonal: false },
    };
}

export let PIECES_DATA = [
    { id: "KING", label: "王", count: 1, abilities: createEmptyAbilities() },
    { id: "FUDO", label: "不動", count: 2, abilities: createEmptyAbilities() },
    { id: "CHUNIN", label: "仲人", count: 2, abilities: createEmptyAbilities() },
    { id: "ROOK", label: "飛", count: 1, abilities: createEmptyAbilities() },
    { id: "BISHOP", label: "角", count: 1, abilities: createEmptyAbilities() },
    { id: "GOLD", label: "金", count: 2, abilities: createEmptyAbilities() },
    { id: "SILVER", label: "銀", count: 2, abilities: createEmptyAbilities() },
    { id: "KNIGHT", label: "桂", count: 2, abilities: createEmptyAbilities() },
    { id: "LANCE", label: "香", count: 2, abilities: createEmptyAbilities() },
    { id: "PAWN", label: "歩", count: 9, abilities: createEmptyAbilities() },
];

export function updatePiecesData(newData) {
    if (newData && newData.length > 0) {
        PIECES_DATA = newData;
    }
}

export function parsePiecesYaml(text) {
    const pieces = [];
    const lines = text.split('\n');
    let current = null;

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed === 'pieces:') continue;

        if (trimmed.startsWith('- id:')) {
            const id = trimmed.split(':')[1].trim().replace(/['"]/g, '');
            current = { id, label: id, count: 0, abilities: createEmptyAbilities() };
            pieces.push(current);
        } else if (current) {
            if (trimmed.startsWith('label:')) {
                current.label = trimmed.split(':')[1].trim().replace(/['"]/g, '');
            } else if (trimmed.startsWith('count:')) {
                current.count = parseInt(trimmed.split(':')[1].trim()) || 0;
            } else if (trimmed.startsWith('step:')) {
                const inner = trimmed.split('{')[1]?.split('}')[0];
                if (inner) {
                    const parts = inner.split(',');
                    for (let p of parts) {
                        const [k, v] = p.split(':').map(s => s.trim());
                        if (k && current.abilities.step.hasOwnProperty(k)) {
                            current.abilities.step[k] = v === 'true';
                        }
                    }
                }
            } else if (trimmed.startsWith('knight:')) {
                current.abilities.knight = trimmed.split(':')[1].trim() === 'true';
            } else if (trimmed.startsWith('slide:')) {
                const inner = trimmed.split('{')[1]?.split('}')[0];
                if (inner) {
                    const parts = inner.split(',');
                    for (let p of parts) {
                        const [k, v] = p.split(':').map(s => s.trim());
                        if (k && current.abilities.slide.hasOwnProperty(k)) {
                            current.abilities.slide[k] = v === 'true';
                        }
                    }
                }
            }
        }
    }
    return pieces.length > 0 ? pieces : PIECES_DATA;
}

export function mergeAbilities(base, extra) {
    const merged = createEmptyAbilities();
    if (base) {
        for (const key of Object.keys(merged.step)) {
            merged.step[key] = Boolean(base.step?.[key] || extra?.step?.[key]);
        }
        merged.knight = Boolean(base.knight || extra?.knight);
        for (const key of Object.keys(merged.slide)) {
            merged.slide[key] = Boolean(base.slide?.[key] || extra?.slide?.[key]);
        }
    }
    return merged;
}

export function abilityCost(abilities) {
    if (!abilities) return 0;
    let cost = 0;
    if (abilities.step) {
        for (const value of Object.values(abilities.step)) {
            if (value) cost += 10;
        }
    }
    if (abilities.knight) cost += 20;
    if (abilities.slide) {
        if (abilities.slide.forward) cost += 40;
        if (abilities.slide.orthogonal) cost += 40;
        if (abilities.slide.diagonal) cost += 40;
    }
    return cost;
}

export function pieceLabel(piece) {
    const data = PIECES_DATA.find(p => p.id === piece.kind);
    const base = data ? data.label : piece.kind;
    if (!piece.promoted) return base;
    return `成${base}`;
}
