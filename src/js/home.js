// ====== 首页 Hub ======
function initHome() {
  const bank = DB.getBank();
  const wrong = DB.getWrong();
  const today = DB.getToday();

  document.getElementById('stat-total').textContent = Object.keys(bank).length;
  document.getElementById('stat-today').textContent = today.done;
  document.getElementById('stat-wrong').textContent = Object.keys(wrong).length;
  document.getElementById('hub-wrong-count').textContent = Object.keys(wrong).length + ' 个';
}



// 获取默认测验模式
function getQuizMode() {
  return localStorage.getItem('kv-quiz-mode') || 'fillblank';
}

function startStudy() {
  const bank = DB.getBank();
  const words = Object.keys(bank);
  if (words.length === 0) {
    showModal('Mmmm，单词不够哦，<br/>让爸爸妈妈先帮你录入单词吧~', () => { location.hash = '#wordbank'; });
    return;
  }

  const selectedCat = App.homeCategory || 'all';

  // 选择了具体分类 → 直接开始（用默认测验模式）
  if (selectedCat !== 'all') {
    startStudyDirect(selectedCat);
    return;
  }

  // 全部单词 → 弹出选择面板
  showStudyOptions();
}

// 分类+模式选择面板
function showStudyOptions() {
  const bank = DB.getBank();
  const categories = DB.getCategories();
  const wrongCount = Object.keys(DB.getWrong()).length;
  const defaultMode = getQuizMode();

  // 取最新 3 条分类（按创建顺序，从存储列表末尾取）
  const storedCats = DB.getStoredCategories();
  const latestCategories = storedCats.slice(-3).filter(c => DB.getWordsByCategory(c).length >= 2);
  // 如果存储的分类不够 3 条，再从词库中补充
  if (latestCategories.length < 3) {
    for (const c of categories) {
      if (!latestCategories.includes(c) && DB.getWordsByCategory(c).length >= 2) {
        latestCategories.push(c);
        if (latestCategories.length >= 3) break;
      }
    }
  }

  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.id = 'study-options-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:520px;padding:32px 36px;">
      <div style="font-size:28px;font-weight:800;color:var(--mint);margin-bottom:4px;">选择背单词范围</div>
      <div style="font-size:17px;color:#a5d6a7;margin-bottom:16px;">题库共 ${Object.keys(bank).length} 个单词</div>

      <div style="text-align:left;max-height:300px;overflow-y:auto;">
        <!-- 全部单词随机 -->
        <label class="study-option">
          <input type="radio" name="study-source" value="all" checked />
          <span class="study-option-content">
            <span class="study-option-title">全部单词随机</span>
            <span class="study-option-count">${Object.keys(bank).length} 词</span>
          </span>
        </label>

        <!-- 最新分类标签（最多 3 条） -->
        ${latestCategories.map(c => `
          <label class="study-option">
            <input type="radio" name="study-source" value="cat_${c}" />
            <span class="study-option-content">
              <span class="study-option-title">${c}</span>
              <span class="study-option-count">${DB.getWordsByCategory(c).length} 词</span>
            </span>
          </label>
        `).join('')}

        <!-- 错词本复习 -->
        ${wrongCount >= 2 ? `
          <label class="study-option">
            <input type="radio" name="study-source" value="wrongbook" />
            <span class="study-option-content">
              <span class="study-option-title">错词本复习</span>
              <span class="study-option-count">${wrongCount} 词</span>
            </span>
          </label>
        ` : ''}
      </div>

      <!-- 测验模式选择 -->
      <div style="margin-top:16px;padding-top:12px;border-top:2px solid var(--mint-pale);text-align:left;">
        <div style="font-weight:700;color:#5d4037;font-size:17px;margin-bottom:8px;">测验模式：</div>
        <div style="display:flex;gap:16px;">
          <label class="study-option" style="flex:1;">
            <input type="radio" name="quiz-mode" value="fillblank" ${defaultMode === 'fillblank' ? 'checked' : ''} />
            <span class="study-option-content">
              <span class="study-option-title">填空模式</span>
              <span class="study-option-count">点击字母填空</span>
            </span>
          </label>
          <label class="study-option" style="flex:1;">
            <input type="radio" name="quiz-mode" value="dictation" ${defaultMode === 'dictation' ? 'checked' : ''} />
            <span class="study-option-content">
              <span class="study-option-title">听写模式</span>
              <span class="study-option-count">听音拼写单词</span>
            </span>
          </label>
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:16px;margin-top:20px;">
        <button class="btn btn-white" onclick="document.getElementById('study-options-overlay').remove()">取消</button>
        <button class="btn btn-green" onclick="confirmStudyOptions()">开始背单词</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function confirmStudyOptions() {
  const sourceRadio = document.querySelector('input[name="study-source"]:checked');
  const modeRadio = document.querySelector('input[name="quiz-mode"]:checked');
  if (!sourceRadio || !modeRadio) return;

  const source = sourceRadio.value;
  const mode = modeRadio.value || 'fillblank';
  App.quizMode = mode;
  localStorage.setItem('kv-quiz-mode', mode);

  const bank = DB.getBank();
  let selectedWords = [];

  if (source === 'all') {
    selectedWords = Object.keys(bank);
  } else if (source === 'wrongbook') {
    selectedWords = Object.keys(DB.getWrong());
  } else if (source.startsWith('import_')) {
    const date = source.replace('import_', '');
    selectedWords = DB.getWordsByImportDate(date).map(w => w.word);
  } else if (source.startsWith('cat_')) {
    const cat = source.replace('cat_', '');
    selectedWords = DB.getWordsByCategory(cat).map(w => w.word);
  }

  if (selectedWords.length === 0) {
    showToast('该分类下没有单词');
    return;
  }

  // 随机打乱，最多取10题
  for (let i = selectedWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedWords[i], selectedWords[j]] = [selectedWords[j], selectedWords[i]];
  }
  const final = selectedWords.slice(0, Math.min(10, selectedWords.length));

  App.quizWords = final.map(w => ({
    word: w,
    chinese: bank[w].chinese,
    audio: bank[w].audio || ''
  }));
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = source === 'wrongbook' ? 'wrongbook' : 'bank';

  document.getElementById('study-options-overlay')?.remove();
  location.hash = '#quiz';
}

// 直接从分类开始测验（跳过弹窗）
function startStudyDirect(cat) {
  const bank = DB.getBank();
  let selectedWords = [];

  if (cat === 'wrongbook') {
    selectedWords = Object.keys(DB.getWrong());
  } else if (cat.startsWith('import_')) {
    const date = cat.replace('import_', '');
    selectedWords = DB.getWordsByImportDate(date).map(w => w.word);
  } else if (cat.startsWith('cat_')) {
    const category = cat.replace('cat_', '');
    selectedWords = DB.getWordsByCategory(category).map(w => w.word);
  }

  if (selectedWords.length === 0) {
    showToast('该分类下没有单词');
    return;
  }

  const mode = getQuizMode();
  App.quizMode = mode;

  // 随机打乱，最多取10题
  for (let i = selectedWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedWords[i], selectedWords[j]] = [selectedWords[j], selectedWords[i]];
  }
  const final = selectedWords.slice(0, Math.min(10, selectedWords.length));

  App.quizWords = final.map(w => ({
    word: w,
    chinese: bank[w].chinese,
    audio: bank[w].audio || ''
  }));
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = cat === 'wrongbook' ? 'wrongbook' : 'bank';

  location.hash = '#quiz';
}

function confirmQuit() {
  showModal('确定要退出测验吗？<br/>本轮进度不会保存哦~', () => {
    clearInterval(qTimerInterval);
    location.hash = '#home';
  });
}
