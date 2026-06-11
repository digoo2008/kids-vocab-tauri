/**
 * 快乐背单词 - 词库管理页面
 * 家长手动录入单词，可选豆包AI辅助释义
 */

function renderWordBank(container) {
    const words = AppState.wordBank;
    
    let wordListHtml = '';
    if (words.length === 0) {
        wordListHtml = '<p class="empty-state">📭 还没有单词，快来添加吧！</p>';
    } else {
        wordListHtml = `
            <div class="word-list">
                ${words.map((w, idx) => `
                    <div class="word-item">
                        <div class="word-info">
                            <span class="word-english">${escapeHtml(w.english)}</span>
                            <span class="word-chinese">${escapeHtml(w.chinese)}</span>
                            ${w.pronunciation ? `<span class="word-pron">${escapeHtml(w.pronunciation)}</span>` : ''}
                        </div>
                        <button class="btn-delete" onclick="deleteWord(${idx})" title="删除">🗑️</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="wordbank-page">
            <h2>📚 我的词库（${words.length}个单词）</h2>
            
            <div class="add-word-section">
                <h3>➕ 添加新单词</h3>
                <div class="add-word-form">
                    <input type="text" id="new-english" placeholder="英文单词（必填）" class="form-input">
                    <input type="text" id="new-chinese" placeholder="中文释义（必填）" class="form-input">
                    <input type="text" id="new-pronunciation" placeholder="音标/发音（选填）" class="form-input">
                    <div class="form-actions">
                        <button class="btn-primary" onclick="addWord()">✅ 添加</button>
                        <button class="btn-secondary" id="btn-batch-import" onclick="showBatchImport()">📋 批量导入</button>
                    </div>
                </div>
            </div>

            <div id="batch-import-section" class="batch-import-section" style="display:none;">
                <h3>📋 批量导入</h3>
                <p class="batch-hint">每行一个单词，格式：英文 | 中文 | 音标（可选）</p>
                <textarea id="batch-input" class="batch-textarea" rows="6" placeholder="apple | 苹果 | ˈæp.əl
banana | 香蕉
dog | 狗 | dɔːɡ"></textarea>
                <div class="form-actions">
                    <button class="btn-primary" onclick="batchImport()">📥 导入</button>
                    <button class="btn-secondary" onclick="hideBatchImport()">取消</button>
                </div>
            </div>

            <div class="wordbank-list-section">
                <h3>📝 单词列表</h3>
                <div id="word-list-container">
                    ${wordListHtml}
                </div>
                ${words.length > 0 ? `<button class="btn-danger" onclick="clearAllWords()">🗑️ 清空全部单词</button>` : ''}
            </div>
        </div>
    `;
}

function addWord() {
    const english = document.getElementById('new-english')?.value.trim();
    const chinese = document.getElementById('new-chinese')?.value.trim();
    const pronunciation = document.getElementById('new-pronunciation')?.value.trim();

    if (!english || !chinese) {
        alert('英文和中文释义是必填的哦～');
        return;
    }

    // 检查重复
    const exists = AppState.wordBank.find(w => w.english.toLowerCase() === english.toLowerCase());
    if (exists) {
        alert(`单词 "${english}" 已经存在了！`);
        return;
    }

    AppState.wordBank.push({ english, chinese, pronunciation });
    saveWordBank();
    renderWordBank(document.getElementById('page-content'));
}

function deleteWord(index) {
    if (confirm(`确定删除 "${AppState.wordBank[index].english}" 吗？`)) {
        AppState.wordBank.splice(index, 1);
        saveWordBank();
        renderWordBank(document.getElementById('page-content'));
    }
}

function clearAllWords() {
    if (confirm('确定要清空所有单词吗？此操作不可撤销！')) {
        AppState.wordBank = [];
        saveWordBank();
        renderWordBank(document.getElementById('page-content'));
    }
}

function batchImport() {
    const text = document.getElementById('batch-input')?.value.trim();
    if (!text) return;

    const lines = text.split('\n').filter(line => line.trim());
    let imported = 0;
    let skipped = 0;

    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 2) {
            skipped++;
            continue;
        }
        const [english, chinese, pronunciation = ''] = parts;
        
        // 检查重复
        const exists = AppState.wordBank.find(w => w.english.toLowerCase() === english.toLowerCase());
        if (exists) {
            skipped++;
            continue;
        }

        AppState.wordBank.push({ english, chinese, pronunciation });
        imported++;
    }

    saveWordBank();
    alert(`导入完成！成功 ${imported} 个，跳过 ${skipped} 个（重复或格式错误）`);
    renderWordBank(document.getElementById('page-content'));
}

function showBatchImport() {
    const section = document.getElementById('batch-import-section');
    if (section) section.style.display = 'block';
}

function hideBatchImport() {
    const section = document.getElementById('batch-import-section');
    if (section) section.style.display = 'none';
}

// ==================== 词库持久化 ====================

function saveWordBank() {
    setLocal('wordBank', AppState.wordBank);
}

function loadWordBank() {
    AppState.wordBank = getLocal('wordBank', []);
}

// 初始化加载词库
loadWordBank();
