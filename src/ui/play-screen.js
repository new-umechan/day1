import { escapeHtml } from '../utils.js';
import { pieceLabel, PIECES_DATA, abilityCost, createEmptyAbilities } from '../logic/pieces.js';
import { countHand } from '../logic/board.js';

export function renderPlay(state) {
    const play = state.play;
    const themeClass = play.turn === 1 ? "turn-1" : "turn-2";
    const dissolveClass = play.dissolve ? "dissolve" : "";
    const p1Name = state.names[1];
    const p2Name = state.names[2];
    const status = play.winner
        ? `勝者：${escapeHtml(state.names[play.winner])}`
        : `手番：${escapeHtml(play.turn === 1 ? p1Name : p2Name)}`;

    const hand1 = renderHand(state, 1);
    const hand2 = renderHand(state, 2);
    const board = renderBoard(play);

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

function renderHand(state, owner) {
    const play = state.play;
    const isTurn = play.turn === owner;
    const selectedKind = play.drop?.owner === owner ? play.drop.kind : null;
    const items = PIECES_DATA
        .filter((p) => p.id !== "KING")
        .map((p) => {
            const kind = p.id;
            const cnt = play.hands[owner][kind];
            const disabled = !isTurn || cnt <= 0 ? "disabled" : "";
            const selected = selectedKind === kind ? "true" : "false";
            const label = p.label;
            return `
                <button data-action="hand" data-owner="${owner}" data-kind="${kind}" ${disabled} data-selected="${selected}">
                    <span>${label}</span>
                    <span class="count">×${cnt}</span>
                </button>
            `;
        })
        .join("");

    const title = owner === 1 ? `${escapeHtml(state.names[1])}（下）` : `${escapeHtml(state.names[2])}（上）`;
    return `
        <h4>
            <span>${title}</span>
            <span class="count">手番:${play.turn === owner ? "●" : " "}</span>
        </h4>
        <div class="hand-items">${items}</div>
    `;
}

function renderBoard(play) {
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

export function renderPromotionModal(modal, promoCost) {
    const cost = promoCost();
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
