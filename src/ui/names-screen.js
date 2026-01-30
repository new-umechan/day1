import { escapeHtml } from '../utils.js';

export function renderNames(names) {
    return `
        <div class="names-screen">
            <div class="names-stack" data-node-id="3:396">
                <p class="names-title" data-node-id="3:353">名前を入力</p>
                <p class="names-subtitle" data-node-id="3:400">なにも書かないとスキップ</p>
                
                <div class="names-inputs" data-node-id="3:365">
                    <div class="names-field" data-node-id="3:363">
                        <p class="names-label" data-node-id="3:361">プレイヤー1</p>
                        <input class="names-input" data-name="1" value="${escapeHtml(names[1])}" data-node-id="3:356" />
                    </div>
                    <div class="names-field" data-node-id="3:364">
                        <p class="names-label" data-node-id="3:362">プレイヤー2</p>
                        <input class="names-input" data-name="2" value="${escapeHtml(names[2])}" data-node-id="3:360" />
                    </div>
                </div>

                <div class="btn-confirm" data-action="to-design" data-node-id="3:392">
                    確定
                </div>
            </div>
        </div>
    `;
}
