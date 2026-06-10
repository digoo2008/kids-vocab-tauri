// ====== 填空测验页 ======
let qfWord = null, qfBlanks = [], qfValues = [], qfOptions = [];
let qfHintUsed = false, qfAnswered = false, qfAutoTimer = null;

async function initQuiz() {
  const words = await Tauri.invoke('get_words', {
    grade: App.settings.grade, count: App.settings.word_count
  });
  App.quizWords = words;
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizResults = [];
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (App.currentIdx >= App.quizWords.length) {
    submitAndShowResult();
    return;
  }

  const word = App.quizWords[App.currentIdx];
  const isFill = (App.settings.quiz_type === 'mixed')
    ? (App.currentIdx % 2 === 0)
    : (App.settings.quiz_type === 'fill');

  if (isFill) {
    renderFillQuestion(word);
  } else {
    renderDragQuestion(word);
  }
}

// ====== 填空模式 ======
function renderFillQuestion(word) {
  qfWord = word;
  qfHintUsed = false;
  qfAnswered = false;
  clearTimeout(qfAutoTimer);

  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="top-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span class="badge badge-cream">⭐ 得分 <span id="quiz-score">${App.score}</span></span>
      <span style="font-size:16px;color:#a5d6a7;">${App.currentIdx+1}/${App.quizWords.length}</span>
      <span class="badge badge-orange" id="quiz-streak-badge" style="display:${App.streak>=2?'inline-block':'none'}">🔥 连对 <span id="quiz-streak">${App.streak}</span></span>
    </div>
    <div class="title-area"><span class="app-icon">🐣</span><span class="title">快乐背单词</span></div>
    <div class="chinese-badge" id="chinese-badge" style="font-size:26px;font-weight:800;background:linear-gradient(135deg,#fffde7,#fff9c4);padding:8px 32px;border-radius:32px;border:3px solid #fff176;display:inline-block;margin:8px 0;color:#5d4037;">💬 ${word.chinese}</div>
    <div class="word-display" id="word-display" style="display:flex;justify-content:center;gap:12px;margin:12px 0;flex-wrap:wrap;"></div>
    <div class="feedback" id="feedback" style="min-height:36px;font-size:20px;font-weight:700;margin:6px 0;"></div>
    <div class="options-label" style="font-size:14px;color:#a5d6a7;margin-bottom:8px;">👇 点击下方字母填入空白处（点击已填字母可撤回）</div>
    <div class="options-row" id="options-row" style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;"></div>
    <div class="controls-row" id="controls-row" style="display:flex;justify-content:center;gap:12px;margin-top:12px;">
      <button class="btn btn-white" onclick="qfClear()">🔄 清空</button>
      <button class="btn btn-pink" id="btn-hint" onclick="qfHint()">🔊 提示</button>
      <button class="btn btn-green" id="btn-check" onclick="qfCheck()" disabled>✅ 检查</button>
    </div>
  `;

  const len = word.word.length;
  let nb = Math.min(Math.max(1, Math.ceil(len*0.35)), 3, len-1);
  let allP = Array.from({length:len},(_,i)=>i);
  for (let i=allP.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allP[i],allP[j]]=[allP[j],allP[i]];}
  qfBlanks = allP.slice(0,nb).sort((a,b)=>a-b);
  qfValues = new Array(qfBlanks.length).fill(null);

  const display = document.getElementById('word-display');
  for (let i=0;i<len;i++) {
    const box = document.createElement('div');
    box.style.cssText = 'width:90px;height:120px;display:flex;align-items:center;justify-content:center;font-size:60px;font-weight:800;border-radius:24px;transition:all 0.3s;';
    const bi = qfBlanks.indexOf(i);
    if (bi>=0) {
      box.style.cssText += 'background:#f5f5f5;border:3px dashed #a5d6a7;box-shadow:inset 0 3px 8px rgba(0,0,0,0.05);animation:pulse-blank 2.5s ease-in-out infinite;cursor:pointer;';
      box.dataset.blankIdx = bi;
      box.innerHTML = '<span style="font-size:44px;color:#c8e6c9;">?</span>';
      box.addEventListener('click',()=>qfClickBlank(bi));
    } else {
      box.style.cssText += 'background:linear-gradient(180deg,#fffde7,#fff9c4);color:#5d4037;box-shadow:0 6px 24px rgba(102,187,106,0.3);border:3px solid #fff176;';
      box.textContent = word.word[i].toUpperCase();
    }
    display.appendChild(box);
  }

  qfOptions = qfGenOptions(word, qfBlanks);
  qfRenderOptions();
}

function qfGenOptions(word, blanks) {
  const missing = blanks.map(i=>word.word[i].toUpperCase());
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let opts = [...missing];
  while (opts.length < Math.max(6, missing.length+2)) {
    const r = all[Math.floor(Math.random()*26)];
    if (!opts.includes(r)) opts.push(r);
  }
  for (let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}
  return opts;
}

function qfRenderOptions() {
  const row = document.getElementById('options-row');
  row.innerHTML = '';
  qfOptions.forEach((l,i)=>{
    const btn = document.createElement('button');
    btn.style.cssText = 'width:70px;height:70px;font-size:36px;font-weight:800;border:3px solid #c8e6c9;border-radius:20px;cursor:pointer;background:#fff;color:#5d4037;transition:all 0.2s;box-shadow:0 4px 14px rgba(0,0,0,0.06);font-family:Segoe UI,PingFang SC,sans-serif;';
    btn.textContent = l;
    btn.dataset.optIdx = i;
    btn.dataset.letter = l;
    btn.addEventListener('click',()=>qfSelect(i,l));
    row.appendChild(btn);
  });
}

function qfSelect(oi, letter) {
  if (qfAnswered) return;
  const ti = qfValues.findIndex(v=>v===null);
  if (ti===-1) return;
  qfValues[ti] = letter;
  const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
  const box = blanks[ti];
  box.style.background = 'linear-gradient(180deg,#e8f5e9,#c8e6c9)';
  box.style.border = '3px solid #66bb6a';
  box.style.animation = 'none';
  box.innerHTML = letter;
  document.querySelectorAll('#options-row button')[oi].style.opacity = '0.3';
  document.querySelectorAll('#options-row button')[oi].style.pointerEvents = 'none';
  if (qfValues.every(v=>v!==null)) document.getElementById('btn-check').disabled = false;
}

function qfClickBlank(bi) {
  if (qfAnswered) return;
  if (qfValues[bi]!==null) {
    const letter = qfValues[bi];
    qfValues[bi] = null;
    const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
    blanks[bi].style.background = '#f5f5f5';
    blanks[bi].style.border = '3px dashed #a5d6a7';
    blanks[bi].style.animation = 'pulse-blank 2.5s ease-in-out infinite';
    blanks[bi].innerHTML = '<span style="font-size:44px;color:#c8e6c9;">?</span>';
    const btns = document.querySelectorAll('#options-row button');
    for (const b of btns) {
      if (b.dataset.letter===letter && b.style.opacity==='0.3') {
        b.style.opacity = '1'; b.style.pointerEvents = 'auto'; break;
      }
    }
    document.getElementById('btn-check').disabled = true;
  }
}

function qfClear() {
  if (qfAnswered) return;
  qfValues = qfValues.map(()=>null);
  const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
  blanks.forEach(b=>{
    b.style.background = '#f5f5f5'; b.style.border = '3px dashed #a5d6a7';
    b.style.animation = 'pulse-blank 2.5s ease-in-out infinite';
    b.innerHTML = '<span style="font-size:44px;color:#c8e6c9;">?</span>';
  });
  document.querySelectorAll('#options-row button').forEach(b=>{b.style.opacity='1';b.style.pointerEvents='auto';});
  document.getElementById('btn-check').disabled = true;
}

function qfHint() {
  if (qfAnswered) return;
  qfHintUsed = true;
  document.getElementById('btn-hint').disabled = true;
  speak(qfWord.word);
  const ti = qfValues.findIndex(v=>v===null);
  if (ti===-1) return;
  const letter = qfWord.word[qfBlanks[ti]].toUpperCase();
  qfValues[ti] = letter;
  const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
  blanks[ti].style.background = 'linear-gradient(180deg,#e8f5e9,#c8e6c9)';
  blanks[ti].style.border = '3px solid #66bb6a';
  blanks[ti].style.animation = 'none';
  blanks[ti].innerHTML = letter;
  const btns = document.querySelectorAll('#options-row button');
  for (const b of btns) {
    if (b.dataset.letter===letter&&b.style.opacity!=='0.3'){b.style.opacity='0.3';b.style.pointerEvents='none';break;}
  }
  if (qfValues.every(v=>v!==null)) document.getElementById('btn-check').disabled = false;
}

function qfCheck() {
  if (qfAnswered) return;
  qfAnswered = true;
  clearTimeout(qfAutoTimer);
  const fb = document.getElementById('feedback');
  const correctWord = qfWord.word.toUpperCase();
  let userArr = qfWord.word.toUpperCase().split('');
  qfBlanks.forEach((p,i)=>{ userArr[p]=qfValues[i]||''; });
  const userWord = userArr.join('');

  const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
  document.querySelectorAll('#options-row button').forEach(b=>{b.style.pointerEvents='none';b.style.opacity='0.3';});
  document.getElementById('btn-check').disabled = true;
  document.getElementById('btn-hint').disabled = true;

  const isCorrect = userWord === correctWord;

  if (isCorrect) {
    fb.style.color = '#43a047'; fb.className = 'feedback';
    let bonus = qfHintUsed ? 5 : 10;
    if (App.streak>=3) bonus+=5;
    App.score += bonus; App.streak++;
    fb.innerHTML = `🎉 太棒了！+${bonus}分<br>正确答案：<strong>${correctWord}</strong>`;
    document.getElementById('quiz-score').textContent = App.score;
    if (App.streak>=2){const sb=document.getElementById('quiz-streak-badge');sb.style.display='inline-block';document.getElementById('quiz-streak').textContent=App.streak;}
    blanks.forEach(b=>{b.style.background='linear-gradient(180deg,#e8f5e9,#c8e6c9)';b.style.border='3px solid #66bb6a';b.style.boxShadow='0 6px 20px rgba(102,187,106,0.5)';});
  } else {
    fb.style.color = '#e53935'; fb.className = 'feedback';
    fb.style.animation = 'shake 0.5s ease';
    fb.innerHTML = `😢 再试试哦~ 正确答案：<strong>${correctWord}</strong>`;
    App.streak = 0;
    document.getElementById('quiz-streak-badge').style.display = 'none';
    qfBlanks.forEach((p,i)=>{blanks[i].innerHTML=correctWord[p];blanks[i].style.border=correctWord[p]===qfValues[i]?'3px solid #66bb6a':'3px solid #e53935';});
  }

  App.quizResults.push({ word: qfWord.word, chinese: qfWord.chinese, correct: isCorrect, hint_used: qfHintUsed });
  App.currentIdx++;

  showNextBtn(() => renderQuizQuestion());
  if (isCorrect) { qfAutoTimer = setTimeout(() => renderQuizQuestion(), 1500); }
}

// ====== 拖拽模式（简化版，复用原型代码结构） ======
function renderDragQuestion(word) {
  qfWord = word; qfHintUsed = false; qfAnswered = false;
  clearTimeout(qfAutoTimer);

  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="top-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span class="badge badge-cream">⭐ 得分 <span id="quiz-score">${App.score}</span></span>
      <span style="font-size:16px;color:#a5d6a7;">${App.currentIdx+1}/${App.quizWords.length}</span>
      <span class="badge badge-orange" id="quiz-streak-badge" style="display:${App.streak>=2?'inline-block':'none'}">🔥 连对 <span id="quiz-streak">${App.streak}</span></span>
    </div>
    <div class="title-area"><span class="app-icon">🐣</span><span class="title">快乐背单词 — 拖拽拼写</span></div>
    <div class="chinese-badge" style="font-size:26px;font-weight:800;background:linear-gradient(135deg,#fffde7,#fff9c4);padding:8px 32px;border-radius:32px;border:3px solid #fff176;display:inline-block;margin:8px 0;color:#5d4037;">💬 ${word.chinese}</div>
    <div class="word-display" id="word-display" style="display:flex;justify-content:center;gap:12px;margin:12px 0;flex-wrap:wrap;"></div>
    <div class="feedback" id="feedback" style="min-height:36px;font-size:20px;font-weight:700;margin:6px 0;"></div>
    <div style="font-size:14px;color:#a5d6a7;margin-bottom:8px;">🖐️ 把下方字母拖到单词空白处（点击已填字母可撤回）</div>
    <div class="drag-tiles" id="drag-tiles" style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;min-height:82px;"></div>
    <div class="controls-row" id="controls-row" style="display:flex;justify-content:center;gap:12px;margin-top:12px;">
      <button class="btn btn-white" onclick="qfClear()">🔄 清空</button>
      <button class="btn btn-pink" id="btn-hint" onclick="qfHint()">🔊 提示</button>
      <button class="btn btn-green" id="btn-check" onclick="qfCheck()" disabled>✅ 检查</button>
    </div>
  `;

  const len = word.word.length;
  let nb = Math.min(Math.max(1, Math.ceil(len*0.35)), 3, len-1);
  let allP = Array.from({length:len},(_,i)=>i);
  for (let i=allP.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allP[i],allP[j]]=[allP[j],allP[i]];}
  qfBlanks = allP.slice(0,nb).sort((a,b)=>a-b);
  qfValues = new Array(qfBlanks.length).fill(null);

  const display = document.getElementById('word-display');
  for (let i=0;i<len;i++) {
    const box = document.createElement('div');
    box.style.cssText = 'width:90px;height:120px;display:flex;align-items:center;justify-content:center;font-size:60px;font-weight:800;border-radius:24px;transition:all 0.3s;';
    const bi = qfBlanks.indexOf(i);
    if (bi>=0) {
      box.style.cssText += 'background:#f5f5f5;border:3px dashed #a5d6a7;box-shadow:inset 0 3px 8px rgba(0,0,0,0.05);animation:pulse-blank 2.5s ease-in-out infinite;cursor:pointer;';
      box.dataset.blankIdx = bi;
      box.innerHTML = '<span style="font-size:44px;color:#c8e6c9;">?</span>';
      box.addEventListener('dragover', e=>{e.preventDefault();box.style.borderColor='#ff7043';box.style.borderStyle='solid';box.style.boxShadow='0 0 28px rgba(255,112,67,0.5)';box.style.background='#fff3e0';});
      box.addEventListener('dragleave', ()=>{box.style.borderColor='#a5d6a7';box.style.borderStyle='dashed';box.style.boxShadow='inset 0 3px 8px rgba(0,0,0,0.05)';box.style.background='#f5f5f5';});
      box.addEventListener('drop', e=>{e.preventDefault();box.style.borderColor='#a5d6a7';box.style.borderStyle='dashed';box.style.boxShadow='inset 0 3px 8px rgba(0,0,0,0.05)';box.style.background='#f5f5f5';const l=e.dataTransfer.getData('text/plain');if(l)qfDragFill(bi,l);});
      box.addEventListener('click',()=>qfClickBlank(bi));
    } else {
      box.style.cssText += 'background:linear-gradient(180deg,#fffde7,#fff9c4);color:#5d4037;box-shadow:0 6px 24px rgba(102,187,106,0.3);border:3px solid #fff176;';
      box.textContent = word.word[i].toUpperCase();
    }
    display.appendChild(box);
  }

  qfOptions = qfGenOptions(word, qfBlanks);
  qfRenderDragTiles();
}

function qfRenderDragTiles() {
  const container = document.getElementById('drag-tiles');
  container.innerHTML = '';
  qfOptions.forEach((l,i)=>{
    const tile = document.createElement('div');
    tile.style.cssText = 'width:75px;height:75px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;border:3px solid #c8e6c9;border-radius:20px;cursor:grab;background:linear-gradient(180deg,#fff,#f5f5f5);color:#5d4037;box-shadow:0 4px 16px rgba(0,0,0,0.06);font-family:Segoe UI,PingFang SC,sans-serif;transition:all 0.2s;';
    tile.textContent = l;
    tile.draggable = true;
    tile.dataset.tileIdx = i;
    tile.dataset.letter = l;
    tile.addEventListener('dragstart', e=>{if(tile.style.opacity==='0.2'){e.preventDefault();return;}tile.style.opacity='0.4';e.dataTransfer.setData('text/plain',l);});
    tile.addEventListener('dragend', ()=>{tile.style.opacity='1';});
    container.appendChild(tile);
  });
}

function qfDragFill(bi, letter) {
  if (qfAnswered||qfValues[bi]!==null) return;
  qfValues[bi] = letter;
  const blanks = document.getElementById('word-display').querySelectorAll('[data-blank-idx]');
  blanks[bi].style.background = 'linear-gradient(180deg,#e8f5e9,#c8e6c9)';
  blanks[bi].style.border = '3px solid #66bb6a';
  blanks[bi].style.animation = 'none';
  blanks[bi].innerHTML = letter;
  const tiles = document.querySelectorAll('#drag-tiles > div');
  for (const t of tiles) { if (t.dataset.letter===letter&&t.style.opacity!=='0.2'){t.style.opacity='0.2';t.style.pointerEvents='none';break;} }
  if (qfValues.every(v=>v!==null)) document.getElementById('btn-check').disabled = false;
}

// ====== 通用：下一题按钮 + 语音 ======
function showNextBtn(callback) {
  const ctrl = document.getElementById('controls-row');
  if (document.getElementById('next-btn')) return;
  const nb = document.createElement('button');
  nb.id = 'next-btn';
  nb.className = 'btn btn-orange';
  nb.textContent = '🌸 下一题';
  nb.onclick = ()=>{clearTimeout(qfAutoTimer);callback();};
  ctrl.appendChild(nb);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang='en-US';u.rate=0.85;u.pitch=1.1;
  speechSynthesis.speak(u);
}

// Enter 键
document.addEventListener('keydown', e=>{
  if (e.key==='Enter'){
    const nb=document.getElementById('next-btn');
    if (nb){clearTimeout(qfAutoTimer);renderQuizQuestion();}
    else if (!qfAnswered&&qfValues.every(v=>v!==null)) qfCheck();
  }
});

// ====== 提交结果 ======
async function submitAndShowResult() {
  const sub = {
    grade: App.settings.grade,
    quiz_type: App.settings.quiz_type,
    total: App.quizResults.length,
    correct: App.quizResults.filter(r=>r.correct).length,
    score: App.score,
    details: App.quizResults
  };
  try { await Tauri.invoke('submit_quiz', { submission: sub }); } catch(e) {}
  location.hash = '#result';
}
