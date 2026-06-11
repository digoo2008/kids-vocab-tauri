/**
 * 快乐背单词 - 错题本页面
 */

function renderWrongBook(container) {
    const wrongBook = getLocal('wrongBook', []);
    
    let wrongListHtml = '';
    if (wrongBook.length === 0) {
        wrongListHtml = '<p class="empty-state">🎉 太棒了，错题本是空的！继续保持！</p>';
    } else {
        wrongListHtml = `
            <div class="wrong-list-section">
                <div class="wrong-list">
                    ${wrongBook.map((w, idx) => `
                        <div class="wrong-item">
                            <div class="wrong-info">
                                <span class="wrong-english">${escapeHtml(w.english)}</span>
                                <span class="wrong-chinese">${escapeHtml(w.chinese)}</span>
                                ${w.pronunciation ? `<span class="wrong-pron">${escapeHtml(w.pronunciation)}</span>` : ''}
                            </div>
                            <button class="btn-delete" onclick="removeWrongBookItem(${idx})" title="移出错题本">🗑️</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="wrongbook-page">
            <h2>📖 错题本（${wrongBook.length}个）</h2>
            ${wrongBook.length > 0 ? `
                <div class="wrongbook-actions">
                    <button class="btn-primary" onclick="reviewWrongWords()">🔄 复习错题</button>
                    <button class="btn-danger" onclick="clearWrongBook()">🗑️ 清空错题本</button>
                </div>
            ` : ''}
            ${wrongListHtml}
        </div>
    `;
}

function removeWrongBookItem(index) {
    const wrongBook = getLocal('wrongBook', []);
    wrongBook.splice(index, 1);
    setLocal('wrongBook', wrongBook);
    renderWrongBook(document.getElementById('page-content'));
}

function clearWrongBook() {
    if (confirm('确定要清空错题本吗？')) {
        setLocal('wrongBook', []);
        renderWrongBook(document.getElementById('page-content'));
    }
}

function reviewWrongWords() {
    const wrongBook = getLocal('wrongBook', []);
    if (wrongBook.length === 0) {
        alert('错题本是空的哦～');
        return;
    }
    // 用错题本单词开始练习
    AppState.wordBank = [...wrongBook];
    saveWordBank();
    navigateTo('quiz');
}
