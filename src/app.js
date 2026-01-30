import { POINT_BUDGET } from './constants.js';
import { deepClone } from './utils.js';
import {
    parsePiecesYaml,
    createEmptyAbilities,
    abilityCost,
    updatePiecesData
} from './logic/pieces.js';
import {
    withinBoard,
    forwardSign,
    generateMoves,
    createEmptyBoard,
    placeInitialPieces,
    promotionZoneRowsForOwner,
    canPromote,
    handInit,
    standardConfigForPlayer
} from './logic/board.js';
import { renderTitle } from './ui/title-screen.js';
import { renderNames } from './ui/names-screen.js';
import { renderDesign, renderDesignEditModal } from './ui/design-screen.js';
import { renderPlay, renderPromotionModal } from './ui/play-screen.js';

class GameApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.state = {
            screen: "title",
            names: { 1: "プレイヤー1", 2: "プレイヤー2" },
            designTurn: 1,
            config: { 1: {}, 2: {} },
            play: null,
            loaded: false,
        };
        this._promotionModal = null;
        this._designEditModal = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="./styles.css" />
            <div id="game-root"></div>
        `;
        this.render(); // Initial render for title screen

        this.initData();

        this.shadowRoot.addEventListener("click", (e) => this.onClick(e));
        this.shadowRoot.addEventListener("input", (e) => this.onInput(e));
    }

    async initData() {
        try {
            const res = await fetch('./pieces.yaml');
            if (!res.ok) throw new Error("Fetch failed");
            const text = await res.text();
            const pieces = parsePiecesYaml(text);
            updatePiecesData(pieces);
            this.setState({
                loaded: true,
                config: { 1: standardConfigForPlayer(), 2: standardConfigForPlayer() }
            });
        } catch (e) {
            console.error("YAML load fail", e);
            this.setState({
                loaded: true,
                config: { 1: standardConfigForPlayer(), 2: standardConfigForPlayer() }
            });
        }
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

        this.state.names[player] = target.value || (player === 1 ? "プレイヤー1" : "プレイヤー2");
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
        const root = this.shadowRoot.getElementById("game-root");
        if (!root) return;

        const { screen } = this.state;
        const html = `
            <div class="app">
                ${screen === "title" ? renderTitle() : ""}
                ${screen === "names" ? renderNames(this.state.names) : ""}
                ${screen === "design" ? renderDesign(this.state) : ""}
                ${screen === "play" ? renderPlay(this.state) : ""}
            </div>
            ${this._promotionModal ? renderPromotionModal(this._promotionModal, () => this.promoCost()) : ""}
            ${this._designEditModal ? renderDesignEditModal(this._designEditModal) : ""}
        `;
        root.innerHTML = html;

        if (this._promotionModal) {
            root.querySelectorAll("[data-promo-toggle]").forEach((el) => {
                el.addEventListener("click", () => {
                    const key = el.dataset.promoToggle;
                    this.togglePromoExtra(key);
                });
            });
        }
    }
}

customElements.define("game-app", GameApp);
