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

    ${words.length === 0 ? `
      <div class="wrongbook-empty">
        <span class="wrongbook-empty-icon">🌟</span>
        <div class="wrongbook-empty-title">没有错词，太棒了！</div>
        <div class="wrongbook-empty-sub">每道题都答对了，继续保持哦~</div>
      </div>
    ` : `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
        <span style="font-size:20px;font-weight:700;color:#5d4037;">待复习</span>
        <span style="font-size:28px;font-weight:800;color:#ff7043;">${words.length}</span>
        <span style="font-size:20px;font-weight:700;color:#5d4037;">个单词</span>
      </div>
      <div class="wrongbook-list">
        ${words
          .sort((a, b) => wrong[b].count - wrong[a].count)
          .map(w => `
            <div class="wrongbook-item" onclick="reviewSingleWord('${w}')">
              <div>
                <span class="wrongbook-word">${w}</span>
                <span class="wrongbook-chinese" style="margin-left:14px;">${wrong[w].chinese}</span>
              </div>
              <span class="wrongbook-count">错 ${wrong[w].count} 次</span>
            </div>
          `).join('')}
      </div>
      <div style="display:flex;justify-content:center;margin-top:18px;">
        <button class="btn btn-orange" onclick="reviewAllWrong()">复习全部错词</button>
      </div>
    `}
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
