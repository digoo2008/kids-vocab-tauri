// ====== 快乐背单词 SPA 路由器 + 状态管理 ======

const Tauri = {
  async invoke(cmd, args = {}) {
    if (window.__TAURI__) {
      return await window.__TAURI__.invoke(cmd, args);
    }
    // 浏览器开发模式：用 localStorage 模拟
    return this._mock(cmd, args);
  },

  async _mock(cmd, args) {
    await new Promise(r => setTimeout(r, 50));
    switch (cmd) {
      case 'get_words': return mockGetWords(args.grade, args.count);
      case 'get_home_stats': return {
        today_completed: 0, today_target: 10,
        checkin_days: JSON.parse(localStorage.getItem('kv-history')||'[]').length,
        wrong_count: Object.keys(JSON.parse(localStorage.getItem('kv-wrong')||'{}')).length
      };
      case 'submit_quiz': return mockSaveQuiz(args.submission);
      case 'get_history': return JSON.parse(localStorage.getItem('kv-history')||'[]');
      case 'get_wrong_list': {
        const w = JSON.parse(localStorage.getItem('kv-wrong')||'{}');
        return Object.entries(w).map(([word, d]) => ({ word, chinese: d.c, count: d.n, last_wrong: d.d }));
      }
      case 'get_wrong_words_review': return [];
      default: return null;
    }
  }
};

// Mock 单词数据（与 db.rs 种子数据一致）
const MOCK_WORDS = [
  {id:1,word:'cat',chinese:'猫',grade:'grade1',difficulty:1},
  {id:2,word:'dog',chinese:'狗',grade:'grade1',difficulty:1},
  {id:3,word:'sun',chinese:'太阳',grade:'grade1',difficulty:1},
  {id:4,word:'book',chinese:'书',grade:'grade1',difficulty:1},
  {id:5,word:'fish',chinese:'鱼',grade:'grade1',difficulty:1},
  {id:6,word:'bird',chinese:'鸟',grade:'grade1',difficulty:1},
  {id:7,word:'cake',chinese:'蛋糕',grade:'grade1',difficulty:1},
  {id:8,word:'milk',chinese:'牛奶',grade:'grade1',difficulty:1},
  {id:9,word:'star',chinese:'星星',grade:'grade1',difficulty:1},
  {id:10,word:'tree',chinese:'树',grade:'grade1',difficulty:1},
  {id:11,word:'apple',chinese:'苹果',grade:'grade2',difficulty:2},
  {id:12,word:'tiger',chinese:'老虎',grade:'grade2',difficulty:2},
  {id:13,word:'panda',chinese:'熊猫',grade:'grade2',difficulty:2},
  {id:14,word:'house',chinese:'房子',grade:'grade2',difficulty:2},
  {id:15,word:'water',chinese:'水',grade:'grade2',difficulty:2},
  {id:16,word:'happy',chinese:'开心的',grade:'grade2',difficulty:2},
  {id:17,word:'grape',chinese:'葡萄',grade:'grade2',difficulty:2},
  {id:18,word:'zebra',chinese:'斑马',grade:'grade2',difficulty:2},
  {id:19,word:'queen',chinese:'女王',grade:'grade2',difficulty:2},
  {id:20,word:'robot',chinese:'机器人',grade:'grade2',difficulty:2},
  {id:21,word:'banana',chinese:'香蕉',grade:'grade3',difficulty:3},
  {id:22,word:'school',chinese:'学校',grade:'grade3',difficulty:3},
  {id:23,word:'rabbit',chinese:'兔子',grade:'grade3',difficulty:3},
  {id:24,word:'orange',chinese:'橙子',grade:'grade3',difficulty:3},
  {id:25,word:'purple',chinese:'紫色',grade:'grade3',difficulty:3},
  {id:26,word:'window',chinese:'窗户',grade:'grade3',difficulty:3},
  {id:27,word:'guitar',chinese:'吉他',grade:'grade3',difficulty:3},
  {id:28,word:'family',chinese:'家庭',grade:'grade3',difficulty:3},
  {id:29,word:'dragon',chinese:'龙',grade:'grade3',difficulty:3},
  {id:30,word:'castle',chinese:'城堡',grade:'grade3',difficulty:3},
];

function mockGetWords(grade, count) {
  let pool = MOCK_WORDS.filter(w => w.grade === grade);
  if (pool.length === 0) pool = MOCK_WORDS.filter(w => w.grade === 'grade1');
  // Shuffle
  for (let i = pool.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function mockSaveQuiz(sub) {
  const h = JSON.parse(localStorage.getItem('kv-history')||'[]');
  const id = Date.now();
  h.unshift({ id, date: new Date().toISOString().slice(0,10), grade: sub.grade,
    quiz_type: sub.quiz_type, total: sub.total, correct: sub.correct, score: sub.score });
  localStorage.setItem('kv-history', JSON.stringify(h));

  const w = JSON.parse(localStorage.getItem('kv-wrong')||'{}');
  for (const d of sub.details) {
    if (!d.correct) {
      if (!w[d.word]) w[d.word] = { c: d.chinese, n: 0, d: '' };
      w[d.word].n++;
      w[d.word].d = new Date().toISOString().slice(0,10);
    }
  }
  localStorage.setItem('kv-wrong', JSON.stringify(w));
  return id;
}

// ====== 全局状态 ======
const App = {
  settings: { grade: 'grade1', word_count: 10, quiz_type: 'mixed' },
  quizWords: [],
  quizResults: [],
  currentIdx: 0,
  score: 0,
  streak: 0,

  navigate(hash) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageId = (hash || '#home').replace('#', '');
    const page = document.getElementById('page-' + pageId);
    if (page) {
      page.classList.add('active');
      // 触发页面初始化
      if (pageId === 'home') initHome();
      if (pageId === 'quiz') initQuiz();
      if (pageId === 'result') initResult();
      if (pageId === 'history') initHistory();
    }
  }
};

// 监听 hash 变化
window.addEventListener('hashchange', () => App.navigate(location.hash));
document.addEventListener('DOMContentLoaded', () => App.navigate(location.hash || '#home'));
