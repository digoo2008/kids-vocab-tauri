// ====== 结果页 ======
function initResult() {
  const correct = App.quizResults.filter(r => r.correct).length;
  const total = App.quizResults.length;
  const wrongList = App.quizResults.filter(r => !r.correct);

  const c = document.getElementById('result-content');
  c.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>
    <div class="title-area">
      <span class="app-icon">${correct === total ? '🎉' : '🐣'}</span>
      <span class="title">测验完成！</span>
    </div>
    <div class="result-score">✅ ${correct} / ${total}</div>
    <div style="font-size:22px;color:#a5d6a7;margin-bottom:20px;">
      得分：${App.score} | 正确率：${total>0 ? Math.round(correct/total*100) : 0}%
    </div>

    ${wrongList.length > 0 ? `
      <div style="font-weight:700;color:#e53935;font-size:22px;margin-bottom:8px;">❌ 错误单词 (${wrongList.length}个)</div>
      <div class="wrong-list">
        ${wrongList.map(w => `
          <div class="wrong-item">
            <span class="wrong-word">${w.word.toUpperCase()}</span>
            <span class="wrong-chinese">${w.chinese}</span>
            <span class="wrong-count">${w.skipped ? '跳过' : '尝试'+w.tries+'次'}</span>
          </div>
        `).join('')}
      </div>
    ` : '<div style="font-size:24px;color:#43a047;margin:20px 0;">🎉 全部正确，太厉害了！</div>'}

    <div style="display:flex;justify-content:center;gap:16px;margin-top:20px;">
      ${wrongList.length > 0 ? '<button class="btn btn-orange" onclick="goReviewWrong()">🔁 复习错词</button>' : ''}
      <button class="btn btn-green" onclick="location.hash=\'#home\'">🏠 返回首页</button>
    </div>
  `;
}

function goReviewWrong() {
  const wrongList = App.quizResults.filter(r => !r.correct);
  const bank = DB.getBank();
  App.quizWords = wrongList.map(r => ({
    word: r.word,
    chinese: r.chinese || (bank[r.word]?.chinese || ''),
    audio: bank[r.word]?.audio || ''
  }));
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = 'wrongbook';
  location.hash = '#quiz';
}
