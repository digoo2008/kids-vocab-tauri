// ====== 题库录入页 ======
function initWordBank() {
  renderWordBankPage();
}

function renderWordBankPage() {
  const bank = DB.getBank();
  const words = Object.keys(bank);
  const c = document.getElementById('wordbank-content');
  c.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>
    <div class="title-area">
      <span class="app-icon">✏️</span><span class="title">题库录入</span>
    </div>
    <textarea class="wordbank-input" id="wb-input" placeholder="输入英文单词，用逗号分隔&#10;例如：apple, banana, cat, dog" oninput="onWordBankInput()"></textarea>
    <div id="wb-status" style="min-height:28px;font-size:18px;color:#a5d6a7;margin:8px 0;"></div>
    <div id="wb-preview" style="margin:12px 0;"></div>

    <div style="font-weight:700;color:var(--mint);font-size:22px;margin:16px 0 8px;">━━ 已保存题库（${words.length} 个词）━━</div>
    ${words.length === 0 ? '<div style="color:#a5d6a7;font-size:20px;padding:20px;">还没有单词哦，在上面输入第一个单词吧~</div>' : `
      <table class="wordbank-table">
        <thead><tr><th>单词</th><th>释义</th><th>试听</th><th>删除</th></tr></thead>
        <tbody>
          ${words.map(w => `
            <tr>
              <td class="wordbank-word">${w}</td>
              <td class="wordbank-chinese">${bank[w].chinese}</td>
              <td><button class="wordbank-audio-btn" onclick="speak('${w}')">🔊</button></td>
              <td><button class="wordbank-del-btn" onclick="delWord('${w}')">🗑️</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  `;
}

function onWordBankInput() {
  const val = document.getElementById('wb-input').value.trim();
  if (!val) { document.getElementById('wb-status').textContent = ''; document.getElementById('wb-preview').innerHTML = ''; return; }
  document.getElementById('wb-status').textContent = '⏳ AI 正在识别释义...';

  // 防抖
  clearTimeout(window._wbDebounce);
  window._wbDebounce = setTimeout(() => autoDefine(val), 600);
}

async function autoDefine(input) {
  const raw = input.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
  if (raw.length === 0) return;

  const bank = DB.getBank();
  const newWords = raw.filter(w => !bank[w]);

  if (newWords.length === 0) {
    document.getElementById('wb-status').textContent = '✅ 这些单词都在题库里了~';
    document.getElementById('wb-preview').innerHTML = '';
    return;
  }

  // 尝试豆包 AI 释义
  let defs = null;
  try {
    defs = await callDoubaoDefine(newWords);
  } catch(e) {
    console.log('豆包 API 不可用，切换到手动模式:', e.message);
  }

  if (defs && Object.keys(defs).length > 0) {
    showPreview(newWords, defs);
    document.getElementById('wb-status').textContent = `✅ AI 已识别 ${Object.keys(defs).length} 个单词释义`;
  } else {
    showManualMode(newWords);
    document.getElementById('wb-status').textContent = '⚠️ AI 暂不可用，请手动输入释义';
  }
}

async function callDoubaoDefine(words) {
  // 豆包大模型 API 调用 —— 需要配置 API Key
  const apiKey = localStorage.getItem('kv-doubao-key') || '';
  if (!apiKey) throw new Error('未配置豆包 API Key');

  const prompt = `你是一个儿童英语学习助手。请为以下英文单词给出适合6-9岁中国小朋友理解的中文释义。\n要求：简短（1-3个汉字）、准确、不要用生僻字。\n\n英文单词：${words.join(', ')}\n输出格式：JSON {"单词1": "释义1", "单词2": "释义2", ...}`;

  const resp = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'doubao-lite-32k',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  // 提取 JSON
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式错误');
  return JSON.parse(match[0]);
}

function showPreview(words, defs) {
  const p = document.getElementById('wb-preview');
  const existing = [];
  const bank = DB.getBank();
  for (const w of words) {
    if (defs[w]) existing.push({ word: w, chinese: defs[w] });
  }
  if (existing.length === 0) { p.innerHTML = ''; return; }
  p.innerHTML = `
    <div style="font-weight:700;color:#5d4037;font-size:20px;margin-bottom:8px;">确认保存：</div>
    <table class="wordbank-table"><tbody>
      ${existing.map(e => `<tr><td class="wordbank-word">${e.word}</td><td class="wordbank-chinese">${e.chinese}</td></tr>`).join('')}
    </tbody></table>
    <button class="btn btn-green" style="margin-top:8px;" onclick="savePreview(${JSON.stringify(existing).replace(/"/g,'&quot;')})">💾 全部保存</button>
  `;
  window._wbPreviewData = existing;
}

function savePreview(data) {
  if (!data) data = window._wbPreviewData || [];
  DB.addWords(data);
  showToast(`${data.length} 个新单词已保存！（题库共 ${DB.bankSize()} 词）`);
  renderWordBankPage();
}

function showManualMode(words) {
  const p = document.getElementById('wb-preview');
  p.innerHTML = `
    <div style="font-weight:700;color:#e65100;font-size:20px;margin-bottom:8px;">请手动输入中文释义：</div>
    ${words.map(w => `
      <div style="display:flex;align-items:center;gap:12px;margin:8px 0;justify-content:center;">
        <span style="font-size:28px;font-weight:800;min-width:120px;">${w}</span>
        <span>→</span>
        <input class="manual-chinese" data-word="${w}" style="font-size:22px;padding:8px 16px;border:2px solid var(--mint-pale);border-radius:14px;width:160px;" placeholder="中文释义">
      </div>
    `).join('')}
    <button class="btn btn-green" style="margin-top:8px;" onclick="saveManual()">💾 保存</button>
  `;
}

function saveManual() {
  const inputs = document.querySelectorAll('.manual-chinese');
  const data = [];
  for (const inp of inputs) {
    const ch = inp.value.trim();
    if (ch) data.push({ word: inp.dataset.word, chinese: ch });
  }
  if (data.length === 0) { showToast('请至少填写一个释义'); return; }
  DB.addWords(data);
  showToast(`${data.length} 个新单词已保存！（题库共 ${DB.bankSize()} 词）`);
  renderWordBankPage();
}

function delWord(word) {
  showModal(`确定删除 <strong>${word}</strong> 吗？<br/>错词本中该词也将同步移除。`, () => {
    DB.removeWord(word);
    DB.removeWrong(word);
    showToast(`已删除 ${word}`);
    renderWordBankPage();
  }, '确认删除');
}
