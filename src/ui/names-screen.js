import { escapeHtml } from '../utils.js';

export function renderNames(names) {
    return `
        <div class="names-container">
            <h2 class="names-title">名前を入力</h2>
            <p class="names-subtitle">なもし書かないとスキップ</p>
            
            <div class="names-group">
                <div class="names-field">
                    <label>プレイヤー1</label>
                    <input class="names-input" data-name="1" value="${escapeHtml(names[1])}" placeholder="名前を入力..." />
                </div>
                <div class="names-field">
                    <label>プレイヤー2</label>
                    <input class="names-input" data-name="2" value="${escapeHtml(names[2])}" placeholder="名前を入力..." />
                </div>
            </div>

            <button class="btn-confirm" data-action="to-design">確定</button>
            
        </div>
    `;
}
