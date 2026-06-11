// ====== 错词本 ======
function initWrongBook() {
  const wrong = DB.getWrong();
  const words = Object.keys(wrong);
  const c = document.getElementById('wrongbook-content');

  c.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>
    <div class="title-area">
      <span class="app-icon">📕</span><span class="title">错词本</span>
    </div>

    ${words.length === 0 ? `
      <div style="font-size:48px;margin:30px 0 12px;">🎉</div>
      <div style="font-size:24px;color:#43a047;font-weight:700;">没有错词，太棒了！</div>
      <div style="font-size:18px;color:#a5d6a7;margin:8px 0 24px;">继续保持哦~</div>
    ` : `
      <div class="wrongbook-list">
        ${words
          .sort((a, b) => wrong[b].count - wrong[a].count)
          .map(w => `
            <div class="wrongbook-item" onclick="reviewSingleWord('${w}')">
              <span style="font-size:28px;font-weight:800;color:#e53935;">${w.toUpperCase()}</span>
              <span style="font-size:20px;color:#8d6e63;">${wrong[w].chinese}</span>
              <span style="font-size:16px;color:#a5d6a7;">错 ${wrong[w].count} 次</span>
            </div>
          `).join('')}
      </div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:12px;">
        <button class="btn btn-orange" onclick="reviewAllWrong()">🔁 复习全部错词</button>
      </div>
    `}

    <div style="margin-top:16px;">
      <button class="btn btn-green" onclick="location.hash='#home'">🏠 返回首页</button>
    </div>
  `;
}

function reviewSingleWord(word) {
  const wrong = DB.getWrong();
  const bank = DB.getBank();
  const data = wrong[word];
  if (!data) return;

  App.quizWords = [{ word, chinese: data.chinese, audio: bank[word]?.audio || '' }];
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = 'single';
  location.hash = '#quiz';
}

function reviewAllWrong() {
  const wrong = DB.getWrong();
  const words = Object.keys(wrong);
  if (words.length === 0) return;

  const bank = DB.getBank();
  // Shuffle
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const selected = words.slice(0, Math.min(10, words.length));
  App.quizWords = selected.map(w => ({ word: w, chinese: wrong[w].chinese, audio: bank[w]?.audio || '' }));
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = 'wrongbook';
  location.hash = '#quiz';
}
