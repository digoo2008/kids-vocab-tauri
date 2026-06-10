// ====== 结果页 ======
function initResult() {
  const correct = App.quizResults.filter(r => r.correct).length;
  const total = App.quizResults.length;
  const wrongList = App.quizResults.filter(r => !r.correct);

  const container = document.getElementById('result-content');
  container.innerHTML = `
    <div class="title-area"><span class="app-icon">🐣</span><span class="title">测验完成！</span></div>
    <div class="result-score" style="font-size:56px;font-weight:800;color:var(--mint);margin:16px 0;">
      ✅ ${correct} / ${total}
    </div>
    <div style="font-size:18px;color:#a5d6a7;margin-bottom:16px;">
      得分：${App.score} | 正确率：${total>0?Math.round(correct/total*100):0}%
    </div>
    ${wrongList.length > 0 ? `
      <div style="font-weight:700;color:#e53935;margin-bottom:8px;">❌ 错误单词 (${wrongList.length}个)</div>
      <div class="wrong-list" style="max-height:200px;overflow-y:auto;margin-bottom:16px;">
        ${wrongList.map(w => `
          <div class="wrong-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff5f5;border-radius:16px;margin:6px 0;border:2px solid #ffcdd2;">
            <span class="wrong-word" style="font-size:22px;">${w.word.toUpperCase()}</span>
            <span style="font-size:16px;color:#8d6e63;">${w.chinese}</span>
          </div>
        `).join('')}
      </div>
    ` : '<div style="font-size:20px;color:#43a047;margin:16px 0;">🎉 全部正确，太厉害了！</div>'}
    <div style="display:flex;justify-content:center;gap:12px;">
      ${wrongList.length > 0 ? '<button class="btn btn-orange" onclick="reviewWrong()">🔁 复习错题</button>' : ''}
      <button class="btn btn-green" onclick="location.hash=\'#home\'">🏠 返回首页</button>
    </div>
  `;
}

function reviewWrong() {
  App.settings.quiz_type = App.settings.quiz_type; // keep same type
  App.quizWords = App.quizResults.filter(r=>!r.correct).map(r=>{
    // Find word from original list or create basic object
    const found = App.quizWords.find(w=>w.word===r.word);
    return found || { word: r.word, chinese: r.chinese, grade: App.settings.grade, difficulty: 1 };
  });
  App.currentIdx = 0; App.score = 0; App.streak = 0; App.quizResults = [];
  location.hash = '#quiz';
}
