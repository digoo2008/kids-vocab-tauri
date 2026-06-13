// ====== 题库录入页 ======
let wbCurrentFilter = 'all'; // 'all' | 'import_{date}' | 'cat_{category}'
let wbMoreCategories = []; // 收起的额外分类

function initWordBank() {
  wbCurrentFilter = 'all';
  renderWordBankPage();
}

function renderWordBankPage() {
  const bank = DB.getBank();
  const allWords = Object.keys(bank);
  const categories = DB.getCategories();

  // 按筛选过滤
  let filteredWords = allWords;
  if (wbCurrentFilter.startsWith('import_')) {
    const date = wbCurrentFilter.replace('import_', '');
    filteredWords = DB.getWordsByImportDate(date).map(w => w.word);
  } else if (wbCurrentFilter.startsWith('cat_')) {
    const cat = wbCurrentFilter.replace('cat_', '');
    filteredWords = DB.getWordsByCategory(cat).map(w => w.word);
  }

  const c = document.getElementById('wordbank-content');
  c.innerHTML = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>

    <div class="wb-panels">
      <!-- ====== 左面板：输入区 ====== -->
      <div class="wb-left-panel">
        <div class="ocr-upload-section" id="ocr-upload-section">
          <div class="ocr-upload-zone" id="ocr-upload-zone" onclick="document.getElementById('ocr-file-input').click()">
            <div class="ocr-upload-icon">📷</div>
            <div class="ocr-upload-text">上传或拖拽图片，识别英文单词</div>
            <input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp" style="display:none" onchange="onOCRFileSelect(event)" />
          </div>
          <div id="ocr-preview" style="display:none;margin-top:8px;"></div>
          <div id="ocr-result" style="margin-top:8px;"></div>
        </div>

        <textarea class="wordbank-input" id="wb-input" placeholder="输入英文单词，逗号分隔&#10;例：apple, banana, cat" oninput="onWordBankInput()"></textarea>
        <div id="wb-status" style="min-height:22px;font-size:15px;color:#a5d6a7;margin:4px 0;"></div>
        <div id="wb-preview" style="margin:6px 0;"></div>
      </div>

      <!-- ====== 右面板：词库列表 ====== -->
      <div class="wb-right-panel">
         <div class="category-tabs" id="category-tabs">
          <button class="category-tab ${wbCurrentFilter === 'all' ? 'active' : ''}" onclick="wbSetFilter('all')">全部</button>
          ${(() => {
            // 手动分类标签，取前4个显示
            const allEntries = categories.filter(c => DB.getWordsByCategory(c).length >= 2).map(c => ({
              value: 'cat_' + c,
              label: c + ' (' + DB.getWordsByCategory(c).length + ')',
              sortKey: c
            }));
            wbMoreCategories = allEntries.slice(4);
            return allEntries.slice(0, 4).map(e =>
              `<button class="category-tab ${wbCurrentFilter === e.value ? 'active' : ''}" onclick="wbSetFilter('${e.value}')">${e.label}</button>`
            ).join('');
          })()}
          ${wbMoreCategories.length > 0 ? `<button class="category-tab category-tab-more" onclick="wbShowMoreCategories()">更多分类 ▾</button>` : ''}
          <button class="category-tab category-tab-add" onclick="wbNewCategory()">+ 新建分类</button>
          <button class="category-tab category-tab-manage" onclick="wbManageCategories()" title="管理分类">⚙</button>
        </div>

        ${filteredWords.length > 0 ? `
        <div class="wb-batch-bar" id="wb-batch-bar">
          <label class="wb-batch-label"><input type="checkbox" id="wb-select-all" onchange="wbToggleSelectAll()"> 全选</label>
          <select class="settings-select" id="wb-batch-category" style="min-width:140px;font-size:15px;">
            <option value="">批量设置分类...</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button class="btn btn-green" style="height:36px;font-size:15px;padding:0 18px;" onclick="wbBatchSetCategory()">应用</button>
          <span id="wb-batch-count" style="color:#a5d6a7;font-size:14px;margin-left:8px;">已选 0 个</span>
        </div>
        ` : ''}

        <div class="wordbank-section-title">已保存题库 · ${filteredWords.length} 词${wbCurrentFilter !== 'all' ? ' / 共 ' + allWords.length + ' 词' : ''}</div>
        ${filteredWords.length === 0 ? '<div style="color:#a5d6a7;font-size:18px;padding:16px;">该分类下还没有单词哦~</div>' : `
          <table class="wordbank-table">
            <thead><tr><th style="width:36px;"></th><th>单词</th><th>音标</th><th>释义</th><th>分类</th><th>时间</th><th>听</th><th>删</th></tr></thead>
            <tbody>
              ${filteredWords.map(w => `
                <tr data-word="${w}">
                  <td><input type="checkbox" class="wb-row-check" data-word="${w}" onchange="wbUpdateBatchCount()"></td>
                  <td class="wordbank-word">${w}</td>
                  <td class="wordbank-phonetic">${bank[w].phonetic || getPhoneticFallback(w)}</td>
                  <td class="wordbank-chinese">${bank[w].chinese}</td>
                  <td class="wordbank-category">
                    <select class="wb-cat-select" data-word="${w}" onchange="wbChangeCategory(this, '${w}')">
                      <option value="">-</option>
                      ${categories.map(c => `<option value="${c}" ${bank[w].category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                  </td>
                  <td class="wordbank-date">${(bank[w].imported_at || '').slice(0, 10)}</td>
                  <td><button class="wordbank-audio-btn" onclick="speak('${w}')">🔊</button></td>
                  <td><button class="wordbank-del-btn" onclick="delWord('${w}')">✕</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
        ${filteredWords.length > 0 && wbCurrentFilter !== 'all' ? `<div style="margin-top:10px;"><button class="btn btn-white" onclick="wbSetFilter('all')">显示全部单词</button></div>` : ''}
      </div>
    </div>
  `;
  // 绑定拖拽事件
  setTimeout(() => bindOCRDragDrop(), 100);
}

function wbSetFilter(filter) {
  wbCurrentFilter = filter;
  renderWordBankPage();
}

function wbNewCategory() {
  const name = prompt('请输入新分类名称（例如：动物、水果、Unit1）：');
  if (!name || !name.trim()) return;
  DB.addCategory(name.trim());
  showToast('分类 "' + name.trim() + '" 已创建！在单词的分类列中可选择此标签。');
  renderWordBankPage();
}

function wbManageCategories() {
  const storedCats = DB.getStoredCategories();
  if (storedCats.length === 0) {
    showToast('暂无独立分类可管理');
    return;
  }

  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box manage-cat-box">
      <div style="font-size:22px;font-weight:800;color:var(--mint);margin-bottom:12px;">管理分类</div>
      <div class="manage-cat-list">
        ${storedCats.map(c => `
          <div class="manage-cat-row">
            <span class="manage-cat-name">${c}</span>
            <div class="manage-cat-actions">
              <button class="manage-cat-btn manage-cat-edit" data-cat="${c}" onclick="wbRenameCategory('${c}')">✎ 重命名</button>
              <button class="manage-cat-btn manage-cat-del" data-cat="${c}" onclick="wbDeleteCategory('${c}')">✕ 删除</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-white" style="margin-top:16px;font-size:18px;padding:10px 36px;" onclick="this.closest('.modal-overlay').remove()">关闭</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function wbRenameCategory(oldName) {
  const newName = prompt('将分类 "' + oldName + '" 重命名为：', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  DB.renameCategory(oldName, newName.trim());
  showToast('分类已重命名为 "' + newName.trim() + '"');
  renderWordBankPage();
  // 关闭管理弹窗
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

function wbShowMoreCategories() {
  const items = wbMoreCategories.map(e =>
    `<div class="more-cat-item${wbCurrentFilter === e.value ? ' active' : ''}" onclick="wbSetFilter('${e.value}');this.closest('.modal-overlay').remove()">${e.label}</div>`
  ).join('');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box more-cat-box">
      <div style="font-size:20px;font-weight:800;color:var(--mint);margin-bottom:10px;">选择分类</div>
      <div class="more-cat-list">${items}</div>
      <button class="btn btn-white" style="margin-top:14px;font-size:16px;padding:8px 30px;" onclick="this.closest('.modal-overlay').remove()">关闭</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function wbDeleteCategory(name) {
  if (!confirm('确定删除分类 "' + name + '" 吗？\n已标记该分类的单词将恢复为未分类状态。')) return;
  // 清除所有使用此分类的单词
  const bank = DB.getBank();
  let changed = false;
  for (const [word, data] of Object.entries(bank)) {
    if (data.category === name) {
      bank[word].category = '';
      changed = true;
    }
  }
  if (changed) DB.setBank(bank);
  DB.removeCategory(name);
  showToast('分类 "' + name + '" 已删除');
  renderWordBankPage();
  // 关闭管理弹窗
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

function wbChangeCategory(selectEl, word) {
  const newCat = selectEl.value;
  DB.updateCategory(word, newCat);
  showToast('已更新 ' + word + ' 的分类');
  // 如果按分类筛选且当前筛选与该词新分类不符，刷新
  if (wbCurrentFilter !== 'all') {
    setTimeout(() => renderWordBankPage(), 600);
  }
}

function wbToggleSelectAll() {
  const checked = document.getElementById('wb-select-all').checked;
  document.querySelectorAll('.wb-row-check').forEach(cb => { cb.checked = checked; });
  wbUpdateBatchCount();
}

function wbUpdateBatchCount() {
  const count = document.querySelectorAll('.wb-row-check:checked').length;
  const el = document.getElementById('wb-batch-count');
  if (el) el.textContent = '已选 ' + count + ' 个';
}

function wbBatchSetCategory() {
  const cat = document.getElementById('wb-batch-category').value;
  if (!cat) { showToast('请选择分类标签'); return; }
  const checked = document.querySelectorAll('.wb-row-check:checked');
  if (checked.length === 0) { showToast('请先勾选单词'); return; }
  checked.forEach(cb => { DB.updateCategory(cb.dataset.word, cat); });
  showToast('已为 ' + checked.length + ' 个单词设置分类：「' + cat + '」');
  renderWordBankPage();
}

// 音标回退：使用本地字典
function getPhoneticFallback(word) {
  if (typeof PHONETIC_DICT !== 'undefined' && PHONETIC_DICT[word.toLowerCase()]) {
    return PHONETIC_DICT[word.toLowerCase()];
  }
  return '/' + word + '/';
}

function onWordBankInput() {
  const val = document.getElementById('wb-input').value.trim();
  if (!val) { document.getElementById('wb-status').textContent = ''; document.getElementById('wb-preview').innerHTML = ''; return; }

  const provider = getLLMProvider();
  const providerName = AI_PROVIDERS[provider]?.name || 'AI';
  document.getElementById('wb-status').textContent = `⏳ ${providerName} 正在识别释义和音标...`;

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

  // 尝试 AI 释义（根据设置的提供商）
  let defs = null;
  try {
    defs = await callAIDefine(newWords);
  } catch(e) {
    console.log('AI API 不可用，切换到手动模式:', e.message);
  }

  if (defs && Object.keys(defs).length > 0) {
    showPreview(newWords, defs);
    const provider = getLLMProvider();
    const providerName = AI_PROVIDERS[provider]?.name || 'AI';
    document.getElementById('wb-status').textContent = `✅ ${providerName} 已识别 ${Object.keys(defs).length} 个单词`;
  } else {
    showManualMode(newWords);
    document.getElementById('wb-status').textContent = '⚠️ AI 暂不可用，请手动输入释义';
  }
}

// 通用 AI 释义调用（支持 DeepSeek / 豆包）
async function callAIDefine(words) {
  const provider = getLLMProvider();
  const providerInfo = AI_PROVIDERS[provider];
  if (!providerInfo) throw new Error('未配置 AI 提供商');

  const storageKey = 'kv-' + provider + '-key';
  const apiKey = localStorage.getItem(storageKey) || '';
  if (!apiKey) throw new Error(`未配置 ${providerInfo.name} API Key`);

  const prompt = `你是一个儿童英语学习助手。请为以下英文单词给出适合6-9岁中国小朋友理解的中文释义和IPA音标。
要求：释义简短（1-3个汉字）、准确、不要用生僻字。音标使用标准IPA格式。

英文单词：${words.join(', ')}
输出格式：JSON {"单词1":{"chinese":"释义1","phonetic":"/音标1/"},"单词2":{"chinese":"释义2","phonetic":"/音标2/"}}`;

  const data = await callLLM(providerInfo.url, apiKey, {
    model: providerInfo.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式错误');

  const rawDefs = JSON.parse(match[0]);

  // 标准化返回格式：{ word: { chinese, phonetic } }
  const result = {};
  for (const w of words) {
    const val = rawDefs[w];
    if (!val) continue;
    if (typeof val === 'string') {
      // 兼容旧格式：直接返回释义字符串
      result[w] = { chinese: val, phonetic: getPhoneticFallback(w) };
    } else if (typeof val === 'object') {
      result[w] = {
        chinese: val.chinese || val.definition || w,
        phonetic: val.phonetic || val.ipa || getPhoneticFallback(w)
      };
    }
  }
  return result;
}

function showPreview(words, defs) {
  const p = document.getElementById('wb-preview');
  const existing = [];
  for (const w of words) {
    if (defs[w]) existing.push({ word: w, chinese: defs[w].chinese, phonetic: defs[w].phonetic || '' });
  }
  if (existing.length === 0) { p.innerHTML = ''; return; }
  p.innerHTML = `
    <div style="font-weight:700;color:#5d4037;font-size:20px;margin-bottom:8px;">确认保存：</div>
    <table class="wordbank-table">
      <thead><tr><th>单词</th><th>音标</th><th>释义</th></tr></thead>
      <tbody>
        ${existing.map(e => `<tr><td class="wordbank-word">${e.word}</td><td class="wordbank-phonetic">${e.phonetic}</td><td class="wordbank-chinese">${e.chinese}</td></tr>`).join('')}
      </tbody>
    </table>
    <button class="btn btn-green" style="margin-top:8px;" onclick="savePreview(${JSON.stringify(existing).replace(/"/g,'&quot;')})">全部保存</button>
  `;
  window._wbPreviewData = existing;
}

async function savePreview(data) {
  if (!data) data = window._wbPreviewData || [];

  // 生成豆包 TTS 音频
  document.getElementById('wb-status').textContent = '🎵 正在生成单词音频...';
  const words = data.map(d => d.word);
  const audioMap = await generateTTSAudioBatch(words);
  const audioCount = Object.keys(audioMap).length;
  if (audioCount > 0) {
    data.forEach(d => { if (audioMap[d.word]) d.audio = audioMap[d.word]; });
  }

  DB.addWords(data);
  showToast(`${data.length} 个新单词已保存！${audioCount > 0 ? '（已生成 ' + audioCount + ' 个音频）' : ''}（题库共 ${DB.bankSize()} 词）`);
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
    <button class="btn btn-green" style="margin-top:8px;" onclick="saveManual()">保存</button>
  `;
}

async function saveManual() {
  const inputs = document.querySelectorAll('.manual-chinese');
  const data = [];
  for (const inp of inputs) {
    const ch = inp.value.trim();
    if (ch) data.push({ word: inp.dataset.word, chinese: ch });
  }
  if (data.length === 0) { showToast('请至少填写一个释义'); return; }

  // 生成豆包 TTS 音频
  document.getElementById('wb-status').textContent = '🎵 正在生成单词音频...';
  const words = data.map(d => d.word);
  const audioMap = await generateTTSAudioBatch(words);
  data.forEach(d => { if (audioMap[d.word]) d.audio = audioMap[d.word]; });

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

// ====== 图片OCR识别 ======
let _ocrImageData = null;

function onOCRFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  processOCRFile(file);
}

// 拖拽支持（在渲染后绑定）
function bindOCRDragDrop() {
  const zone = document.getElementById('ocr-upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processOCRFile(file);
  });
}

function processOCRFile(file) {
  if (!file.type.match(/^image\/(png|jpeg|jpg|bmp|webp)$/)) {
    showToast('请选择图片文件（png, jpg, bmp, webp）');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    _ocrImageData = e.target.result;
    // 显示缩略图预览
    const preview = document.getElementById('ocr-preview');
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;">
        <img src="${_ocrImageData}" style="max-height:160px;border-radius:16px;border:2px solid var(--mint-pale);" />
        <div>
          <div style="font-size:20px;color:var(--brown-text);margin-bottom:8px;">${file.name}</div>
          <button class="btn btn-green" style="height:48px;font-size:20px;padding:0 32px;" onclick="doOCR()">开始识别</button>
          <button class="btn btn-white" style="height:48px;font-size:20px;margin-left:8px;" onclick="cancelOCR()">取消</button>
        </div>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function cancelOCR() {
  _ocrImageData = null;
  document.getElementById('ocr-preview').style.display = 'none';
  document.getElementById('ocr-result').innerHTML = '';
}

async function doOCR() {
  if (!_ocrImageData) return;
  const resultDiv = document.getElementById('ocr-result');
  resultDiv.innerHTML = '<div style="color:#f57c00;font-size:18px;">正在识别图片中的英文单词...</div>';

  try {
    const words = await invokeOCR(_ocrImageData);
    if (!words || words.length === 0) {
      resultDiv.innerHTML = '<div style="color:#e53935;font-size:18px;">未识别到英文单词，请确认图片中包含清晰的英文文字。</div>';
      return;
    }

    // 过滤掉已存在的单词
    const bank = DB.getBank();
    const newWords = words.filter(w => !bank[w.toLowerCase()]);
    const existWords = words.filter(w => bank[w.toLowerCase()]);

    resultDiv.innerHTML = `
      <div style="font-weight:700;color:var(--mint);font-size:20px;margin-bottom:8px;">识别到 ${words.length} 个英文单词：</div>
      <div class="ocr-result-list">
        ${words.map(w => {
          const isNew = newWords.includes(w);
          return `<label class="ocr-word-item">
            <input type="checkbox" class="ocr-word-check" data-word="${w}" ${isNew ? 'checked' : ''} />
            <span class="ocr-word-text">${w}</span>
            ${isNew ? '<span class="ocr-new-badge">新</span>' : '<span style="color:#a5d6a7;font-size:14px;">已在题库</span>'}
          </label>`;
        }).join('')}
      </div>
      <div style="margin-top:12px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-green" onclick="importOCRWords()">导入选中单词 (${newWords.length} 个新词)</button>
        <button class="btn btn-white" onclick="cancelOCR()">取消</button>
      </div>
    `;
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:#e53935;font-size:18px;">识别失败：${e.message || '请确保已安装Tesseract OCR'}</div>`;
  }
}

async function invokeOCR(base64Data) {
  // 尝试Tauri后端OCR
  if (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined') {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('ocr_image', { base64Image: base64Data });
    } catch (e) {
      console.log('Tauri OCR failed, trying fallback:', e);
    }
  }
  // 回退1：尝试 Tesseract.js 浏览器端OCR
  if (typeof Tesseract !== 'undefined') {
    try {
      const result = await Tesseract.recognize(base64Data, 'eng', {
        logger: m => { if (m.status === 'recognizing text') {
          document.getElementById('ocr-result').innerHTML =
            `<div style="color:#f57c00;font-size:16px;">⏳ OCR识别中... ${Math.round(m.progress * 100)}%</div>`;
        }}
      });
      const text = result.data.text;
      const words = text.match(/[a-zA-Z]{2,}/g) || [];
      if (words.length > 0) {
        return [...new Set(words.map(w => w.toLowerCase()))].sort();
      }
    } catch (e) {
      console.log('Tesseract.js OCR failed:', e);
    }
  }
  // 回退2：尝试AI视觉API
  try {
    return await ocrViaAI(base64Data);
  } catch (e) {
    throw new Error('OCR不可用。请确保: 1) 网络通畅（首次需下载OCR数据包约10MB） 2) 图片清晰包含英文单词');
  }
}

async function ocrViaAI(base64Data) {
  const provider = getLLMProvider();
  const providerInfo = AI_PROVIDERS[provider];
  const storageKey = 'kv-' + provider + '-key';
  const apiKey = localStorage.getItem(storageKey) || '';
  if (!apiKey) throw new Error('未配置AI API Key');

  // 从base64提取纯base64数据
  const base64 = base64Data.split(',')[1] || base64Data;

  const prompt = 'Please extract all English words from this image. Return ONLY a JSON array of lowercase words, e.g. ["apple","banana","cat"]. No other text.';

  const data = await callLLM(providerInfo.url, apiKey, {
    model: providerInfo.model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: base64Data } }
      ]
    }],
    temperature: 0.1
  });
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI返回格式错误');
  const words = JSON.parse(match[0]);
  return words.filter(w => typeof w === 'string' && w.length >= 2);
}

async function importOCRWords() {
  const checks = document.querySelectorAll('.ocr-word-check:checked');
  if (checks.length === 0) { showToast('请至少选择一个单词'); return; }

  const newWords = [];
  const bank = DB.getBank();
  for (const cb of checks) {
    const w = cb.dataset.word.toLowerCase();
    if (!bank[w]) newWords.push(w);
  }

  if (newWords.length === 0) { showToast('选中的单词都已在题库中'); return; }

  // 用AI获取释义
  let defs = null;
  document.getElementById('ocr-result').innerHTML += '<div style="color:#f57c00;margin-top:8px;">正在获取释义...</div>';
  try {
    defs = await callAIDefine(newWords);
  } catch (e) { console.log('AI释义失败'); }

  const todayDate = new Date().toISOString().slice(0, 7); // YYYY-MM
  const wordsToAdd = newWords.map(w => ({
    word: w,
    chinese: (defs && defs[w]) ? (defs[w].chinese || '') : '',
    phonetic: (defs && defs[w]) ? (defs[w].phonetic || '') : '',
    category: todayDate
  }));

  // 生成豆包 TTS 音频
  document.getElementById('ocr-result').innerHTML += '<div style="color:#f57c00;margin-top:8px;">🎵 正在生成单词音频...</div>';
  const audioMap = await generateTTSAudioBatch(newWords);
  wordsToAdd.forEach(d => { if (audioMap[d.word]) d.audio = audioMap[d.word]; });

  DB.addWords(wordsToAdd);
  showToast(`${newWords.length} 个新单词已导入题库！（题库共 ${DB.bankSize()} 词）`);
  cancelOCR();
  renderWordBankPage();
}
