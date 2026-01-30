const POINT_BUDGET = 79;

const PIECE_ORDER = ["KING", "ROOK", "BISHOP", "GOLD", "SILVER", "KNIGHT", "LANCE", "PAWN"];

const PIECE_COUNTS = {
    KING: 1,
    ROOK: 1,
    BISHOP: 1,
    GOLD: 2,
    SILVER: 2,
    KNIGHT: 2,
    LANCE: 2,
    PAWN: 9,
};

const PIECE_LABELS = {
    KING: { 1: "王", 2: "玉" },
    ROOK: { 1: "飛", 2: "飛" },
    BISHOP: { 1: "角", 2: "角" },
    GOLD: { 1: "金", 2: "金" },
    SILVER: { 1: "銀", 2: "銀" },
    KNIGHT: { 1: "桂", 2: "桂" },
    LANCE: { 1: "香", 2: "香" },
    PAWN: { 1: "歩", 2: "歩" },
};

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createEmptyAbilities() {
    return {
        step: { n: false, s: false, e: false, w: false, ne: false, nw: false, se: false, sw: false },
        knight: false,
        slide: { forward: false, orthogonal: false, diagonal: false },
    };
}

function mergeAbilities(base, extra) {
    const merged = createEmptyAbilities();
    for (const key of Object.keys(merged.step)) {
        merged.step[key] = Boolean(base?.step?.[key] || extra?.step?.[key]);
    }
    merged.knight = Boolean(base?.knight || extra?.knight);
    for (const key of Object.keys(merged.slide)) {
        merged.slide[key] = Boolean(base?.slide?.[key] || extra?.slide?.[key]);
    }
    return merged;
}

function abilityCost(abilities) {
    let cost = 0;
    for (const value of Object.values(abilities.step)) {
        if (value) {
            cost += 1;
        }
    }
    if (abilities.knight) {
        cost += 2;
    }
    if (abilities.slide.forward) {
        cost += 4;
    }
    if (abilities.slide.orthogonal) {
        cost += 4;
    }
    if (abilities.slide.diagonal) {
        cost += 4;
    }
    return cost;
}

function standardConfigForPlayer() {
    const cfg = {};

    const king = createEmptyAbilities();
    for (const key of Object.keys(king.step)) {
        king.step[key] = true;
    }
    cfg.KING = king;

    const rook = createEmptyAbilities();
    rook.slide.orthogonal = true;
    cfg.ROOK = rook;

    const bishop = createEmptyAbilities();
    bishop.slide.diagonal = true;
    cfg.BISHOP = bishop;

    const gold = createEmptyAbilities();
    gold.step.n = true;
    gold.step.s = true;
    gold.step.e = true;
    gold.step.w = true;
    gold.step.ne = true;
    gold.step.nw = true;
    cfg.GOLD = gold;

    const silver = createEmptyAbilities();
    silver.step.n = true;
    silver.step.ne = true;
    silver.step.nw = true;
    silver.step.se = true;
    silver.step.sw = true;
    cfg.SILVER = silver;

    const knight = createEmptyAbilities();
    knight.knight = true;
    cfg.KNIGHT = knight;

    const lance = createEmptyAbilities();
    lance.slide.forward = true;
    cfg.LANCE = lance;

    const pawn = createEmptyAbilities();
    pawn.step.n = true;
    cfg.PAWN = pawn;

    return cfg;
}

function totalConfigCost(config) {
    let total = 0;
    for (const [kind, count] of Object.entries(PIECE_COUNTS)) {
        total += abilityCost(config[kind]) * count;
    }
    return total;
}

function withinBoard(r, c) {
    return r >= 0 && r < 9 && c >= 0 && c < 9;
}

function forwardSign(owner) {
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

function generateMoves(board, fromR, fromC, piece, ownerConfig, includeOwnCapture = false) {
    const abilities = mergeAbilities(ownerConfig[piece.kind], piece.promoted ? piece.extraAbilities : null);
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

function createEmptyBoard() {
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
}

function placeInitialPieces(board) {
    const place = (r, c, kind, owner) => {
        board[r][c] = { kind, owner, promoted: false, extraAbilities: null };
    };

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

function promotionZoneRowsForOwner(owner) {
    return owner === 1 ? new Set([0, 1, 2]) : new Set([6, 7, 8]);
}

function canPromote(kind) {
    return kind !== "KING" && kind !== "GOLD";
}

function pieceLabel(piece) {
    const base = PIECE_LABELS[piece.kind][piece.owner];
    if (!piece.promoted) return base;
    return `成${base}`;
}

function handInit() {
    return { KING: 0, ROOK: 0, BISHOP: 0, GOLD: 0, SILVER: 0, KNIGHT: 0, LANCE: 0, PAWN: 0 };
}

function countHand(hand) {
    return Object.values(hand).reduce((a, b) => a + b, 0);
}

class GameApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.state = {
            screen: "title",
            names: { 1: "プレイヤー1", 2: "プレイヤー2" },
            designTurn: 1,
            config: { 1: standardConfigForPlayer(), 2: standardConfigForPlayer() },
            play: null,
        };
        this._promotionModal = null;
        this._designEditModal = null;
    }

    connectedCallback() {
        this.render();
        this.shadowRoot.addEventListener("click", (e) => this.onClick(e));
        this.shadowRoot.addEventListener("input", (e) => this.onInput(e));
    }

    setState(patch) {
        this.state = { ...this.state, ...patch };
        this.render();
    }

    onClick(e) {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const el = target.closest("[data-action]");
        if (!(el instanceof HTMLElement)) return;

        const action = el.dataset.action;
        if (action === "start") {
            this.setState({ screen: "names" });
            return;
        }
        if (action === "to-title") {
            this.setState({ screen: "title", play: null, designTurn: 1, config: { 1: standardConfigForPlayer(), 2: standardConfigForPlayer() } });
            return;
        }
        if (action === "to-design") {
            this.setState({ screen: "design", designTurn: 1 });
            return;
        }
        if (action === "next-design") {
            const next = this.state.designTurn === 1 ? 2 : null;
            if (next) {
                this.setState({ designTurn: next });
            } else {
                const board = createEmptyBoard();
                placeInitialPieces(board);
                this.setState({
                    screen: "play",
                    play: {
                        board,
                        hands: { 1: handInit(), 2: handInit() },
                        turn: 1,
                        selection: null,
                        drop: null,
                        legal: [],
                        message: "",
                        winner: null,
                        dissolve: false,
                    },
                });
            }
            return;
        }
        if (action === "reset-standard") {
            const player = Number(el.dataset.player);
            const config = deepClone(this.state.config);
            config[player] = standardConfigForPlayer();
            this.setState({ config });
            return;
        }

        if (action === "design-piece-click") {
            const kind = el.dataset.kind;
            if (!kind) return;
            const player = this.state.designTurn;
            const currentConfig = this.state.config[player][kind];
            this._designEditModal = {
                kind,
                player,
                tempConfig: deepClone(currentConfig)
            };
            this.render();
            return;
        }

        if (action === "toggle-design-ability") {
            const key = el.dataset.key;
            const modal = this._designEditModal;
            if (!modal) return;
            const temp = modal.tempConfig;

            if (key.startsWith("step.")) {
                const dir = key.slice("step.".length);
                temp.step[dir] = !temp.step[dir];
            } else if (key === "knight") {
                temp.knight = !temp.knight;
            } else if (key.startsWith("slide.")) {
                const slideKey = key.slice("slide.".length);
                temp.slide[slideKey] = !temp.slide[slideKey];
            }
            this.render();
            return;
        }

        if (action === "confirm-design-edit") {
            const modal = this._designEditModal;
            if (!modal) return;
            const player = modal.player;
            const kind = modal.kind;
            const config = deepClone(this.state.config);
            config[player][kind] = modal.tempConfig;

            this._designEditModal = null;
            this.setState({ config });
            return;
        }

        if (action === "cancel-design-edit") {
            this._designEditModal = null;
            this.render();
            return;
        }

        if (action === "square") {
            const r = Number(el.dataset.r);
            const c = Number(el.dataset.c);
            this.onSquareClick(r, c);
            return;
        }

        if (action === "hand") {
            const owner = Number(el.dataset.owner);
            const kind = el.dataset.kind;
            this.onHandClick(owner, kind);
            return;
        }

        if (action === "cancel-select") {
            this.clearSelection();
            return;
        }

        if (action === "confirm-promo") {
            this.confirmPromotion();
            return;
        }

        if (action === "cancel-promo") {
            this.cancelPromotion();
            return;
        }
    }

    onInput(e) {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        const nameKey = target.dataset.name;
        if (!nameKey) return;
        const player = Number(nameKey);
        const names = { ...this.state.names, [player]: target.value || (player === 1 ? "プレイヤー1" : "プレイヤー2") };
        this.setState({ names });
    }

    clearSelection() {
        if (!this.state.play) return;
        const play = { ...this.state.play, selection: null, drop: null, legal: [], message: "" };
        this.setState({ play });
    }

    onHandClick(owner, kind) {
        if (!this.state.play) return;
        const play = deepClone(this.state.play);
        if (play.turn !== owner) return;
        if (!play.hands[owner][kind]) return;
        if (play.drop && play.drop.kind === kind) {
            play.drop = null;
        } else {
            play.drop = { owner, kind };
            play.selection = null;
        }
        play.legal = [];
        play.message = "持ち駒を配置するマスを選んでください。";
        this.setState({ play });
    }

    onSquareClick(r, c) {
        const play = this.state.play;
        if (!play || play.winner) return;

        const board = play.board;
        const here = board[r][c];

        if (play.drop) {
            if (here) return;
            this.executeDrop(r, c);
            return;
        }

        if (!play.selection) {
            if (!here || here.owner !== play.turn) return;
            this.selectPiece(r, c);
            return;
        }

        const { r: sr, c: sc } = play.selection;
        if (sr === r && sc === c) {
            this.clearSelection();
            return;
        }

        const isLegal = play.legal.find((m) => m.r === r && m.c === c);
        if (isLegal) {
            this.executeMove(sr, sc, r, c);
            return;
        }

        if (here && here.owner === play.turn) {
            this.selectPiece(r, c);
        }
    }

    selectPiece(r, c) {
        const play = deepClone(this.state.play);
        const piece = play.board[r][c];
        if (!piece) return;
        const ownerConfig = this.state.config[piece.owner];
        play.selection = { r, c };
        play.drop = null;
        play.legal = generateMoves(play.board, r, c, piece, ownerConfig);
        play.message = "移動先を選択してください。";
        this.setState({ play });
    }

    executeDrop(r, c) {
        const play = deepClone(this.state.play);
        const { owner, kind } = play.drop;
        play.hands[owner][kind] -= 1;
        play.board[r][c] = { kind, owner, promoted: false, extraAbilities: null };
        play.drop = null;
        play.selection = null;
        play.legal = [];
        play.message = "";
        this.endTurn(play);
    }

    executeMove(fromR, fromC, toR, toC) {
        const play = deepClone(this.state.play);
        const moving = play.board[fromR][fromC];
        const target = play.board[toR][toC];
        if (!moving) return;

        if (target) {
            if (target.kind === "KING") {
                play.winner = moving.owner;
                play.board[toR][toC] = { ...moving, owner: moving.owner };
                play.board[fromR][fromC] = null;
                play.selection = null;
                play.legal = [];
                play.message = "";
                this.setState({ play });
                return;
            }
            play.hands[moving.owner][target.kind] += 1;
        }

        play.board[toR][toC] = moving;
        play.board[fromR][fromC] = null;
        play.selection = null;
        play.legal = [];
        play.message = "";

        const entersZone = promotionZoneRowsForOwner(moving.owner).has(toR);
        const leavesZone = promotionZoneRowsForOwner(moving.owner).has(fromR);
        const maybePromote = canPromote(moving.kind) && (entersZone || leavesZone);

        if (maybePromote && !moving.promoted) {
            this.openPromotionModal(play, toR, toC);
            return;
        }

        this.endTurn(play);
    }

    endTurn(play) {
        const nextTurn = play.turn === 1 ? 2 : 1;
        const patched = { ...play, turn: nextTurn, drop: null, selection: null, legal: [], message: "", dissolve: false };
        this.animateTurnSwap(play, patched);
    }

    animateTurnSwap(currentPlay, nextPlay) {
        if (!this.state.play) {
            this.setState({ play: nextPlay });
            return;
        }
        this.setState({ play: { ...currentPlay, dissolve: true } });
        window.setTimeout(() => {
            this.setState({ play: { ...nextPlay, dissolve: true } });
            window.setTimeout(() => {
                this.setState({ play: { ...nextPlay, dissolve: false } });
            }, 20);
        }, 160);
    }

    openPromotionModal(pendingPlay, r, c) {
        this._promotionModal = {
            play: pendingPlay,
            at: { r, c },
            extra: createEmptyAbilities(),
        };
        this.render();
    }

    promoCost() {
        if (!this._promotionModal) return 0;
        const extra = this._promotionModal.extra;
        const trimmed = createEmptyAbilities();
        trimmed.step = extra.step;
        trimmed.knight = extra.knight;
        // スライドはプロモーション購入対象外（+2を超えやすい＆UI簡略）
        return abilityCost(trimmed);
    }

    togglePromoExtra(key) {
        if (!this._promotionModal) return;
        if (key.startsWith("step.")) {
            const dir = key.slice("step.".length);
            this._promotionModal.extra.step[dir] = !this._promotionModal.extra.step[dir];
        } else if (key === "knight") {
            this._promotionModal.extra.knight = !this._promotionModal.extra.knight;
        }

        if (this.promoCost() > 2) {
            // 超過したら反転を戻す
            if (key.startsWith("step.")) {
                const dir = key.slice("step.".length);
                this._promotionModal.extra.step[dir] = !this._promotionModal.extra.step[dir];
            } else if (key === "knight") {
                this._promotionModal.extra.knight = !this._promotionModal.extra.knight;
            }
        }
        this.render();
    }

    confirmPromotion() {
        const modal = this._promotionModal;
        if (!modal) return;
        const { play, at } = modal;
        const piece = play.board[at.r][at.c];
        if (piece) {
            piece.promoted = true;
            piece.extraAbilities = { step: modal.extra.step, knight: modal.extra.knight, slide: { forward: false, orthogonal: false, diagonal: false } };
        }
        this._promotionModal = null;
        this.endTurn(play);
    }

    cancelPromotion() {
        const modal = this._promotionModal;
        if (!modal) return;
        const play = modal.play;
        this._promotionModal = null;
        this.endTurn(play);
    }

    render() {
        const { screen } = this.state;
        const html = `
            <link rel="stylesheet" href="./styles.css" />
            <div class="app">
                ${screen === "title" ? this.renderTitle() : ""}
                ${screen === "names" ? this.renderNames() : ""}
                ${screen === "design" ? this.renderDesign() : ""}
                ${screen === "play" ? this.renderPlay() : ""}
            </div>
            ${this._promotionModal ? this.renderPromotionModal() : ""}
            ${this._designEditModal ? this.renderDesignEditModal() : ""}
        `;
        this.shadowRoot.innerHTML = html;

        if (this._promotionModal) {
            this.shadowRoot.querySelectorAll("[data-promo-toggle]").forEach((el) => {
                el.addEventListener("click", () => {
                    const key = el.dataset.promoToggle;
                    this.togglePromoExtra(key);
                });
            });
        }
    }

    renderTitle() {
        return `
            <div class="title-screen">
                <img src="./title.svg" class="title-logo" alt="設計将棋" />
                <button class="btn-confirm" data-action="start">はじめる</button>
            </div>
        `;
    }

    renderNames() {
        return `
            <div class="names-container">
                <h2 class="names-title">名前を入力</h2>
                <p class="names-subtitle">なにも書かないとスキップ</p>
                
                <div class="names-group">
                    <div class="names-field">
                        <label>プレイヤー1</label>
                        <input class="names-input" data-name="1" value="${escapeHtml(this.state.names[1])}" placeholder="名前を入力..." />
                    </div>
                    <div class="names-field">
                        <label>プレイヤー2</label>
                        <input class="names-input" data-name="2" value="${escapeHtml(this.state.names[2])}" placeholder="名前を入力..." />
                    </div>
                </div>

                <button class="btn-confirm" data-action="to-design">確定</button>
                
                <button class="btn secondary" data-action="to-title" style="margin-top: -20px;">戻る</button>
            </div>
        `;
    }

    renderDesign() {
        const player = this.state.designTurn;
        const cfg = this.state.config[player];
        const cost = totalConfigCost(cfg);
        const remaining = POINT_BUDGET - cost;
        const canContinue = remaining >= 0;
        const playerName = this.state.names[player];
        const title = `設計フェーズ：${playerName}`;

        return `
            <div class="card" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <h2 class="title">${escapeHtml(title)}</h2>
                <div class="row">
                    <span class="pill">持ちポイント: <span class="kpi">${POINT_BUDGET}</span></span>
                    <span class="pill">使用中: <span class="kpi">${cost}</span></span>
                    <span class="pill">残り: <span class="kpi">${remaining}</span></span>
                    <button class="btn secondary" data-action="reset-standard" data-player="${player}">将棋準拠に戻す</button>
                </div>
                
                <div class="design-board-wrap">
                    ${this.renderDesignBoard(player)}
                </div>

                <div class="row">
                    <button class="btn" data-action="next-design" ${canContinue ? "" : "disabled"}>${player === 1 ? "プレイヤー2の設計へ" : "プレイ開始"}</button>
                    <button class="btn secondary" data-action="to-title">最初へ</button>
                </div>
                <p class="small">駒をクリックして能力を設計してください。</p>
            </div>
        `;
    }

    renderDesignBoard(player) {
        // We simulate a board state for design phase
        const board = createEmptyBoard();
        placeInitialPieces(board);

        let squares = "";
        for (let r = 0; r < 9; r += 1) {
            for (let c = 0; c < 9; c += 1) {
                const piece = board[r][c];
                // Only show pieces belonging to the current designing player (or all pieces if preferred, but usually design is symmetric)
                // For design, player 1 (bottom) is fine as reference.
                // But actually, we want to allow clicking pieces to edit that TYPE of piece.
                squares += `
                    <div class="square" data-action="design-piece-click" data-kind="${piece ? piece.kind : ""}" data-player="${player}">
                        ${piece ? `<div class="piece owner-1">${escapeHtml(PIECE_LABELS[piece.kind][1])}</div>` : ""}
                    </div>
                `;
            }
        }
        return `<div class="board">${squares}</div>`;
    }

    renderDesignEditModal() {
        const modal = this._designEditModal;
        const cfg = modal.tempConfig;
        const count = PIECE_COUNTS[modal.kind];
        const costPer = abilityCost(cfg);
        const total = costPer * count;
        const isLocked = modal.kind === "KING";
        const label = PIECE_LABELS[modal.kind][1]; // Use player 1 labels for design

        const toggles = [
            { name: "前", key: "step.n", cost: 1, on: cfg.step.n },
            { name: "後", key: "step.s", cost: 1, on: cfg.step.s },
            { name: "右", key: "step.e", cost: 1, on: cfg.step.e },
            { name: "左", key: "step.w", cost: 1, on: cfg.step.w },
            { name: "前右", key: "step.ne", cost: 1, on: cfg.step.ne },
            { name: "前左", key: "step.nw", cost: 1, on: cfg.step.nw },
            { name: "後右", key: "step.se", cost: 1, on: cfg.step.se },
            { name: "後左", key: "step.sw", cost: 1, on: cfg.step.sw },
            { name: "桂ジャンプ", key: "knight", cost: 2, on: cfg.knight },
            { name: "前スライド", key: "slide.forward", cost: 4, on: cfg.slide.forward },
            { name: "縦横スライド", key: "slide.orthogonal", cost: 4, on: cfg.slide.orthogonal },
            { name: "斜めスライド", key: "slide.diagonal", cost: 4, on: cfg.slide.diagonal },
        ];

        const toggleHtml = toggles.map((t) => {
            const disabled = isLocked ? "aria-disabled=\"true\"" : "";
            return `
                <div class="toggle" data-action="${isLocked ? "" : "toggle-design-ability"}" data-key="${t.key}" data-on="${t.on}" ${disabled}>
                    <div class="name">${t.name}</div>
                    <div class="cost">${t.cost}</div>
                </div>
            `;
        }).join("");

        return `
            <div class="modal-backdrop">
                <div class="modal">
                    <h3>${label}の設計 <span>(計${count}枚 / 1枚:${costPer} / 合計:${total}pt)</span></h3>
                    <div class="space"></div>
                    <div class="toggles">
                        ${toggleHtml}
                    </div>
                    <div class="controls">
                        <button class="btn secondary" data-action="cancel-design-edit">キャンセル</button>
                        <button class="btn" data-action="confirm-design-edit">保存</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPlay() {
        const play = this.state.play;
        const themeClass = play.turn === 1 ? "turn-1" : "turn-2";
        const dissolveClass = play.dissolve ? "dissolve" : "";
        const p1Name = this.state.names[1];
        const p2Name = this.state.names[2];
        const status = play.winner
            ? `勝者：${escapeHtml(this.state.names[play.winner])}`
            : `手番：${escapeHtml(play.turn === 1 ? p1Name : p2Name)}`;

        const hand1 = this.renderHand(1);
        const hand2 = this.renderHand(2);
        const board = this.renderBoard();

        return `
            <div class="play-shell ${themeClass} ${dissolveClass}">
                <div class="play-topbar">
                    <div class="row">
                        <span class="pill">${status}</span>
                        <span class="pill">持ち駒: <span class="kpi">${countHand(play.hands[play.turn])}</span></span>
                        ${play.message ? `<span class="pill">${escapeHtml(play.message)}</span>` : ""}
                    </div>
                    <div class="row">
                        <button class="btn secondary" data-action="cancel-select">選択解除</button>
                        <button class="btn secondary" data-action="to-title">最初へ</button>
                    </div>
                </div>
                <div class="play-main">
                    <div class="hand ${themeClass === "turn-2" ? "turn-2-theme" : ""}">
                        ${hand2}
                    </div>
                    <div class="board-wrap">
                        ${board}
                        <div class="legend">クリック：駒選択 → 移動 / 持ち駒はクリック後、空マスへ配置</div>
                    </div>
                    <div class="hand ${themeClass === "turn-2" ? "turn-2-theme" : ""}">
                        ${hand1}
                    </div>
                </div>
            </div>
        `;
    }

    renderHand(owner) {
        const play = this.state.play;
        const isTurn = play.turn === owner;
        const selectedKind = play.drop?.owner === owner ? play.drop.kind : null;
        const items = PIECE_ORDER
            .filter((k) => k !== "KING")
            .map((kind) => {
                const cnt = play.hands[owner][kind];
                const disabled = !isTurn || cnt <= 0 ? "disabled" : "";
                const selected = selectedKind === kind ? "true" : "false";
                const label = PIECE_LABELS[kind][owner];
                return `
                    <button data-action="hand" data-owner="${owner}" data-kind="${kind}" ${disabled} data-selected="${selected}">
                        <span>${label}</span>
                        <span class="count">×${cnt}</span>
                    </button>
                `;
            })
            .join("");

        const title = owner === 1 ? `${escapeHtml(this.state.names[1])}（下）` : `${escapeHtml(this.state.names[2])}（上）`;
        return `
            <h4>
                <span>${title}</span>
                <span class="count">手番:${play.turn === owner ? "●" : " "}</span>
            </h4>
            <div class="hand-items">${items}</div>
        `;
    }

    renderBoard() {
        const play = this.state.play;
        const selected = play.selection;
        const legalMap = new Map(play.legal.map((m) => [`${m.r},${m.c}`, m]));

        let squares = "";
        for (let r = 0; r < 9; r += 1) {
            for (let c = 0; c < 9; c += 1) {
                const piece = play.board[r][c];
                const isSelected = selected && selected.r === r && selected.c === c;
                const legal = legalMap.get(`${r},${c}`);
                const moveAttr = legal && !legal.capture ? "true" : "false";
                const captureAttr = legal && legal.capture ? "true" : "false";
                squares += `
                    <div class="square" data-action="square" data-r="${r}" data-c="${c}" data-selected="${isSelected ? "true" : "false"}" data-move="${moveAttr}" data-capture="${captureAttr}">
                        ${piece ? `<div class="piece owner-${piece.owner}">${escapeHtml(pieceLabel(piece))}</div>` : ""}
                    </div>
                `;
            }
        }
        return `<div class="board">${squares}</div>`;
    }

    renderPromotionModal() {
        const modal = this._promotionModal;
        const cost = this.promoCost();
        const remaining = 2 - cost;

        const toggles = [
            { name: "前", key: "step.n", cost: 1, on: modal.extra.step.n },
            { name: "後", key: "step.s", cost: 1, on: modal.extra.step.s },
            { name: "右", key: "step.e", cost: 1, on: modal.extra.step.e },
            { name: "左", key: "step.w", cost: 1, on: modal.extra.step.w },
            { name: "前右", key: "step.ne", cost: 1, on: modal.extra.step.ne },
            { name: "前左", key: "step.nw", cost: 1, on: modal.extra.step.nw },
            { name: "後右", key: "step.se", cost: 1, on: modal.extra.step.se },
            { name: "後左", key: "step.sw", cost: 1, on: modal.extra.step.sw },
            { name: "桂ジャンプ", key: "knight", cost: 2, on: modal.extra.knight },
        ];

        const toggleHtml = toggles.map((t) => {
            return `
                <div class="toggle" data-promo-toggle="${t.key}" data-on="${t.on}">
                    <div class="name">${t.name}</div>
                    <div class="cost">${t.cost}</div>
                </div>
            `;
        }).join("");

        return `
            <div class="modal-backdrop">
                <div class="modal">
                    <h3>成りますか？（追加能力：最大 +2）</h3>
                    <div class="row">
                        <span class="pill">使用: <span class="kpi">${cost}</span></span>
                        <span class="pill">残り: <span class="kpi">${remaining}</span></span>
                    </div>
                    <div class="space"></div>
                    <div class="toggles">
                        ${toggleHtml}
                    </div>
                    <div class="controls">
                        <button class="btn secondary" data-action="cancel-promo">ならない</button>
                        <button class="btn" data-action="confirm-promo">成る</button>
                    </div>
                    <p class="small">※ この画面では「スライド」能力は購入対象外（UI簡略）。</p>
                </div>
            </div>
        `;
    }
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

customElements.define("game-app", GameApp);
