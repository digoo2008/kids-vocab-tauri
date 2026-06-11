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

function startStudy() {
  const bank = DB.getBank();
  const words = Object.keys(bank);
  if (words.length === 0) {
    showModal('Mmmm，单词不够哦，<br/>让爸爸妈妈先帮你录入单词吧~', () => { location.hash = '#wordbank'; });
    return;
  }
  // 随机出题（最多 10 题）
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const selected = words.slice(0, Math.min(10, words.length));
  App.quizWords = selected.map(w => ({ word: w, chinese: bank[w].chinese, audio: bank[w].audio || '' }));
  App.quizResults = [];
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizType = 'bank';
  location.hash = '#quiz';
}

function confirmQuit() {
  showModal('确定要退出测验吗？<br/>本轮进度不会保存哦~', () => { location.hash = '#home'; });
}
