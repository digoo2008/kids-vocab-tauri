// ====== 测验页 — 点击填空模式 ======
let qWord = null, qBlanks = [], qValues = [], qOptions = [];
let qHintUsed = false, qAnswered = false, qAutoTimer = null;
let qTryCount = 0; // 当前题尝试次数
let qTimerInterval = null, qStartTime = 0; // 计时器

function qzStartTimer() {
  qStartTime = Date.now();
  clearInterval(qTimerInterval);
  qTimerInterval = setInterval(() => {
    const el = document.getElementById('qz-timer');
    if (!el) { clearInterval(qTimerInterval); return; }
    const sec = Math.floor((Date.now() - qStartTime) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    el.textContent = '⏱ ' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }, 1000);
}

async function initQuiz() {
  if (App.quizWords.length === 0) {
    location.hash = '#home';
    return;
  }
  // 显示当前模式
  const modeMap = { fillblank: '填空模式', dictation: '听写模式' };
  const titleEl = document.getElementById('quiz-mode-title');
  if (titleEl) titleEl.textContent = modeMap[App.quizMode] || '快乐背单词';
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizResults = [];
  qzStartTimer();
  renderQuestion();
}

function renderQuestion() {
  if (App.currentIdx >= App.quizWords.length) {
    submitAndShowResult();
    return;
  }

  if (App.quizMode === 'dictation') {
    renderDictationQuestion();
    return;
  }

  // ====== 填空模式 ======
  const wordData = App.quizWords[App.currentIdx];
  qWord = wordData;
  qHintUsed = false;
  qAnswered = false;
  qTryCount = 0;
  clearTimeout(qAutoTimer);
  clearTimeout(hintBubbleTimer);
  stopAllAudio();
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
      <span class="timer-badge" id="qz-timer">⏱ 00:00</span>
      <div class="progress-dots" id="qz-dots"></div>
      <span class="badge badge-orange" id="qz-streak-badge" style="display:${App.streak>=2?'inline-block':'none'}">🔥 连对 <span id="qz-streak">${App.streak}</span></span>
    </div>

    <div class="chinese-badge">${wordData.chinese}</div>
    <div class="phonetic-row">
      <span class="phonetic-text">${qzGetPhonetic(wordData.word)}</span>
    </div>

    <div class="word-display" id="qz-word-display"></div>
    <div class="feedback" id="qz-feedback"></div>

    <div class="options-label">点击字母填入空白处 · 点击已填字母可撤回</div>
    <div class="options-row" id="qz-options-row"></div>

    <div class="controls-row" id="qz-controls">
      <button class="btn btn-white" onclick="qzClear()">清空</button>
      <button class="btn btn-pink" id="qz-btn-hint" onclick="qzHint()">提示</button>
      <button class="btn btn-green" id="qz-btn-check" onclick="qzCheck()" disabled>检查</button>
      <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
      <span class="sep"></span>
      <button class="btn btn-orange" id="qz-next-btn" onclick="qzNextQuestion()">下一题</button>
    </div>
  `;

  // 语音朗读（延迟2秒播放第一遍，播完后延迟3秒再播第二遍）
  setTimeout(() => speak(wordData.word), 2000);
  setTimeout(() => speak(wordData.word), 6500);

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
      box.textContent = wordData.word[i].toLowerCase();
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
  const missing = blanks.map(i => word[i].toLowerCase());
  const all = 'abcdefghijklmnopqrstuvwxyz';
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

  const correctLetter = qWord.word[qBlanks[ti]].toLowerCase();
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
  const correctWord = qWord.word.toLowerCase();
  let userArr = qWord.word.toLowerCase().split('');
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
    playVictorySound();
    if (!qHintUsed) showScorePopup('+' + bonus);

    App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: true, tries: qTryCount, hintUsed: qHintUsed });
    App.currentIdx++;

    // 错词本复习：答对累计，3次后移除
    if ((App.quizType === 'wrongbook' || App.quizType === 'single') && DB.markWrongCorrect(qWord.word)) {
      console.log('错词已移除:', qWord.word);
    }

    qAutoTimer = setTimeout(() => renderQuestion(), 2000);
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
      <button class="btn btn-green" onclick="qzRetry()">再试一次</button>
      <button class="btn btn-skip" onclick="qzSkip()">跳过</button>
      <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
      <span class="sep"></span>
      <button class="btn btn-orange" onclick="qzNextQuestion()">下一题</button>
    `;
  }
}

function qzRetry() {
  // 清空填错的空位，保留正确的
  const correctWord = qWord.word.toLowerCase();
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
    <button class="btn btn-white" onclick="qzClear()">清空</button>
    <button class="btn btn-pink" id="qz-btn-hint" onclick="qzHint()" ${qHintUsed ? 'disabled' : ''}>提示</button>
    <button class="btn btn-green" id="qz-btn-check" onclick="qzCheck()" ${qValues.every(v => v !== null) ? '' : 'disabled'}>检查</button>
    <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
    <span class="sep"></span>
    <button class="btn btn-orange" onclick="qzNextQuestion()">下一题</button>
  `;

  const next = qzFirstUnfilled();
  if (next !== -1) { qzFocusBlank(next); }
}

function qzSkip() {
  // 显示正确答案，记入错词本
  const correctWord = qWord.word.toLowerCase();
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

  qAutoTimer = setTimeout(() => renderQuestion(), 1800);
}

function qzNextQuestion() {
  clearTimeout(qAutoTimer);
  clearTimeout(dAutoTimer);
  
  if (App.quizMode === 'dictation') {
    if (!dAnswered) {
      const userWord = dGetUserWord();
      if (userWord.trim().length > 0) {
        // 有输入 → 先检查答案
        dCheck();
        return;
      }
      // 没输入 → 标记跳过
      if (qWord) {
        DB.addWrong(qWord.word, qWord.chinese);
        App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: false, tries: 0, hintUsed: false, skipped: true });
        App.currentIdx++;
        App.streak = 0;
      }
    }
    renderQuestion();
    return;
  }

  // === 填空模式 ===
  if (!qAnswered) {
    if (qValues.some(v => v !== null && v !== '')) {
      // 有输入 → 先检查答案
      qzCheck();
      return;
    }
    // 没输入 → 视为跳过
    const correctWord = qWord.word.toLowerCase();
    const blanks = document.querySelectorAll('#qz-word-display .letter-blank');
    qBlanks.forEach((p, i) => {
      blanks[i].textContent = correctWord[p];
      blanks[i].classList.add('wrong-fill');
    });
    DB.addWrong(qWord.word, qWord.chinese);
    App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: false, tries: 0, hintUsed: false, skipped: true });
    App.currentIdx++;
  }
  renderQuestion();
}

function qzReplayAudio() {
  if (qWord) speak(qWord.word);
}

// 音标字典
const PHONETIC_DICT = {
  'apple':'/ˈæp.əl/','banana':'/bəˈnæn.ə/','red':'/red/','blue':'/bluː/',
  'green':'/ɡriːn/','yellow':'/ˈjel.oʊ/','cat':'/kæt/','dog':'/dɒɡ/',
  'fish':'/fɪʃ/','bird':'/bɜːrd/','water':'/ˈwɔː.tər/','milk':'/mɪlk/',
  'bread':'/bred/','rice':'/raɪs/','egg':'/eɡ/','book':'/bʊk/',
  'pen':'/pen/','bag':'/bæɡ/','desk':'/desk/','chair':'/tʃer/',
  'table':'/ˈteɪ.bəl/','door':'/dɔːr/','window':'/ˈwɪn.doʊ/',
  'sun':'/sʌn/','moon':'/muːn/','star':'/stɑːr/','tree':'/triː/',
  'flower':'/ˈflaʊ.ər/','house':'/haʊs/','car':'/kɑːr/','ball':'/bɔːl/',
  'hand':'/hænd/','eye':'/aɪ/','ear':'/ɪr/','nose':'/noʊz/',
  'mouth':'/maʊθ/','head':'/hed/','foot':'/fʊt/','white':'/waɪt/',
  'black':'/blæk/','orange':'/ˈɒr.ɪndʒ/','pink':'/pɪŋk/','purple':'/ˈpɜːr.pəl/',
  'big':'/bɪɡ/','small':'/smɔːl/','happy':'/ˈhæp.i/','sad':'/sæd/',
  'good':'/ɡʊd/','bad':'/bæd/','hot':'/hɒt/','cold':'/koʊld/',
  'one':'/wʌn/','two':'/tuː/','three':'/θriː/','four':'/fɔːr/',
  'five':'/faɪv/','six':'/sɪks/','seven':'/ˈsev.ən/','eight':'/eɪt/',
  'nine':'/naɪn/','ten':'/ten/','mother':'/ˈmʌð.ər/','father':'/ˈfɑː.ðər/',
  'sister':'/ˈsɪs.tər/','brother':'/ˈbrʌð.ər/','boy':'/bɔɪ/','girl':'/ɡɜːrl/',
  'man':'/mæn/','woman':'/ˈwʊm.ən/','school':'/skuːl/','teacher':'/ˈtiː.tʃər/',
  'food':'/fuːd/','fruit':'/fruːt/','meat':'/miːt/','cake':'/keɪk/',
  'cup':'/kʌp/','box':'/bɒks/','hat':'/hæt/','shoe':'/ʃuː/',
  'shirt':'/ʃɜːrt/','coat':'/koʊt/','rain':'/reɪn/','snow':'/snoʊ/',
  'day':'/deɪ/','night':'/naɪt/','time':'/taɪm/','year':'/jɪr/',
  'love':'/lʌv/','friend':'/frend/','play':'/pleɪ/','run':'/rʌn/',
  'jump':'/dʒʌmp/','swim':'/swɪm/','fly':'/flaɪ/','eat':'/iːt/',
  'drink':'/drɪŋk/','sleep':'/sliːp/','read':'/riːd/','write':'/raɪt/',
  'sing':'/sɪŋ/','dance':'/dæns/','draw':'/drɔː/','color':'/ˈkʌl.ər/',
  'animal':'/ˈæn.ɪ.məl/','monkey':'/ˈmʌŋ.ki/','tiger':'/ˈtaɪ.ɡər/',
  'lion':'/ˈlaɪ.ən/','elephant':'/ˈel.ɪ.fənt/','horse':'/hɔːrs/',
  'chicken':'/ˈtʃɪk.ɪn/','duck':'/dʌk/','pig':'/pɪɡ/','cow':'/kaʊ/',
  'sheep':'/ʃiːp/','rabbit':'/ˈræb.ɪt/','mouse':'/maʊs/',
};

function qzGetPhonetic(word) {
  const w = word.toLowerCase();
  return PHONETIC_DICT[w] || ('/' + w + '/');
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
  if (App.quizMode === 'dictation') return; // 听写模式由input元素自行处理

  if (e.key === 'Enter') {
    if (qAnswered) { clearTimeout(qAutoTimer); renderQuestion(); }
    else if (qValues.every(v => v !== null)) { qzCheck(); }
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

// ====== 听写模式 ======
let dAnswered = false, dAutoTimer = null;
let dSlots = 0; // 单词字母数

function renderDictationQuestion() {
  const wordData = App.quizWords[App.currentIdx];
  qWord = wordData;
  qHintUsed = false;
  dAnswered = false;
  clearTimeout(dAutoTimer);
  clearTimeout(hintBubbleTimer);
  stopAllAudio();
  document.getElementById('hint-bubble').style.display = 'none';

  const wordLen = wordData.word.length;
  dSlots = wordLen;
  const total = App.quizWords.length;
  const container = document.getElementById('quiz-container');

  // 生成字母输入格子HTML
  let slotHTML = '';
  for (let i = 0; i < wordLen; i++) {
    slotHTML += `<input type="text" class="dict-slot" id="ds-${i}" data-idx="${i}"
      maxlength="1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
      oninput="onDSInput(event, ${i})" onkeydown="onDSKeydown(event, ${i})"
      onfocus="onDSFocus(${i})" />`;
  }

  container.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>

    <div class="top-bar">
      <span class="badge badge-cream">⭐ 得分 <span id="qz-score">${App.score}</span></span>
      <span class="timer-badge" id="qz-timer">⏱ 00:00</span>
      <div class="progress-dots" id="qz-dots"></div>
      <span class="badge badge-orange" id="qz-streak-badge" style="display:${App.streak>=2?'inline-block':'none'}">🔥 连对 <span id="qz-streak">${App.streak}</span></span>
    </div>

    <div class="chinese-badge">${wordData.chinese}</div>
    <div class="phonetic-row">
      <span class="phonetic-text">${qzGetPhonetic(wordData.word)}</span>
    </div>

    <div class="dict-slots-label">共 ${wordLen} 个字母</div>
    <div class="dict-slots-row" id="dict-slots-row">
      ${slotHTML}
    </div>
    <div class="feedback" id="qz-feedback"></div>

    <div class="controls-row" id="qz-controls">
      <button class="btn btn-white" onclick="dClear()">清空</button>
      <button class="btn btn-gold" id="qz-btn-hint" onclick="dHint()">提示</button>
      <button class="btn btn-green" id="qz-btn-check" onclick="dCheck()" disabled>检查</button>
      <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
      <button class="btn btn-orange" id="qz-next-btn" onclick="qzNextQuestion()">下一题</button>
    </div>
  `;

  // 语音播报（延迟2秒播放第一遍，播完后延迟3秒再播第二遍）
  setTimeout(() => speak(wordData.word), 2000);
  setTimeout(() => speak(wordData.word), 6500);

  // 自动聚焦第一个格子
  setTimeout(() => {
    const first = document.getElementById('ds-0');
    if (first) first.focus();
  }, 200);

  // 进度圆点
  qzUpdateDots(total);
}

function onDSFocus(idx) {
  // 高亮当前格子
  document.querySelectorAll('.dict-slot').forEach(s => s.classList.remove('active-slot'));
  const el = document.getElementById('ds-' + idx);
  if (el) el.classList.add('active-slot');
}

function onDSInput(e, idx) {
  if (dAnswered) return;
  const val = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
  e.target.value = val.slice(-1); // 只保留最后一个字母

  if (val.length > 0 && idx < dSlots - 1) {
    // 自动跳到下一个格子
    const next = document.getElementById('ds-' + (idx + 1));
    if (next) { next.focus(); next.select(); }
  }

  updateDCheckBtn();
}

function onDSKeydown(e, idx) {
  if (dAnswered) return;

  if (e.key === 'Backspace') {
    const el = document.getElementById('ds-' + idx);
    if (el && el.value === '' && idx > 0) {
      // 当前为空，跳到前一个格子
      e.preventDefault();
      const prev = document.getElementById('ds-' + (idx - 1));
      if (prev) { prev.value = ''; prev.focus(); }
    }
    // 如果当前有值，让默认backspace清除后不跳转
    setTimeout(() => updateDCheckBtn(), 50);
  }

  if (e.key === 'ArrowLeft' && idx > 0) {
    e.preventDefault();
    const prev = document.getElementById('ds-' + (idx - 1));
    if (prev) prev.focus();
  }

  if (e.key === 'ArrowRight' && idx < dSlots - 1) {
    e.preventDefault();
    const next = document.getElementById('ds-' + (idx + 1));
    if (next) next.focus();
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (dAllFilled()) dCheck();
  }
}

function dAllFilled() {
  for (let i = 0; i < dSlots; i++) {
    const el = document.getElementById('ds-' + i);
    if (!el || !el.value.trim()) return false;
  }
  return true;
}

function updateDCheckBtn() {
  const btn = document.getElementById('qz-btn-check');
  if (btn) btn.disabled = !dAllFilled();
}

function dHint() {
  if (dAnswered) return;
  qHintUsed = true;
  qTryCount++;
  // 禁用提示按钮
  document.getElementById('qz-btn-hint').disabled = true;
  // 语音 + 右上角气泡
  speak(qWord.word);
  showHintBubble(qWord.word);
}

function dClear() {
  if (dAnswered) return;
  for (let i = 0; i < dSlots; i++) {
    const el = document.getElementById('ds-' + i);
    if (el) { el.value = ''; el.className = 'dict-slot'; }
  }
  const first = document.getElementById('ds-0');
  if (first) first.focus();
  document.getElementById('qz-btn-check').disabled = true;
}

function dGetUserWord() {
  let word = '';
  for (let i = 0; i < dSlots; i++) {
    const el = document.getElementById('ds-' + i);
    word += (el && el.value) ? el.value.toLowerCase() : '';
  }
  return word;
}

function dCheck() {
  if (dAnswered) return;
  dAnswered = true;
  clearTimeout(dAutoTimer);

  const userWord = dGetUserWord();
  const correctWord = qWord.word.toLowerCase();
  const fb = document.getElementById('qz-feedback');

  // 禁用所有格子
  for (let i = 0; i < dSlots; i++) {
    const el = document.getElementById('ds-' + i);
    if (el) el.disabled = true;
  }
  document.getElementById('qz-btn-check').disabled = true;
  const hintBtn = document.getElementById('qz-btn-hint');
  if (hintBtn) hintBtn.disabled = true;

  if (userWord === correctWord) {
    // 答对
    fb.className = 'feedback correct';
    let bonus = 10;
    if (App.streak >= 3) bonus += 5;
    App.score += bonus;
    App.streak++;
    fb.innerHTML = `🎉 太棒了！+${bonus}分<br/>正确答案：<strong>${correctWord}</strong>`;
    document.getElementById('qz-score').textContent = App.score;

    if (App.streak >= 2) {
      document.getElementById('qz-streak-badge').style.display = 'inline-block';
      document.getElementById('qz-streak').textContent = App.streak;
    }

    // 所有格子变绿
    for (let i = 0; i < dSlots; i++) {
      const el = document.getElementById('ds-' + i);
      if (el) el.classList.add('correct-slot');
    }

    spawnPetals();
    playVictorySound();
    showScorePopup('+' + bonus);

    App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: true, tries: 1, hintUsed: qHintUsed });
    App.currentIdx++;

    // 错词本复习：答对累计，3次后移除
    if ((App.quizType === 'wrongbook' || App.quizType === 'single') && DB.markWrongCorrect(qWord.word)) {
      console.log('错词已移除:', qWord.word);
    }

    dAutoTimer = setTimeout(() => renderQuestion(), 2000);

  } else {
    // 答错 — 逐格对比标色
    for (let i = 0; i < dSlots; i++) {
      const el = document.getElementById('ds-' + i);
      if (!el) continue;
      if (el.value.toLowerCase() === correctWord[i]) {
        el.classList.add('correct-slot');
      } else {
        el.classList.add('wrong-slot');
        el.value = correctWord[i]; // 显示正确答案
      }
    }

    fb.className = 'feedback wrong';
    fb.innerHTML = `正确答案：<strong>${correctWord}</strong>（已加入错词本）`;
    speakChinese('再试试~');

    DB.addWrong(qWord.word, qWord.chinese);
    App.streak = 0;
    document.getElementById('qz-streak-badge').style.display = 'none';

    App.quizResults.push({ word: qWord.word, chinese: qWord.chinese, correct: false, tries: 1, hintUsed: qHintUsed });
    App.currentIdx++;

    // 显示控制按钮
    const ctrl = document.getElementById('qz-controls');
    ctrl.innerHTML = `
      <button class="btn btn-green" onclick="dRetry()">再试一次</button>
      <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
      <button class="btn btn-orange" onclick="qzNextQuestion()">下一题</button>
    `;

    dAutoTimer = setTimeout(() => renderQuestion(), 3000);
  }
}

function dRetry() {
  dAnswered = false;
  for (let i = 0; i < dSlots; i++) {
    const el = document.getElementById('ds-' + i);
    if (el) {
      el.disabled = false;
      el.value = '';
      el.className = 'dict-slot';
    }
  }
  document.getElementById('qz-feedback').textContent = '';
  document.getElementById('qz-feedback').className = 'feedback';
  document.getElementById('qz-btn-check').disabled = true;

  const ctrl = document.getElementById('qz-controls');
  ctrl.innerHTML = `
    <button class="btn btn-white" onclick="dClear()">清空</button>
    <button class="btn btn-green" id="qz-btn-check" onclick="dCheck()" disabled>检查</button>
    <button class="btn btn-teal" onclick="qzReplayAudio()">重听</button>
    <button class="btn btn-orange" id="qz-next-btn" onclick="qzNextQuestion()">下一题</button>
  `;

  const first = document.getElementById('ds-0');
  if (first) first.focus();
}

// ====== 提交结果 ======
function submitAndShowResult() {
  clearInterval(qTimerInterval);
  DB.addTodayDone(App.quizResults.length);
  location.hash = '#result';
}
