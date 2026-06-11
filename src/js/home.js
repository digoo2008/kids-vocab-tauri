/**
 * 快乐背单词 - 首页
 */

function renderHome(container) {
    const totalWords = AppState.wordBank.length;
    const wrongBook = getLocal('wrongBook', []);
    
    container.innerHTML = `
        <div class="home-page">
            <div class="hero-section">
                <h2>🌟 欢迎来到快乐背单词</h2>
                <p class="hero-subtitle">每天练习一点点，英语进步一大步！</p>
            </div>
            <div class="stats-cards">
                <div class="stat-card">
                    <span class="stat-icon">📚</span>
                    <span class="stat-value">${totalWords}</span>
                    <span class="stat-label">词库单词</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📖</span>
                    <span class="stat-value">${wrongBook.length}</span>
                    <span class="stat-label">错题本</span>
                </div>
            </div>
            <div class="action-section">
                <button class="btn-primary btn-large" onclick="navigateTo('quiz')">
                    🚀 开始背单词
                </button>
            </div>
        </div>
    `;
}
