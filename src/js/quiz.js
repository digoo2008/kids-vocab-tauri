/**
 * 快乐背单词 - 练习页面（填空模式）
 */

// ==================== 练习状态 ====================
let currentQuizWord = null;
let userAnswer = '';

function renderQuiz(container) {
    const words = AppState.wordBank;
    if (words.length === 0) {
        container.innerHTML = `
            <div class="quiz-page">
                <div class="empty-state">
                    <p>📭 词库还是空的哦～</p>
                    <p>先去词库添加单词吧！</p>
                    <button class="btn-primary" onclick="navigateTo('wordbank')">去词库</button>
                </div>
            </div>
        `;
        return;
    }

    // 随机选取10个单词（不足10个则全部）
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    AppState.quizWords = shuffled.slice(0, Math.min(10, shuffled.length));
    AppState.quizIndex = 0;
    AppState.correctCount = 0;
    AppState.wrongWords = [];
    AppState.skipCount = 0;
    AppState.retryCount = 0;
    
    renderQuizQuestion(container);
}

function renderQuizQuestion(container) {
    if (AppState.quizIndex >= AppState.quizWords.length) {
        // 练习结束
        navigateTo('result');
        return;
    }

    const word = AppState.quizWords[AppState.quizIndex];
    currentQuizWord = word;
    userAnswer = '';

    // 生成填空：隐藏英文中的字母（随机选择位置）
    const english = word.english;
    const blankCount = Math.max(1, Math.floor(english.length * 0.4));
    const indices = [];
    const allIndices = [...Array(english.length).keys()].filter(i => english[i] !== ' ');
    
    // 随机选择要隐藏的字母位置
    const shuffled = [...allIndices].sort(() => Math.random() - 0.5);
    const hiddenIndices = new Set(shuffled.slice(0, Math.min(blankCount, shuffled.length)));
    
    // 生成带空格的显示文本
    let displayHtml = '';
    for (let i = 0; i < english.length; i++) {
        if (english[i] === ' ') {
            displayHtml += ' ';
        } else if (hiddenIndices.has(i)) {
            displayHtml += '<span class="blank">_</span>';
        } else {
            displayHtml += `<span class="given-letter">${escapeHtml(english[i])}</span>`;
        }
    }

    const progress = `${AppState.quizIndex + 1} / ${AppState.quizWords.length}`;
    
    container.innerHTML = `
        <div class="quiz-page">
            <div class="quiz-header">
                <span class="quiz-progress">📝 ${progress}</span>
                <span class="quiz-score">✅ ${AppState.correctCount}</span>
            </div>
            <div class="quiz-content">
                <div class="quiz-hint">
                    <p class="chinese-meaning">${escapeHtml(word.chinese)}</p>
                    ${word.pronunciation ? `<p class="pronunciation">🔊 ${escapeHtml(word.pronunciation)}</p>` : ''}
                </div>
                <div class="word-display">${displayHtml}</div>
                <div class="answer-area">
                    <input type="text" 
                           id="quiz-input" 
                           class="quiz-input" 
                           placeholder="输入完整的英文单词..." 
                           autocomplete="off"
                           autofocus>
                    <div class="quiz-actions">
                        <button class="btn-submit" onclick="submitAnswer()">✅ 提交</button>
                        <button class="btn-skip" onclick="skipWord()">⏭️ 跳过</button>
                    </div>
                </div>
                <div id="feedback-area" class="feedback-area"></div>
            </div>
        </div>
    `;

    // 绑定回车键
    const input = document.getElementById('quiz-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAnswer();
        });
        input.focus();
    }
}

function submitAnswer() {
    const input = document.getElementById('quiz-input');
    const feedback = document.getElementById('feedback-area');
    if (!input || !feedback || !currentQuizWord) return;

    const answer = input.value.trim();
    if (!answer) {
        feedback.innerHTML = '<p class="feedback-warn">请输入答案～</p>';
        return;
    }

    // 大小写不敏感
    if (answer.toLowerCase() === currentQuizWord.english.toLowerCase()) {
        // 正确
        feedback.innerHTML = `
            <p class="feedback-correct">🎉 太棒了！<strong>${escapeHtml(currentQuizWord.english)}</strong></p>
        `;
        AppState.correctCount++;
        
        // 从错题本移除（如果存在）
        removeFromWrongBook(currentQuizWord.english);
        
        setTimeout(() => {
            AppState.quizIndex++;
            renderQuizQuestion(document.getElementById('page-content'));
        }, 1200);
    } else {
        // 错误
        AppState.retryCount++;
        feedback.innerHTML = `
            <p class="feedback-wrong">❌ 不对哦，再试试？</p>
            <div class="retry-actions">
                <button class="btn-retry" onclick="retryAnswer()">🔄 重试</button>
                <button class="btn-reveal" onclick="revealAnswer()">👁️ 看答案</button>
            </div>
        `;
    }
}

function retryAnswer() {
    const input = document.getElementById('quiz-input');
    const feedback = document.getElementById('feedback-area');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (feedback) {
        feedback.innerHTML = '';
    }
}

function revealAnswer() {
    const feedback = document.getElementById('feedback-area');
    if (!feedback || !currentQuizWord) return;

    // 加入错题本
    addToWrongBook(currentQuizWord);
    AppState.wrongWords.push(currentQuizWord);

    feedback.innerHTML = `
        <p class="feedback-reveal">📖 正确答案：<strong>${escapeHtml(currentQuizWord.english)}</strong></p>
        <button class="btn-next" onclick="nextWord()">➡️ 下一题</button>
    `;
}

function skipWord() {
    AppState.skipCount++;
    addToWrongBook(currentQuizWord);
    AppState.wrongWords.push(currentQuizWord);
    
    const feedback = document.getElementById('feedback-area');
    if (feedback && currentQuizWord) {
        feedback.innerHTML = `
            <p class="feedback-skip">⏭️ 已跳过，答案：<strong>${escapeHtml(currentQuizWord.english)}</strong></p>
            <button class="btn-next" onclick="nextWord()">➡️ 下一题</button>
        `;
    }
}

function nextWord() {
    AppState.quizIndex++;
    renderQuizQuestion(document.getElementById('page-content'));
}

// ==================== 错题本操作 ====================

function addToWrongBook(word) {
    const wrongBook = getLocal('wrongBook', []);
    const exists = wrongBook.find(w => w.english.toLowerCase() === word.english.toLowerCase());
    if (!exists) {
        wrongBook.push({ ...word, addedAt: Date.now() });
        setLocal('wrongBook', wrongBook);
    }
}

function removeFromWrongBook(english) {
    const wrongBook = getLocal('wrongBook', []);
    const filtered = wrongBook.filter(w => w.english.toLowerCase() !== english.toLowerCase());
    setLocal('wrongBook', filtered);
}
