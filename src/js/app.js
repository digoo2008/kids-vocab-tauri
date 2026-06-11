// ====== 快乐背单词 v2.0 — 路由器 + 数据层 ======

// ====== localStorage 数据封装 ======
const DB = {
  _read(key, fallback) { try { const v = localStorage.getItem('kv-' + key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } },
  _write(key, val) { localStorage.setItem('kv-' + key, JSON.stringify(val)); },

  // 题库 { word: { chinese, audio } }
  getBank() { return this._read('bank', {}) },
  setBank(b) { this._write('bank', b); },
  addWords(words) { const b = this.getBank(); for (const w of words) { b[w.word] = { chinese: w.chinese, audio: w.audio || '' }; } this.setBank(b); },
  removeWord(word) { const b = this.getBank(); delete b[word]; this.setBank(b); },
  bankSize() { return Object.keys(this.getBank()).length; },

  // 错词本 { word: { chinese, count, lastWrong } }
  getWrong() { return this._read('wrong', {}) },
  setWrong(w) { this._write('wrong', w); },
  addWrong(word, chinese) {
    const w = this.getWrong();
    if (w[word]) { w[word].count++; w[word].lastWrong = today(); }
    else { w[word] = { chinese, count: 1, lastWrong: today() }; }
    this.setWrong(w);
  },
  removeWrong(word) { const w = this.getWrong(); delete w[word]; this.setWrong(w); },

  // 今日进度
  getToday() { const t = this._read('today', { date: today(), done: 0 }); if (t.date !== today()) return { date: today(), done: 0 }; return t; },
  addTodayDone(n) { const t = this.getToday(); t.done += n; this._write('today', t); },

  // 预置默认词库
  ensureDefaults() {
    const b = this.getBank();
    const defs = [{w:'apple',c:'苹果'},{w:'banana',c:'香蕉'},{w:'red',c:'红色'},{w:'blue',c:'蓝色'}];
    let added = 0;
    for (const d of defs) { if (!b[d.w]) { b[d.w] = { chinese: d.c, audio: '' }; added++; } }
    if (added > 0) { this.setBank(b); }
    return added;
  }
};

function today() { return new Date().toISOString().slice(0, 10); }

// ====== 全局状态 ======
const App = {
  quizWords: [],     // 本轮题目 [{word,chinese,audio}]
  quizResults: [],   // [{word,chinese,correct,tries,hintUsed}]
  currentIdx: 0,
  score: 0,
  streak: 0,
  quizType: 'bank',  // 'bank' | 'wrongbook' | 'single'

  navigate(hash) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageId = (hash || '#home').replace('#', '');
    const page = document.getElementById('page-' + pageId);
    if (!page) return;
    page.classList.add('active');
    if (pageId === 'home') initHome();
    if (pageId === 'wordbank') initWordBank();
    if (pageId === 'quiz') initQuiz();
    if (pageId === 'result') initResult();
    if (pageId === 'wrongbook') initWrongBook();
  }
};

// ====== Toast ======
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ====== 弹窗 ======
function showModal(text, onOk, okText) {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><div class="modal-text">${text}</div><button class="btn btn-green" style="font-size:22px;padding:12px 40px">${okText||'确定'}</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('button').onclick = () => { overlay.remove(); if (onOk) onOk(); };
}

// ====== 语音 ======
function speak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-US'; u.rate = 0.85; u.pitch = 1.1;
  speechSynthesis.speak(u);
}
function speakChinese(text) { speak(text, 'zh-CN'); }

// ====== 提示气泡 ======
let hintBubbleTimer = null;
function showHintBubble(word) {
  clearTimeout(hintBubbleTimer);
  const b = document.getElementById('hint-bubble');
  b.textContent = word.toUpperCase();
  b.style.display = 'block';
  b.classList.remove('fade-out');
  hintBubbleTimer = setTimeout(() => { b.classList.add('fade-out'); setTimeout(() => { b.style.display = 'none'; }, 500); }, 3000);
}

// ====== 撒花 ======
function spawnPetals() {
  const c = document.createElement('div'); c.className = 'confetti-container';
  const colors = ['#f48fb1','#ce93d8','#fff176','#81c784','#90caf9','#ffab91'];
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div'); p.className = 'petal-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = -(Math.random() * 60) + 'px';
    p.style.width = (12 + Math.random() * 18) + 'px';
    p.style.height = (12 + Math.random() * 18) + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = (1.5 + Math.random() * 2.5) + 's';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 3500);
}
function showScorePopup(text) {
  const p = document.createElement('div'); p.className = 'score-popup';
  p.textContent = text; p.style.left = (30 + Math.random() * 30) + '%'; p.style.top = '38%';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1200);
}

// ====== 路由监听 ======
window.addEventListener('hashchange', () => App.navigate(location.hash));
document.addEventListener('DOMContentLoaded', () => {
  DB.ensureDefaults(); // 首次启动时预置默认词库
  App.navigate(location.hash || '#home');
});
