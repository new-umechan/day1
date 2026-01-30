import { escapeHtml } from '../utils.js';
import { PIECES_DATA, abilityCost } from '../logic/pieces.js';
import { totalConfigCost } from './helpers.js';
import { POINT_BUDGET } from '../constants.js';

export function renderDesign(state) {
    if (!state.loaded) return '<div class="card">Loading...</div>';

    const player = state.designTurn;
    const cfg = state.config[player];
    const cost = totalConfigCost(cfg);
    const remaining = POINT_BUDGET - cost;
    const canContinue = remaining >= 0;
    const playerName = state.names[player];
    const otherPlayerMemo = player === 1 ? "プレイヤー2はみないでね" : "プレイヤー1はみないでね";

    return `
        <div class="design-header">
            <h2>${escapeHtml(playerName)}の設計</h2>
            <p>${escapeHtml(otherPlayerMemo)}</p>
        </div>

        <div class="design-container">
            <div class="design-points">point: ${cost}/${POINT_BUDGET}</div>
            <div class="piece-grid">
                ${renderDesignBoard(player)}
            </div>
        </div>

        <div class="row" style="margin-top: 40px;">
            <button class="btn" data-action="next-design" ${canContinue ? "" : "disabled"}>
                ${player === 1 ? "確定して次へ" : "確定して対局開始"}
            </button>
            <button class="btn secondary" data-action="to-title">タイトルへ戻る</button>
        </div>
    `;
}

function renderDesignBoard(player) {
    const layout = [
        ["FUDO", "FUDO", "PAWN", "PAWN", "FUDO", "FUDO", "FUDO", "FUDO", "FUDO"],
        [null, "FUDO", null, null, null, null, null, "ROOK", null],
        ["FUDO", "FUDO", "FUDO", "FUDO", "FUDO", "FUDO", "SILVER", "SILVER", "KNIGHT"]
    ];

    let html = "";
    for (let row of layout) {
        for (let kind of row) {
            if (!kind) {
                html += '<div class="piece-card empty"></div>';
                continue;
            }
            const data = PIECES_DATA.find(p => p.id === kind);
            const label = data ? data.label : kind;
            html += `
                <div class="piece-card" data-action="design-piece-click" data-kind="${kind}">
                    <div class="label">${escapeHtml(label)}</div>
                </div>
            `;
        }
    }
    return html;
}

export function renderDesignEditModal(modal) {
    const cfg = modal.tempConfig;
    const pData = PIECES_DATA.find(p => p.id === modal.kind);
    const count = pData ? pData.count : 1;
    const costPer = abilityCost(cfg);
    const isLocked = modal.kind === "KING";
    const label = pData ? pData.label : modal.kind;

    const toggles = [
        { name: "前", key: "step.n", cost: 10, on: cfg.step.n },
        { name: "後", key: "step.s", cost: 10, on: cfg.step.s },
        { name: "右", key: "step.e", cost: 10, on: cfg.step.e },
        { name: "左", key: "step.w", cost: 10, on: cfg.step.w },
        { name: "前右", key: "step.ne", cost: 10, on: cfg.step.ne },
        { name: "前左", key: "step.nw", cost: 10, on: cfg.step.nw },
        { name: "後右", key: "step.se", cost: 10, on: cfg.step.se },
        { name: "後左", key: "step.sw", cost: 10, on: cfg.step.sw },
        { name: "桂ジャンプ", key: "knight", cost: 20, on: cfg.knight },
        { name: "前スライド", key: "slide.forward", cost: 40, on: cfg.slide.forward },
        { name: "縦横スライド", key: "slide.orthogonal", cost: 40, on: cfg.slide.orthogonal },
        { name: "斜めスライド", key: "slide.diagonal", cost: 40, on: cfg.slide.diagonal },
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
                <h3>${escapeHtml(label)}の設計 <span>(計${count}枚 / 1枚:${costPer}pt)</span></h3>
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
