/**
 * 快乐背单词 - 结果页面
 */

function renderResult(container) {
    const total = AppState.quizWords.length;
    const correct = AppState.correctCount;
    const wrong = AppState.wrongWords.length;
    const skipped = AppState.skipCount;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    let emoji, message;
    if (accuracy >= 90) {
        emoji = '🏆';
        message = '太厉害了！你是单词小达人！';
    } else if (accuracy >= 70) {
        emoji = '👍';
        message = '不错哦，继续加油！';
    } else if (accuracy >= 50) {
        emoji = '💪';
        message = '还需要多多练习哦～';
    } else {
        emoji = '📚';
        message = '没关系，慢慢来，坚持就是胜利！';
    }

    let wrongListHtml = '';
    if (AppState.wrongWords.length > 0) {
        wrongListHtml = `
            <div class="wrong-list-section">
                <h3>📖 需要复习的单词</h3>
                <div class="wrong-list">
                    ${AppState.wrongWords.map(w => `
                        <div class="wrong-item">
                            <span class="wrong-english">${escapeHtml(w.english)}</span>
                            <span class="wrong-chinese">${escapeHtml(w.chinese)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="result-page">
            <div class="result-header">
                <span class="result-emoji">${emoji}</span>
                <h2>练习完成！</h2>
                <p class="result-message">${message}</p>
            </div>
            <div class="result-stats">
                <div class="result-stat">
                    <span class="stat-num">${total}</span>
                    <span class="stat-label">总题数</span>
                </div>
                <div class="result-stat correct">
                    <span class="stat-num">${correct}</span>
                    <span class="stat-label">正确 ✅</span>
                </div>
                <div class="result-stat wrong">
                    <span class="stat-num">${wrong}</span>
                    <span class="stat-label">需复习</span>
                </div>
                <div class="result-stat">
                    <span class="stat-num">${accuracy}%</span>
                    <span class="stat-label">正确率</span>
                </div>
            </div>
            ${wrongListHtml}
            <div class="result-actions">
                <button class="btn-primary" onclick="navigateTo('quiz')">🔄 再来一轮</button>
                <button class="btn-secondary" onclick="navigateTo('home')">🏠 返回首页</button>
            </div>
        </div>
    `;
}
