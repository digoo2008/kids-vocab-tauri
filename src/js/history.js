// ====== 历史/错题页 ======
async function initHistory() {
  const container = document.getElementById('history-content');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#a5d6a7;font-size:18px;">加载中...</div>';

  try {
    const [history, wrongWords] = await Promise.all([
      Tauri.invoke('get_history'),
      Tauri.invoke('get_wrong_list')
    ]);

    container.innerHTML = `
      <div class="title-area"><span class="app-icon">🐣</span><span class="title">学习记录</span></div>

      <div style="font-size:18px;font-weight:700;color:var(--mint);margin:12px 0;">📝 测验历史</div>
      ${history.length === 0 ? '<div style="color:#a5d6a7;padding:20px;">暂无记录</div>' : `
        <div style="max-height:250px;overflow-y:auto;">
          <table class="history-table">
            <thead><tr><th>日期</th><th>年级</th><th>题型</th><th>得分</th><th>正确率</th></tr></thead>
            <tbody>
              ${history.map(h => `
                <tr>
                  <td>${h.date}</td>
                  <td>${gradeLabel(h.grade)}</td>
                  <td>${typeLabel(h.quiz_type)}</td>
                  <td>${h.score}</td>
                  <td class="${h.correct>=h.total/2?'correct':'wrong'}">${h.correct}/${h.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}

      <div style="font-size:18px;font-weight:700;color:#e53935;margin:12px 0;">🔁 错题本</div>
      ${wrongWords.length === 0 ? '<div style="color:#a5d6a7;padding:20px;">暂无错题 🎉</div>' : `
        <div class="wrong-list">
          ${wrongWords.map(w => `
            <div class="wrong-item">
              <span class="wrong-word">${w.word.toUpperCase()}</span>
              <span class="wrong-chinese">${w.chinese}</span>
              <span class="wrong-count">错${w.count}次</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-orange" onclick="reviewAllWrong()">🔁 复习全部错题</button>
      `}

      <div style="margin-top:16px;">
        <button class="btn btn-green" onclick="location.hash='#home'">🏠 返回首页</button>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `
      <div class="title-area"><span class="app-icon">🐣</span><span class="title">学习记录</span></div>
      <div style="color:#a5d6a7;padding:20px;">暂无记录</div>
      <button class="btn btn-green" onclick="location.hash='#home'">🏠 返回首页</button>
    `;
  }
}

async function reviewAllWrong() {
  try {
    const words = await Tauri.invoke('get_wrong_words_review', { count: 50 });
    if (words.length === 0) return;
    App.settings.quiz_type = 'mixed';
    App.quizWords = words;
    App.currentIdx = 0; App.score = 0; App.streak = 0; App.quizResults = [];
    location.hash = '#quiz';
  } catch(e) {}
}

function gradeLabel(g) {
  const map = { grade1:'一年级', grade2:'二年级', grade3:'三年级', grade4:'四年级', grade5:'五年级', grade6:'六年级' };
  return map[g] || g;
}
function typeLabel(t) {
  const map = { fill:'填空', drag:'拖拽', mixed:'混合' };
  return map[t] || t;
}
