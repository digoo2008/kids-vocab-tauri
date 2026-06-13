// ====== 快乐背单词 v2.0 — 路由器 + 数据层 ======

// ====== localStorage 数据封装 ======
const DB = {
  _read(key, fallback) { try { const v = localStorage.getItem('kv-' + key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } },
  _write(key, val) { localStorage.setItem('kv-' + key, JSON.stringify(val)); },

  // 题库 { word: { chinese, audio, phonetic, category, imported_at } }
  getBank() { return this._read('bank', {}) },
  setBank(b) { this._write('bank', b); },
  addWords(words) {
    const b = this.getBank();
    const now = new Date().toISOString();
    for (const w of words) {
      const existing = b[w.word] || {};
      b[w.word] = {
        chinese: w.chinese || existing.chinese || '',
        audio: w.audio || existing.audio || '',
        phonetic: w.phonetic || existing.phonetic || '',
        category: w.category || existing.category || '',
        imported_at: existing.imported_at || now
      };
    }
    this.setBank(b);
  },
  removeWord(word) { const b = this.getBank(); delete b[word]; this.setBank(b); },
  bankSize() { return Object.keys(this.getBank()).length; },

  // 分类管理
  getCategories() {
    const stored = this.getStoredCategories();
    const b = this.getBank();
    const cats = new Set(stored);
    for (const w of Object.values(b)) { if (w.category) cats.add(w.category); }
    return [...cats].sort();
  },
  getStoredCategories() {
    return this._read('categories', []);
  },
  addCategory(name) {
    if (!name || !name.trim()) return;
    const cats = this.getStoredCategories();
    const trimmed = name.trim();
    if (!cats.includes(trimmed)) {
      cats.push(trimmed);
      this._write('categories', cats);
    }
  },
  removeCategory(name) {
    const cats = this.getStoredCategories().filter(c => c !== name);
    this._write('categories', cats);
  },
  renameCategory(oldName, newName) {
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    if (oldName === trimmed) return;
    // 更新存储中的名称
    const cats = this.getStoredCategories().map(c => c === oldName ? trimmed : c);
    this._write('categories', cats);
    // 更新所有已分配该分类的单词
    const b = this.getBank();
    let changed = false;
    for (const [word, data] of Object.entries(b)) {
      if (data.category === oldName) {
        b[word].category = trimmed;
        changed = true;
      }
    }
    if (changed) this.setBank(b);
  },
  getImportGroups() {
    const b = this.getBank();
    const groups = {};
    for (const [word, data] of Object.entries(b)) {
      const date = (data.imported_at || '').slice(0, 10);
      if (!date) continue;
      if (!groups[date]) groups[date] = [];
      groups[date].push(word);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, words]) => ({ date, words }));
  },
  updateCategory(word, category) {
    const b = this.getBank();
    if (b[word]) { b[word].category = category; this.setBank(b); }
  },
  getWordsByCategory(category) {
    const b = this.getBank();
    const result = [];
    for (const [word, data] of Object.entries(b)) {
      if (data.category === category) result.push({ word, ...data });
    }
    return result;
  },
  getWordsByImportDate(date) {
    const b = this.getBank();
    const result = [];
    for (const [word, data] of Object.entries(b)) {
      if ((data.imported_at || '').slice(0, 10) === date) result.push({ word, ...data });
    }
    return result;
  },

  // 错词本 { word: { chinese, count, lastWrong } }
  getWrong() { return this._read('wrong', {}) },
  setWrong(w) { this._write('wrong', w); },
  addWrong(word, chinese) {
    const w = this.getWrong();
    if (w[word]) { w[word].count++; w[word].lastWrong = today(); w[word].correctCount = 0; }
    else { w[word] = { chinese, count: 1, lastWrong: today(), correctCount: 0 }; }
    this.setWrong(w);
  },
  removeWrong(word) { const w = this.getWrong(); delete w[word]; this.setWrong(w); },
  // 错词复习答对一次，返回 true 表示已被移除（累计3次）
  markWrongCorrect(word) {
    const w = this.getWrong();
    if (!w[word]) return false;
    w[word].correctCount = (w[word].correctCount || 0) + 1;
    if (w[word].correctCount >= 3) {
      delete w[word];
      this.setWrong(w);
      return true;
    }
    this.setWrong(w);
    return false;
  },

  // 今日进度
  getToday() { const t = this._read('today', { date: today(), done: 0 }); if (t.date !== today()) return { date: today(), done: 0 }; return t; },
  addTodayDone(n) { const t = this.getToday(); t.done += n; this._write('today', t); },

  // 预置默认词库
  ensureDefaults() {
    const b = this.getBank();
    const defs = [{w:'apple',c:'苹果'},{w:'banana',c:'香蕉'},{w:'red',c:'红色'},{w:'blue',c:'蓝色'}];
    let added = 0;
    const now = new Date().toISOString();
    for (const d of defs) { if (!b[d.w]) { b[d.w] = { chinese: d.c, audio: '', phonetic: '', category: '', imported_at: now }; added++; } }
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
  quizMode: 'fillblank',  // 'fillblank' | 'dictation'
  homeCategory: 'all',  // 首页选中的分类

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
    if (pageId === 'settings') initSettings();
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
  overlay.innerHTML = `<div class="modal-box"><div class="modal-text">${text}</div><div style="display:flex;gap:14px;justify-content:center;"><button class="btn btn-white" style="font-size:22px;padding:12px 40px">取消</button><button class="btn btn-green" style="font-size:22px;padding:12px 40px">${okText||'确定'}</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => { overlay.remove(); if (btn.classList.contains('btn-green') && onOk) onOk(); };
  });
}

// ====== 语音 ======

let ttsAudioEl = null; // 复用 Audio 元素

// 播放 base64 音频
function playBase64Audio(dataUrl) {
  if (!ttsAudioEl) ttsAudioEl = new Audio();
  ttsAudioEl.src = dataUrl;
  ttsAudioEl.play().catch(() => {});
}

// 停止所有正在播放的音频
function stopAllAudio() {
  if (ttsAudioEl) {
    ttsAudioEl.pause();
    ttsAudioEl.currentTime = 0;
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

// 胜利音效：C-E-G-C 上行琶音（do-mi-sol-do'）
function playVictorySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch (e) { /* 静默失败 */ }
}

// Blob → base64 data URL
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 调用豆包 TTS API，返回 base64 data URL（失败返回 null）
async function fetchDoubaoTTSAudio(text) {
  const apiKey = localStorage.getItem('kv-doubao-tts-key') || '';
  if (!apiKey) return null;

  // 优先通过 Tauri 后端代理（绕过浏览器 CORS）
  try {
    if (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined') {
      const { invoke } = await import('@tauri-apps/api/core');
      const base64Audio = await invoke('fetch_tts_audio', { text, apiKey });
      return 'data:audio/mp3;base64,' + base64Audio;
    }
  } catch (e) {
    console.warn('Tauri TTS 代理失败，尝试直接请求:', e.message);
  }

  // 回退：通过本地 Node.js 代理（浏览器测试用）
  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Api-Resource-Id': 'seed-tts-2.0'
        },
        body: {
          user: { uid: 'kids-vocab' },
          req_params: {
            text: text,
            speaker: 'en_female_dacey_uranus_bigtts',
            audio_params: {
              format: 'mp3',
              sample_rate: 24000
            }
          }
        }
      })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    // 先尝试作为 SSE 文本解析，收集音频数据
    const sseText = await resp.text();
    console.log('TTS SSE raw (first 500 chars):', sseText.slice(0, 500));

    const audioChunks = [];

    // 尝试按 SSE 事件分隔
    let events = sseText.split('\n\n');
    if (events.length <= 1) events = sseText.split('\r\n\r\n');
    console.log('TTS SSE event count:', events.length);

    for (const event of events) {
      if (!event.trim()) continue;
      console.log('TTS SSE event:', event.slice(0, 200));
      for (const line of event.trim().split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        console.log('TTS SSE data (first 100):', data.slice(0, 100));

        // 尝试 JSON → 提取音频字段（V3 使用 "data" 字段）
        try {
          const json = JSON.parse(data);
          console.log('TTS SSE json keys:', Object.keys(json).join(', '));
          // V3 主字段是 data，兼容 audio
          const audioVal = json.data || json.audio || json.payload?.data || json.payload_msg?.data;
          if (audioVal && typeof audioVal === 'string') {
            audioChunks.push(audioVal);
          } else if (json.payload_msg) {
            console.log('TTS SSE msg:', JSON.stringify(json.payload_msg).slice(0, 200));
          }
        } catch {
          // 纯 base64 字符串
          audioChunks.push(data);
        }
      }
    }

    if (audioChunks.length === 0) {
      // 可能 API 直接返回了二进制音频（非 SSE 包装）
      console.log('TTS: 未找到 SSE data 行，尝试作为原始音频处理...');
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('audio/') || ct.includes('octet-stream')) {
        // 将原始文本转回 blob
        const rawBytes = new Uint8Array(sseText.length);
        for (let i = 0; i < sseText.length; i++) rawBytes[i] = sseText.charCodeAt(i) & 0xFF;
        const blob = new Blob([rawBytes], { type: 'audio/mp3' });
        return await blobToBase64(blob);
      }
      throw new Error('未收到音频数据，响应: ' + sseText.slice(0, 200));
    }

    const mergedBase64 = audioChunks.join('');
    const binaryStr = atob(mergedBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    return await blobToBase64(blob);

  } catch (e) {
    console.error('豆包 TTS 失败:', e);
    return null;
  }
}

// 批量生成音频（用于导入时），返回 { word: base64DataUrl }
async function generateTTSAudioBatch(words) {
  const result = {};
  for (const w of words) {
    const dataUrl = await fetchDoubaoTTSAudio(w);
    if (dataUrl) result[w] = dataUrl;
  }
  return result;
}

function speak(text, lang) {
  // 英文单词 → 优先使用本地预生成音频
  if (!lang || lang === 'en-US') {
    const bank = DB.getBank();
    const wordData = bank[text.toLowerCase()];
    if (wordData && wordData.audio) {
      playBase64Audio(wordData.audio);
      return;
    }
  }

  const provider = getTTSProvider();

  // 豆包 TTS → 实时调用 API 播放
  if (provider === 'doubao') {
    speakDoubaoTTS(text);
    return;
  }

  // Edge TTS / Web Speech → 使用浏览器语音
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-US';
  u.rate = 0.55;
  u.pitch = 1.0;

  // 优先选择美式英语语音
  if (!lang || lang === 'en-US') {
    const voices = speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha'))
      || voices.find(v => v.lang === 'en-US' && v.name.includes('Alex'))
      || voices.find(v => v.lang === 'en-US' && v.name.includes('Karen'))
      || voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira') && !v.name.includes('David'))
      || voices.find(v => v.lang.startsWith('en-US'));
    if (usVoice) u.voice = usVoice;
  }

  speechSynthesis.speak(u);
}

// 豆包 TTS 实时播放（无本地缓存时使用，播放后自动回存）
async function speakDoubaoTTS(text) {
  const dataUrl = await fetchDoubaoTTSAudio(text);
  if (dataUrl) {
    playBase64Audio(dataUrl);
    // 回存到本地题库，下次无需重新合成
    const word = text.toLowerCase();
    const bank = DB.getBank();
    if (bank[word] && !bank[word].audio) {
      DB.addWords([{ word, audio: dataUrl }]);
    }
  } else {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.55; u.pitch = 1.0;
      speechSynthesis.speak(u);
    }
  }
}
function speakChinese(text) { speak(text, 'zh-CN'); }

// ====== LLM 通用代理（优先 Tauri 后端，回退直接 fetch） ======
async function callLLM(url, apiKey, bodyObj) {
  const bodyJson = JSON.stringify(bodyObj);

  // 优先通过 Tauri 后端代理
  try {
    if (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined') {
      const { invoke } = await import('@tauri-apps/api/core');
      const respText = await invoke('fetch_llm_chat', { url, apiKey, bodyJson });
      return JSON.parse(respText);
    }
  } catch (e) {
    console.warn('Tauri LLM 代理失败，尝试直接请求:', e.message);
  }

  // 回退：通过本地 Node.js 代理（浏览器测试用）
  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: bodyObj
      })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (e) {
    throw new Error('LLM 调用失败: ' + e.message);
  }
}

// ====== 提示气泡 ======
let hintBubbleTimer = null;
function showHintBubble(word) {
  clearTimeout(hintBubbleTimer);
  const b = document.getElementById('hint-bubble');
  b.textContent = word.toLowerCase();
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
