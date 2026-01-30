import { escapeHtml } from '../utils.js';
import { PIECES_DATA, getPieceMetadata, getPieceLabelByAbilities } from '../logic/pieces.js';
import { createEmptyBoard, placeInitialPieces } from '../logic/board.js';
import { totalConfigCost } from './helpers.js';
import { POINT_BUDGET } from '../constants.js';

function renderDesignBoardLayout(board, player, config) {
    let html = "";
    const rows = player === 1 ? [6, 7, 8] : [0, 1, 2];

    for (const r of rows) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.owner === player) {
                const abilities = config[piece.instanceId];
                const label = getPieceLabelByAbilities(abilities);
                html += `
                    <div class="square design-square piece-box" data-action="design-piece-click" data-instance-id="${piece.instanceId}">
                        <div class="piece owner-${player}">${escapeHtml(label)}</div>
                    </div>
                `;
            } else {
                html += '<div class="square design-square empty"></div>';
            }
        }
    }
    return `<div class="board territory-${player}">${html}</div>`;
}

export function renderDesign(state) {
    if (!state.loaded) return '<div class="card">Loading...</div>';

    const player = state.designTurn;
    const cfg = state.config[player];
    const cost = totalConfigCost(cfg);
    const playerName = state.names[player];
    const otherPlayerMemo = player === 1 ? "プレイヤー2はみないでね" : "プレイヤー1はみないでね";

    const board = createEmptyBoard();
    placeInitialPieces(board);
    const placedIds = new Set();
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c]) placedIds.add(board[r][c].instanceId);
        }
    }

    const allInstanceIds = Object.keys(cfg);
    const reserveIds = allInstanceIds.filter(id => !placedIds.has(id));

    const reserveHtml = reserveIds.map(id => {
        const abilities = cfg[id];
        const label = getPieceLabelByAbilities(abilities);
        return `
            <div class="reserve-piece" data-action="design-piece-click" data-instance-id="${id}">
                ${escapeHtml(label)}
            </div>
        `;
    }).join("");

    return `
        <div class="design-header" data-node-id="11:116">
            <h2 data-node-id="11:118">${escapeHtml(playerName)}の設計</h2>
            <p data-node-id="11:119">${escapeHtml(otherPlayerMemo)}</p>
        </div>

        <div class="design-container" data-node-id="11:120">
            <div class="design-top-bar" data-node-id="11:121">
                <button class="btn-pill" data-action="reset-player-design" data-node-id="13:430">reset</button>
                <div class="point-pill" data-node-id="11:122">point: ${cost}/${POINT_BUDGET}</div>
            </div>
            
            <div class="design-board-wrap" data-node-id="11:123">
                ${renderDesignBoardLayout(board, player, cfg)}
            </div>
        </div>

        <div class="row" style="margin-top: 40px; justify-content: center;">
            <div class="btn-confirm" data-action="next-design">
                ${player === 1 ? "確定して次へ" : "確定して対局開始"}
            </div>
        </div>
    `;
}

export function renderDesignEditModal(modal) {
    const cfg = modal.tempConfig;
    const [kind, idx] = modal.instanceId.split('-');
    const label = getPieceLabelByAbilities(cfg);
    const metadata = getPieceMetadata(kind);
    const displayName = metadata.fullName;
    const desc = metadata.description;

    const cells = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const isCenter = r === 2 && c === 2;
            let type = ""; // dot or triangle
            let abilityKey = "";
            let on = false;
            let dir = "";

            // Mapping offsets to abilities
            const dr = r - 2;
            const dc = c - 2;

            if (dr === -1 && dc === 0) { abilityKey = "step.n"; type = "dot"; on = cfg.step.n; }
            else if (dr === 1 && dc === 0) { abilityKey = "step.s"; type = "dot"; on = cfg.step.s; }
            else if (dr === 0 && dc === 1) { abilityKey = "step.e"; type = "dot"; on = cfg.step.e; }
            else if (dr === 0 && dc === -1) { abilityKey = "step.w"; type = "dot"; on = cfg.step.w; }
            else if (dr === -1 && dc === 1) { abilityKey = "step.ne"; type = "dot"; on = cfg.step.ne; }
            else if (dr === -1 && dc === -1) { abilityKey = "step.nw"; type = "dot"; on = cfg.step.nw; }
            else if (dr === 1 && dc === 1) { abilityKey = "step.se"; type = "dot"; on = cfg.step.se; }
            else if (dr === 1 && dc === -1) { abilityKey = "step.sw"; type = "dot"; on = cfg.step.sw; }

            // Outer ring for slides/knight
            else if (dr === -2 && dc === 0) { abilityKey = "slide.forward"; type = "triangle"; dir = "n"; on = cfg.slide.forward; }
            else if (dr === 0 && dc === 2) { abilityKey = "slide.orthogonal"; type = "triangle"; dir = "e"; on = cfg.slide.orthogonal; }
            else if (dr === 0 && dc === -2) { abilityKey = "slide.orthogonal"; type = "triangle"; dir = "w"; on = cfg.slide.orthogonal; }
            else if (dr === 2 && dc === 0) { abilityKey = "slide.orthogonal"; type = "triangle"; dir = "s"; on = cfg.slide.orthogonal; }
            else if (dr === -2 && dc === 2) { abilityKey = "slide.diagonal"; type = "triangle"; dir = "ne"; on = cfg.slide.diagonal; }
            else if (dr === -2 && dc === -2) { abilityKey = "slide.diagonal"; type = "triangle"; dir = "nw"; on = cfg.slide.diagonal; }
            else if (dr === 2 && dc === 2) { abilityKey = "slide.diagonal"; type = "triangle"; dir = "se"; on = cfg.slide.diagonal; }
            else if (dr === 2 && dc === -2) { abilityKey = "slide.diagonal"; type = "triangle"; dir = "sw"; on = cfg.slide.diagonal; }

            // Knight
            else if (dr === -2 && (dc === 1 || dc === -1)) { abilityKey = "knight"; type = "dot"; on = cfg.knight; }

            cells.push({ r, c, isCenter, type, abilityKey, on, dir });
        }
    }

    const gridHtml = cells.map(cell => {
        if (cell.isCenter) {
            return `
                <div class="move-cell center">
                    <div class="koma-icon-wrap">
                        <img src="./assets/koma.svg" class="koma-svg" />
                        <span class="koma-text">${escapeHtml(label)}</span>
                    </div>
                </div>
            `;
        }

        let inner = "";
        if (cell.type === "dot") {
            inner = cell.on ? '<div class="dot active"></div>' : '';
        } else if (cell.type === "triangle") {
            const isDiag = cell.dir.length > 1; // ne, nw, se, sw
            const src = isDiag ? './assets/ArrowDiagonal.svg' : './assets/ArrowStandard.svg';
            inner = `<img src="${src}" class="arrow-svg ${cell.dir} ${cell.on ? 'active' : ''}" />`;
        }

        const action = cell.abilityKey ? `data-action="toggle-design-ability" data-key="${cell.abilityKey}"` : "";
        return `<div class="move-cell ${cell.type === 'triangle' ? 'triangle-cell' : ''}" ${action}>${inner}</div>`;
    }).join("");

    // Lines for slides
    let linesHtml = "";
    if (cfg.slide.forward) linesHtml += '<div class="slide-line dir-n"></div>';
    if (cfg.slide.orthogonal) {
        linesHtml += '<div class="slide-line dir-e"></div>';
        linesHtml += '<div class="slide-line dir-w"></div>';
        linesHtml += '<div class="slide-line dir-s"></div>';
    }
    if (cfg.slide.diagonal) {
        linesHtml += '<div class="slide-line dir-ne"></div>';
        linesHtml += '<div class="slide-line dir-nw"></div>';
        linesHtml += '<div class="slide-line dir-se"></div>';
        linesHtml += '<div class="slide-line dir-sw"></div>';
    }

    return `
        <div class="modal-backdrop editor-backdrop" data-action="design-edit-close" data-node-id="13:259">
            <div class="editor-layout">
                <div class="move-editor-container" onclick="event.stopPropagation()">
                    <div style="position: absolute; top: 0; left: 40px; color: white; cursor: pointer;" data-action="reset-piece-ability">Reset</div>
                    <div class="move-grid" data-node-id="13:356">
                        ${gridHtml}
                        ${linesHtml}
                    </div>
                </div>

                <div class="editor-side">
                    <h2 data-node-id="3:366">${escapeHtml(displayName)}</h2>
                    <p data-node-id="13:361">${escapeHtml(desc)}</p>
                </div>
            </div>

            <div class="editor-close" data-action="design-edit-close" data-node-id="13:437">
                <div class="x-icon" data-node-id="13:435"></div>
                <div class="label" data-node-id="13:436">(Esc)</div>
            </div>
        </div>
    `;
}
