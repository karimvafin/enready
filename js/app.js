import tg from './telegram.js';
import { initHome } from './views/home.js';
import { initCards, resetCards } from './views/cards.js';
import { initLearning, resetLearning } from './views/learning.js';
import { initDialog, resetDialog } from './views/dialog.js';

const app = {
  state: {
    currentView: 'home',
    activeTab: 'cards'
  },

  showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    this.state.currentView = name;

    if (name === 'topic') {
      tg.showBack(() => this.showView('home'));
    } else {
      tg.hideBack();
      tg.hideMain();
    }
  },

  openTopic(query) {
    document.getElementById('topic-title').textContent =
      query.title.replace('...', '');
    this.showView('topic');
    this.switchTab('cards');
    resetCards();
    resetLearning();
    resetDialog();
  },

  switchTab(tab) {
    this.state.activeTab = tab;
    tg.hapticLight();
    tg.hideMain();

    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c =>
      c.classList.toggle('active', c.id === `tab-${tab}`));
  },

  init() {
    tg.init();

    initHome(this);
    initCards();
    initLearning();
    initDialog();

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  }
};

app.init();
