// ====== 设置页 — 多 AI 提供商配置 ======

// AI 提供商配置信息
const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    consoleLabel: 'platform.deepseek.com',
    desc: '性价比最高，释义+音标一次获取'
  },
  doubao: {
    name: '豆包大模型',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-lite-32k',
    consoleUrl: 'https://console.volcengine.com/ark',
    consoleLabel: 'console.volcengine.com/ark',
    desc: '字节跳动旗下大模型'
  }
};

const TTS_PROVIDERS = {
  webspeech: { name: 'Web Speech API', desc: '浏览器内置，免费，无需配置' },
  edgetts: { name: 'Edge TTS', desc: '微软 Edge 语音，高质量发音（需 Tauri 环境）' },
  doubao: { name: '豆包 TTS', desc: '火山引擎语音合成（需豆包 API Key）' }
};

function initSettings() {
  renderSettingsPage();
}

function getLLMProvider() {
  return localStorage.getItem('kv-llm-provider') || 'deepseek';
}
function getTTSProvider() {
  return localStorage.getItem('kv-tts-provider') || 'webspeech';
}

let settingsActiveTab = 'ai'; // 'ai' | 'tts' | 'quiz' | 'help'

function switchSettingsTab(tab) {
  settingsActiveTab = tab;
  renderSettingsPage();
}

function renderSettingsPage() {
  const llmProvider = getLLMProvider();
  const ttsProvider = getTTSProvider();
  const deepseekKey = localStorage.getItem('kv-deepseek-key') || '';
  const doubaoKey = localStorage.getItem('kv-doubao-key') || '';
  const doubaoTTSKey = localStorage.getItem('kv-doubao-tts-key') || '';
  const quizMode = getQuizMode();

  const tabs = [
    { id: 'ai', label: 'AI 模型' },
    { id: 'tts', label: '语音 TTS' },
    { id: 'quiz', label: '测验 & 分类' },
    { id: 'help', label: '使用说明' }
  ];

  let html = `
    <div class="card-garland">
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span><span class="garland-flower"></span>
      <span class="garland-flower"></span>
    </div>
    <div class="settings-tabs">
      ${tabs.map(t => `<span class="settings-tab${settingsActiveTab === t.id ? ' active' : ''}" onclick="switchSettingsTab('${t.id}')">${t.label}</span>`).join('')}
    </div>
  `;

  // ====== Tab: AI 模型 ======
  if (settingsActiveTab === 'ai') {
    html += `
      <div class="settings-section">
        <div class="settings-section-title">释义 & 音标 — AI 模型配置</div>
        <div class="settings-label">
          用于题库录入时自动获取英文单词的<strong>中文释义</strong>和<strong>IPA 音标</strong>。
        </div>
        <div class="settings-row" style="margin-top:10px;">
          <label class="settings-field-label">选择 AI 提供商：</label>
          <select class="settings-select" id="llm-provider-select" onchange="onLLMProviderChange()">
            <option value="deepseek" ${llmProvider === 'deepseek' ? 'selected' : ''}>DeepSeek（推荐，最便宜）</option>
            <option value="doubao" ${llmProvider === 'doubao' ? 'selected' : ''}>豆包大模型（字节跳动）</option>
          </select>
        </div>
        <div id="deepseek-key-section" class="settings-key-section" style="${llmProvider === 'deepseek' ? '' : 'display:none'}">
          <div class="settings-row">
            <label class="settings-field-label">DeepSeek API Key：</label>
            <span style="color:#1565c0;cursor:pointer;text-decoration:underline;font-size:15px;" onclick="window.open('${AI_PROVIDERS.deepseek.consoleUrl}','_blank')">获取 Key</span>
          </div>
          <div class="settings-input-row" style="margin-top:6px;">
            <input class="settings-input" id="input-deepseek-key" type="password" placeholder="sk-..." value="${deepseekKey}" />
            <button class="btn btn-green" onclick="saveLLMKey('deepseek')">保存</button>
          </div>
          ${deepseekKey ? `<div class="settings-status success" style="margin-top:6px;">已配置：<span class="settings-key-masked">${maskKey(deepseekKey)}</span></div>` : `<div class="settings-status idle" style="margin-top:6px;">未配置</div>`}
        </div>
        <div id="doubao-key-section" class="settings-key-section" style="${llmProvider === 'doubao' ? '' : 'display:none'}">
          <div class="settings-row">
            <label class="settings-field-label">豆包 API Key：</label>
            <span style="color:#1565c0;cursor:pointer;text-decoration:underline;font-size:15px;" onclick="window.open('${AI_PROVIDERS.doubao.consoleUrl}','_blank')">获取 Key</span>
          </div>
          <div class="settings-input-row" style="margin-top:6px;">
            <input class="settings-input" id="input-doubao-key" type="password" placeholder="请粘贴豆包 API Key..." value="${doubaoKey}" />
            <button class="btn btn-green" onclick="saveLLMKey('doubao')">保存</button>
          </div>
          ${doubaoKey ? `<div class="settings-status success" style="margin-top:6px;">已配置：<span class="settings-key-masked">${maskKey(doubaoKey)}</span></div>` : `<div class="settings-status idle" style="margin-top:6px;">未配置</div>`}
        </div>
        <div style="margin-top:10px; display:flex; gap:12px; align-items:center;">
          <button class="btn btn-teal" id="llm-test-btn" onclick="testLLMConnection()">测试连通性</button>
        </div>
        <div id="llm-test-result" style="margin-top:10px; min-height:22px;"></div>
      </div>
    `;
  }

  // ====== Tab: 语音 TTS ======
  if (settingsActiveTab === 'tts') {
    html += `
      <div class="settings-section">
        <div class="settings-section-title">音频朗读 — TTS 配置</div>
        <div class="settings-label">
          用于单词发音朗读。<strong>Web Speech API</strong> 为默认方案，免费无需配置。
        </div>
        <div class="settings-row" style="margin-top:10px;">
          <label class="settings-field-label">选择 TTS 方案：</label>
          <select class="settings-select" id="tts-provider-select" onchange="onTTSProviderChange()">
            <option value="webspeech" ${ttsProvider === 'webspeech' ? 'selected' : ''}>Web Speech API（默认，免费）</option>
            <option value="edgetts" ${ttsProvider === 'edgetts' ? 'selected' : ''}>Edge TTS（高质量，需 Tauri）</option>
            <option value="doubao" ${ttsProvider === 'doubao' ? 'selected' : ''}>豆包 TTS（火山引擎语音合成）</option>
          </select>
        </div>
        <div id="doubao-tts-key-section" style="${ttsProvider === 'doubao' ? '' : 'display:none'} margin-top:12px;">
          <div class="settings-row">
            <label class="settings-field-label">豆包 TTS API Key：</label>
            <span style="color:#1565c0;cursor:pointer;text-decoration:underline;font-size:15px;" onclick="window.open('https://console.volcengine.com/speech/service/8','_blank')">获取 Key</span>
          </div>
          <div class="settings-input-row" style="margin-top:6px;">
            <input class="settings-input" id="input-doubao-tts-key" type="password" placeholder="请粘贴豆包 TTS API Key..." value="${doubaoTTSKey}" />
            <button class="btn btn-green" onclick="saveTTSKey()">保存</button>
          </div>
          ${doubaoTTSKey ? `<div class="settings-status success" style="margin-top:6px;">已配置：<span class="settings-key-masked">${maskKey(doubaoTTSKey)}</span></div>` : `<div class="settings-status idle" style="margin-top:6px;">未配置</div>`}
        </div>
        <div id="tts-info-section" style="margin-top:10px;">
          ${renderTTSInfo(ttsProvider)}
        </div>
        <div style="margin-top:12px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input id="tts-test-word" value="apple" style="font-size:20px;padding:8px 16px;border:2px solid var(--mint-pale);border-radius:14px;width:140px;text-align:center;" placeholder="测试单词" />
          <button class="btn btn-teal" id="tts-test-btn" onclick="testTTSAudio()">🎵 测试发音</button>
        </div>
        <div id="tts-test-result" style="margin-top:8px; min-height:22px;"></div>
      </div>
    `;
  }

  // ====== Tab: 测验 & 分类 ======
  if (settingsActiveTab === 'quiz') {
    html += `
      <div class="settings-section">
        <div class="settings-section-title">测验默认设置</div>
        <div class="settings-row" style="margin-top:10px;">
          <label class="settings-field-label">默认测验模式：</label>
          <select class="settings-select" id="quiz-mode-select" onchange="onQuizModeChange()">
            <option value="fillblank" ${quizMode === 'fillblank' ? 'selected' : ''}>填空模式 — 点击字母填入空白处</option>
            <option value="dictation" ${quizMode === 'dictation' ? 'selected' : ''}>听写模式 — 听语音拼写完整单词</option>
          </select>
        </div>
        <div style="font-size:16px;color:#a5d6a7;margin-top:8px;">
          开始背单词时可随时切换模式，此设置为默认选项。
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">分类标签管理</div>
        <div class="settings-label">
          手动分类标签用于在题库中对单词进行分组，背单词时可以按分类筛选。
        </div>
        <div id="settings-category-list" style="margin-top:12px;">
          ${renderCategoryManager()}
        </div>
      </div>
    `;
  }

  // ====== Tab: 使用说明 ======
  if (settingsActiveTab === 'help') {
    html += `
      <div class="settings-section">
        <div class="settings-section-title">使用说明</div>
        <div style="font-size:16px; color:#8d6e63; line-height:1.65;">
          1. 选择 AI 提供商（推荐 DeepSeek），前往对应平台获取 API Key<br>
          2. 粘贴 Key 后点击"保存"，再点击"测试连通性"验证<br>
          3. 配置成功后，<strong>题库录入页</strong>输入单词时自动获取释义和音标<br>
          4. TTS 朗读默认使用浏览器 Web Speech API，无需额外配置<br>
          5. 可在<strong>题库录入页</strong>上传图片，自动识别英文单词并入库<br>
          6. <strong>听写模式</strong>下语音播报单词后，根据音标提示拼写出完整单词<br>
          <span style="color:#e65100;">注：所有 API Key 仅保存在本机，不会上传到任何服务器</span>
        </div>
      </div>
    `;
  }

  const c = document.getElementById('settings-content');
  c.innerHTML = html;
}

function onQuizModeChange() {
  const mode = document.getElementById('quiz-mode-select').value;
  localStorage.setItem('kv-quiz-mode', mode);
  showToast('默认测验模式已更新');
}

function renderCategoryManager() {
  const categories = DB.getCategories();
  if (categories.length === 0) {
    return '<div style="color:#a5d6a7;font-size:16px;">暂无手动分类标签。在题库页中为单词设置分类后，标签会出现在这里。</div>';
  }
  return categories.map(c => {
    const count = DB.getWordsByCategory(c).length;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border-radius:14px;margin:6px 0;border:1px solid var(--mint-pale);">
        <span style="font-size:18px;font-weight:700;color:#5d4037;min-width:100px;">${c}</span>
        <span style="font-size:15px;color:#a5d6a7;">${count} 个单词</span>
        <div style="flex:1;"></div>
        <button class="btn btn-white" style="height:38px;font-size:15px;padding:0 18px;" onclick="renameCategory('${c}')">重命名</button>
        <button class="btn btn-white" style="height:38px;font-size:15px;padding:0 18px;color:#e53935;" onclick="deleteCategory('${c}')">删除标签</button>
      </div>
    `;
  }).join('');
}

function renameCategory(oldName) {
  const newName = prompt('重命名分类 "' + oldName + '" 为：', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  const name = newName.trim();
  // 更新所有该分类的单词
  const words = DB.getWordsByCategory(oldName);
  words.forEach(w => { DB.updateCategory(w.word, name); });
  showToast('分类已重命名为「' + name + '」（' + words.length + ' 个单词已更新）');
  renderSettingsPage();
}

function deleteCategory(cat) {
  showModal('删除分类标签 <strong>' + cat + '</strong> 只会移除标签，不会删除单词。<br/>确定要删除吗？', () => {
    const words = DB.getWordsByCategory(cat);
    words.forEach(w => { DB.updateCategory(w.word, ''); });
    showToast('已删除分类标签「' + cat + '」（' + words.length + ' 个单词已取消分类）');
    renderSettingsPage();
  }, '确认删除');
}

function renderTTSInfo(provider) {
  const info = TTS_PROVIDERS[provider];
  if (provider === 'webspeech') {
    return `<div class="settings-status success">当前使用：${info.name} — ${info.desc}</div>`;
  }
  if (provider === 'edgetts') {
    return `<div class="settings-status idle">Edge TTS 需要在 Tauri 打包环境下使用，开发模式下将自动回退到 Web Speech API</div>`;
  }
  if (provider === 'doubao') {
    const doubaoTTSKey = localStorage.getItem('kv-doubao-tts-key') || '';
    return doubaoTTSKey
      ? `<div class="settings-status success">豆包 TTS 已就绪（已配置 API Key）</div>`
      : `<div class="settings-status idle">请在上方填入豆包 TTS API Key</div>`;
  }
  return '';
}

function onLLMProviderChange() {
  const provider = document.getElementById('llm-provider-select').value;
  localStorage.setItem('kv-llm-provider', provider);
  // 切换显示对应 Key 输入区
  document.getElementById('deepseek-key-section').style.display = provider === 'deepseek' ? '' : 'none';
  document.getElementById('doubao-key-section').style.display = provider === 'doubao' ? '' : 'none';
  // 清除测试结果
  document.getElementById('llm-test-result').innerHTML = '';
}

function onTTSProviderChange() {
  const provider = document.getElementById('tts-provider-select').value;
  localStorage.setItem('kv-tts-provider', provider);
  // 切换显示豆包 TTS Key 输入区
  const ttsKeySection = document.getElementById('doubao-tts-key-section');
  if (ttsKeySection) ttsKeySection.style.display = provider === 'doubao' ? '' : 'none';
  document.getElementById('tts-info-section').innerHTML = renderTTSInfo(provider);
}

function saveTTSKey() {
  const input = document.getElementById('input-doubao-tts-key');
  const key = input.value.trim();
  if (!key) { showToast('请输入豆包 TTS API Key'); return; }
  localStorage.setItem('kv-doubao-tts-key', key);
  showToast('豆包 TTS API Key 已保存！');
  renderSettingsPage();
}

function saveLLMKey(provider) {
  const inputId = 'input-' + provider + '-key';
  const input = document.getElementById(inputId);
  const key = input.value.trim();
  if (!key) { showToast('请输入 API Key'); return; }

  const storageKey = 'kv-' + provider + '-key';
  localStorage.setItem(storageKey, key);
  showToast(`${AI_PROVIDERS[provider].name} API Key 已保存！`);
  renderSettingsPage();
}

async function testLLMConnection() {
  const provider = getLLMProvider();
  const providerInfo = AI_PROVIDERS[provider];
  const storageKey = 'kv-' + provider + '-key';
  const apiKey = localStorage.getItem(storageKey) || '';

  if (!apiKey) {
    showToast(`请先保存 ${providerInfo.name} 的 API Key`);
    return;
  }

  const resultDiv = document.getElementById('llm-test-result');
  const testBtn = document.getElementById('llm-test-btn');

  testBtn.disabled = true;
  resultDiv.className = 'settings-status testing';
  resultDiv.textContent = `正在连接 ${providerInfo.name} API...`;

  try {
    const prompt = `你是一个儿童英语学习助手。请为单词 apple 给出适合6-9岁小朋友的中文释义和IPA音标。输出JSON：{"apple":{"chinese":"释义","phonetic":"/ˈæp.əl/"}}`;

    const data = await callLLM(providerInfo.url, apiKey, {
      model: providerInfo.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 返回格式异常');

    const defs = JSON.parse(match[0]);
    const appleData = defs['apple'] || {};
    const chinese = typeof appleData === 'string' ? appleData : (appleData.chinese || '苹果');
    const phonetic = typeof appleData === 'object' ? (appleData.phonetic || '') : '';

    resultDiv.className = 'settings-status success';
    resultDiv.innerHTML = `
      连通成功！
      <strong style="color:#43a047;margin-left:6px;">apple = ${chinese}</strong>
      ${phonetic ? `<span style="color:#888;font-style:italic;margin-left:8px;">${phonetic}</span>` : ''}
    `;
    showToast(`${providerInfo.name} 连通测试成功！`);

  } catch (e) {
    resultDiv.className = 'settings-status error';
    resultDiv.innerHTML = `连接失败：${e.message}`;
    showToast(`${providerInfo.name} 连通测试失败`);
  } finally {
    testBtn.disabled = false;
  }
}

async function testTTSAudio() {
  const word = document.getElementById('tts-test-word').value.trim();
  if (!word) { showToast('请输入测试单词'); return; }

  const provider = getTTSProvider();
  const resultDiv = document.getElementById('tts-test-result');
  const testBtn = document.getElementById('tts-test-btn');

  testBtn.disabled = true;
  resultDiv.className = 'settings-status testing';
  resultDiv.textContent = '正在调用豆包 TTS 合成「' + word + '」...';

  try {
    const dataUrl = await fetchDoubaoTTSAudio(word);
    if (!dataUrl) throw new Error('TTS API 返回为空，请检查 Key 是否有效');

    resultDiv.className = 'settings-status success';
    resultDiv.innerHTML = `✅ 合成成功！正在播放 <strong>${word}</strong> ...`;
    playBase64Audio(dataUrl);
    showToast('正在播放「' + word + '」的豆包发音');
  } catch (e) {
    resultDiv.className = 'settings-status error';
    resultDiv.innerHTML = `合成失败：${e.message}`;
  } finally {
    testBtn.disabled = false;
  }
}

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 6) + '****' + key.slice(-4);
}
