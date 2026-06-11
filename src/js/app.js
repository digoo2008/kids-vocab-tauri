/**
 * 快乐背单词 - 主应用入口
 * 负责页面路由、主题切换、全局状态管理
 */

// ==================== 全局状态 ====================
const AppState = {
    currentPage: 'home',
    wordBank: [],           // 当前词库
    quizWords: [],          // 本轮测试单词
    quizIndex: 0,           // 当前题目索引
    correctCount: 0,        // 正确数
    wrongWords: [],         // 本轮错词
    skipCount: 0,           // 跳过数
    retryCount: 0,          // 重试数
};

// ==================== 工具函数 ====================

/** 获取 localStorage */
function getLocal(key, defaultValue = null) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
    } catch {
        return defaultValue;
    }
}

/** 设置 localStorage */
function setLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('localStorage write failed:', e);
    }
}

/** 页面跳转 */
function navigateTo(page) {
    AppState.currentPage = page;
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    // 渲染页面
    const main = document.getElementById('page-content');
    if (!main) return;
    main.innerHTML = '';
    switch (page) {
        case 'home': renderHome(main); break;
        case 'quiz': renderQuiz(main); break;
        case 'result': renderResult(main); break;
        case 'wordbank': renderWordBank(main); break;
        case 'wrongbook': renderWrongBook(main); break;
        default: renderHome(main);
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 导航栏点击事件
    document.getElementById('main-nav').addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-btn');
        if (btn && btn.dataset.page) {
            navigateTo(btn.dataset.page);
        }
    });
    // 加载默认页面
    navigateTo('home');
});

/**
 * Escape HTML 防止 XSS
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
