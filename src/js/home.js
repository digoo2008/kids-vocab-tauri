// ====== 首页 ======

async function initHome() {
  try {
    const stats = await Tauri.invoke('get_home_stats');
    document.getElementById('stat-today').textContent = stats.today_completed + '/' + stats.today_target;
    document.getElementById('stat-checkin').textContent = stats.checkin_days;
    document.getElementById('stat-wrong').textContent = stats.wrong_count;
  } catch(e) {
    document.getElementById('stat-today').textContent = '0/10';
    document.getElementById('stat-checkin').textContent = '0';
    document.getElementById('stat-wrong').textContent = '0';
  }
}

function startQuiz() {
  const grade = document.getElementById('grade-select').value;
  const count = parseInt(document.getElementById('count-select').value);
  const quizType = document.querySelector('.mode-tab.active')?.dataset.mode || 'mixed';

  App.settings = { grade, word_count: count, quiz_type: quizType };
  App.currentIdx = 0;
  App.score = 0;
  App.streak = 0;
  App.quizResults = [];

  location.hash = '#quiz';
}

function setMode(mode, el) {
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

// 模式切换点击事件
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode, tab));
  });
});
