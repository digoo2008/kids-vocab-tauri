// ====== 测验页 — 点击填空模式 ======
let qWord = null, qBlanks = [], qValues = [], qOptions = [];
let qHintUsed = false, qAnswered = false, qAutoTimer = null;
let qTryCount = 0; // 当前题尝试次数

async function initQuiz() {
  if (App.quizWords.length === 0) {
    location.hash = '#home';
    return;
  }
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizResults = [];
  renderQuestion();
}

function renderQuestion() {
  if (App.currentIdx >= App.quizWords.length) {
    submitAndShowResult();
    return;
  }

  const wordData = App.quizWords[App.currentIdx];
  qWord = wordData;
  qHintUsed = false;
  qAnswered = false;
  qTryCount = 0;
  clearTimeout(qAutoTimer);
  clearTimeout(hintBubbleTimer);
  document.getElementById('hint-bubble').style.display = 'none';

  const total = App.quizWords.length;
  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>

    <div class="top-bar">
      <span class="badge badge-cream">⭐ 得分 <span id="qz-score">${App.score}</span></span>
      <div class="progress-dots" id="qz-dots"></div>
      <span class="badge badge-orange" id="qz-streak-badge" style="display:${App.streak>=2?'inline-block':'none'}">🔥 连对 <span id="qz-streak">${App.streak}</span></span>
    </div>

    <div class="title-area">
      <span class="app-icon">🐣</span><span class="title">快乐背单词</span>
    </div>

    <div class="chinese-badge">💬 ${wordData.chinese}</div>

    <div class="word-display" id="qz-word-display"></div>
    <div class="feedback" id="qz-feedback"></div>

    <div class="options-label">👇 点击下方字母填入空白处（点击已填字母可撤回）</div>
    <div class="options-row" id="qz-options-row"></div>

    <div class="controls-row" id="qz-controls">
      <button class="btn btn-white" onclick="qzClear()">🔄 清空</button>
      <button class="btn btn-pink" id="qz-btn-hint" onclick="qzHint()">🔊 提示</button>
      <button class="btn btn-green" id="qz-btn-check" onclick="qzCheck()" disabled>✅ 检查</button>
    </div>
  `;

  // 语音朗读
  setTimeout(() => speak(wordData.word), 400);

  // 挖空策略
  const len = wordData.word.length;
  let nb = Math.min(Math.max(1, Math.ceil(len * 0.35)), 3, len - 1);
  let allP = Array.from({ length: len }, (_, i) => i);
  for (let i = allP.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [allP[i], allP[j]] = [allP[j], allP[i]]; }
  qBlanks = allP.slice(0, nb).sort((a, b) => a - b);
  qValues = new Array(qBlanks.length).fill(null);

  // 渲染字母格子
  const display = document.getElementById('qz-word-display');
  for (let i = 0; i < len; i++) {
    const box = document.createElement('div');
    box.className = 'letter-box';
    const bi = qBlanks.indexOf(i);
    if (bi >= 0) {
      box.classList.add('letter-blank');
      box.dataset.blankIdx = bi;
      box.addEventListener('click', () => qzClickBlank(bi));
    } else {
      box.classList.add('letter-shown');
      box.textContent = wordData.word[i].toUpperCase();
    }
    display.appendChild(box);
  }

  // 高亮首个空位
  qzFocusBlank(0);

  // 生成选项
  qOptions = qzGenOptions(wordData.word, qBlanks);
  qzRenderOptions();

  // 进度圆点
  qzUpdateDots(total);
}

function qzGenOptions(word, blanks) {
  const missing = blanks.map(i => word[i].toUpperCase());
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let opts = [...missing];
  while (opts.length < Math.max(7, missing.length + 3)) {
    const r = all[Math.floor(Math.random() * 26)];
    if (!opts.includes(r)) opts.push(r);
  }
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

function qzRenderOptions() {
  const row = document.getElementById('qz-options-row');
  if (!row) return;
  row.innerHTML = '';
  qOptions.forEach((l, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.optIdx = i;
    btn.dataset.letter = l;
    btn.textContent = l;
    btn.addEventListener('click', () => qzSelect(i, l));
    row.appendChild(btn);
  });
}

function qzFocusBlank(idx) {
  if (qAnswered) return;
  document.querySelectorAll('.letter-blank').forEach(b => b.classList.remove('active'));
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  if (blanks[idx] && qValues[idx] === null) {
    blanks[idx].classList.add('active');
  }
}

function qzFirstUnfilled() {
  for (let i = 0; i < qValues.length; i++) { if (qValues[i] === null) return i; }
  return -1;
}

function qzSelect(oi, letter) {
  if (qAnswered) return;
  const ti = qzFirstUnfilled();
  if (ti === -1) return;

  qValues[ti] = letter;
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  blanks[ti].classList.add('filled');
  blanks[ti].classList.remove('active');
  blanks[ti].textContent = letter;

  document.querySelectorAll('#qz-options-row .option-btn')[oi].classList.add('used');

  const next = qzFirstUnfilled();
  if (next !== -1) {
    qzFocusBlank(next);
  } else {
    document.getElementById('qz-btn-check').disabled = false;
  }
}

function qzClickBlank(bi) {
  if (qAnswered) return;
  if (qValues[bi] !== null) {
    const letter = qValues[bi];
    qValues[bi] = null;
    const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
    blanks[bi].classList.remove('filled', 'correct-fill', 'wrong-fill');
    blanks[bi].textContent = '';
    qzFocusBlank(bi);

    const btns = document.querySelectorAll('#qz-options-row .option-btn');
    for (const b of btns) {
      if (b.dataset.letter === letter && b.classList.contains('used')) {
        b.classList.remove('used');
        break;
      }
    }
    document.getElementById('qz-btn-check').disabled = true;
  } else {
    qzFocusBlank(bi);
  }
}

function qzClear() {
  if (qAnswered) return;
  qValues = qValues.map(() => null);
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  blanks.forEach(b => { b.classList.remove('filled', 'correct-fill', 'wrong-fill', 'active'); b.textContent = ''; });
  document.querySelectorAll('#qz-options-row .option-btn').forEach(b => b.classList.remove('used'));
  document.getElementById('qz-btn-check').disabled = true;
  qzFocusBlank(0);
}

function qzHint() {
  if (qAnswered) return;
  qHintUsed = true;
  document.getElementById('qz-btn-hint').disabled = true;

  // 语音
  speak(qWord.word);
  // 气泡
  showHintBubble(qWord.word);
  // 自动填首空
  const ti = qzFirstUnfilled();
  if (ti === -1) return;

  const correctLetter = qWord.word[qBlanks[ti]].toUpperCase();
  qValues[ti] = correctLetter;
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  blanks[ti].classList.add('filled');
  blanks[ti].classList.remove('active');
  blanks[ti].textContent = correctLetter;

  const btns = document.querySelectorAll('#qz-options-row .option-btn');
  for (const b of btns) {
    if (b.dataset.letter === correctLetter && !b.classList.contains('used')) {
      b.classList.add('used');
      break;
    }
  }
  const next = qzFirstUnfilled();
  if (next !== -1) { qzFocusBlank(next); }
  else { document.getElementById('qz-btn-check').disabled = false; }
}

function qzCheck() {
  if (qAnswered) return;
  qAnswered = true;
  qTryCount++;
  clearTimeout(qAutoTimer);

  const fb = document.getElementById('qz-feedback');
  const correctWord = qWord.word.toUpperCase();
  let userArr = qWord.word.toUpperCase().split('');
  qBlanks.forEach((p, i) => { userArr[p] = qValues[i] || ''; });
  const userWord = userArr.join('');

  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  document.querySelectorAll('#qz-options-row .option-btn').forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.5'; });
  document.getElementById('qz-btn-check').disabled = true;
  document.getElementById('qz-btn-hint').disabled = true;

  if (userWord === correctWord) {
    // ✅ 答对
    fb.className = 'feedback correct';
    let bonus = qHintUsed ? 5 : 10;
    if (App.streak >= 3) bonus += 5;
    App.score += bonus;
    App.streak++;
    fb.innerHTML = `🎉 太棒了！+${bonus}分<br/>正确答案：<strong>${correctWord}</strong>`;
    document.getElementById('qz-score').textContent = App.score;

    if (App.streak >= 2) {
      const sb = document.getElementById('qz-streak-badge');
      sb.style.display = 'inline-block';
      document.getElementById('qz-streak').textContent = App.streak;
    }

    blanks.forEach(b => { b.classList.add('correct-fill'); b.classList.remove('filled'); });

    spawnPetals();
    if (!qHintUsed) showScorePopup('+' + bonus);

    App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: true, tries: qTryCount, hintUsed: qHintUsed });
    App.currentIdx++;

    qAutoTimer = setTimeout(() => renderQuestion(), 1500);
    showNextBtn();
  } else {
    // ❌ 答错
    fb.className = 'feedback wrong';
    fb.innerHTML = `😢 再试试哦~`;
    speakChinese('再试试~');

    // 标对错
    qBlanks.forEach((p, i) => {
      const c = correctWord[p];
      if (qValues[i] === c) {
        blanks[i].classList.add('correct-fill');
      } else {
        blanks[i].classList.add('wrong-fill');
      }
      blanks[i].textContent = qValues[i] || '?';
    });

    App.streak = 0;
    document.getElementById('qz-streak-badge').style.display = 'none';

    // 显示重试/跳过按钮
    const ctrl = document.getElementById('qz-controls');
    ctrl.innerHTML = `
      <button class="btn btn-green" onclick="qzRetry()">🔄 再试一次</button>
      <button class="btn btn-skip" onclick="qzSkip()">⏭️ 跳过</button>
    `;
  }
}

function qzRetry() {
  // 清空填错的空位，保留正确的
  const correctWord = qWord.word.toUpperCase();
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  qBlanks.forEach((p, i) => {
    if (qValues[i] !== correctWord[p]) {
      qValues[i] = null;
      blanks[i].classList.remove('filled', 'correct-fill', 'wrong-fill');
      blanks[i].textContent = '';
    } else {
      blanks[i].classList.add('correct-fill');
      blanks[i].classList.remove('wrong-fill');
    }
  });

  // 恢复选项按钮
  document.querySelectorAll('#qz-options-row .option-btn').forEach(b => {
    b.style.pointerEvents = 'auto';
    b.style.opacity = '1';
    const letter = b.dataset.letter;
    const usedInCorrect = qBlanks.some((p, i) => qValues[i] === letter);
    if (usedInCorrect) {
      // 正确填的字母，对应选项保持已用
      const alreadyUsed = qBlanks.some((p, i) => qValues[i] === letter && qValues[i] === correctWord[p]);
      if (alreadyUsed) {
        b.classList.add('used');
      } else {
        b.classList.remove('used');
      }
    } else {
      b.classList.remove('used');
    }
  });

  // 全面恢复：正确填入的字母标记为 used，其他的恢复
  document.querySelectorAll('#qz-options-row .option-btn').forEach(b => {
    const letter = b.dataset.letter;
    const isUsedCorrectly = qBlanks.some((p, i) => qValues[i] === letter && qValues[i] === correctWord[p]);
    if (isUsedCorrectly) { b.classList.add('used'); }
    else { b.classList.remove('used'); }
  });

  qAnswered = false;
  document.getElementById('qz-feedback').textContent = '';
  document.getElementById('qz-feedback').className = 'feedback';

  // 恢复控制按钮
  const ctrl = document.getElementById('qz-controls');
  ctrl.innerHTML = `
    <button class="btn btn-white" onclick="qzClear()">🔄 清空</button>
    <button class="btn btn-pink" id="qz-btn-hint" onclick="qzHint()" ${qHintUsed ? 'disabled' : ''}>🔊 提示</button>
    <button class="btn btn-green" id="qz-btn-check" onclick="qzCheck()" ${qValues.every(v => v !== null) ? '' : 'disabled'}>✅ 检查</button>
  `;

  const next = qzFirstUnfilled();
  if (next !== -1) { qzFocusBlank(next); }
}

function qzSkip() {
  // 显示正确答案，记入错词本
  const correctWord = qWord.word.toUpperCase();
  const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
  qBlanks.forEach((p, i) => {
    blanks[i].textContent = correctWord[p];
    blanks[i].classList.add('wrong-fill');
  });

  DB.addWrong(qWord.word, qWord.chinese);
  App.streak = 0;
  App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: false, tries: qTryCount, hintUsed: qHintUsed, skipped: true });
  App.currentIdx++;

  // 禁用交互
  document.querySelectorAll('#qz-options-row .option-btn').forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.4'; });

  const fb = document.getElementById('qz-feedback');
  fb.className = 'feedback wrong';
  fb.innerHTML = `正确答案：<strong>${correctWord}</strong>（已加入错词本）`;

  document.getElementById('qz-streak-badge').style.display = 'none';

  showNextBtn();
  qAutoTimer = setTimeout(() => renderQuestion(), 1800);
}

function showNextBtn() {
  const ctrl = document.getElementById('qz-controls');
  if (document.getElementById('qz-next-btn')) return;
  const nb = document.createElement('button');
  nb.id = 'qz-next-btn';
  nb.className = 'btn btn-orange';
  nb.textContent = '🌸 下一题';
  nb.onclick = () => { clearTimeout(qAutoTimer); renderQuestion(); };
  ctrl.appendChild(nb);
}

function qzUpdateDots(total) {
  const container = document.getElementById('qz-dots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i < App.currentIdx) dot.classList.add('done');
    if (i === App.currentIdx) dot.classList.add('current');
    container.appendChild(dot);
  }
}

// ====== 键盘快捷键 ======
document.addEventListener('keydown', (e) => {
  if (!document.getElementById('page-quiz')?.classList.contains('active')) return;

  if (e.key === 'Enter') {
    const nb = document.getElementById('qz-next-btn');
    if (nb) { clearTimeout(qAutoTimer); renderQuestion(); }
    else if (!qAnswered && qValues.every(v => v !== null)) { qzCheck(); }
  }
  // 数字键 1-9 快速选选项
  if (!qAnswered && e.key >= '1' && e.key <= '9') {
    const idx = parseInt(e.key) - 1;
    const btns = document.querySelectorAll('#qz-options-row .option-btn:not(.used)');
    const allBtns = document.querySelectorAll('#qz-options-row .option-btn');
    if (idx < allBtns.length && !allBtns[idx].classList.contains('used')) {
      qzSelect(idx, allBtns[idx].dataset.letter);
    }
  }
});

// ====== 提交结果 ======
function submitAndShowResult() {
  DB.addTodayDone(App.quizResults.length);
  location.hash = '#result';
}
