import tg from '../telegram.js';

export function initHome(app) {
  const input = document.getElementById('home-input');
  const form = document.getElementById('home-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    tg.hapticMedium();

    const query = {
      id: Date.now(),
      text,
      title: text.length > 30 ? text.slice(0, 30) + '...' : text
    };

    app.openTopic(query);
    input.value = '';
  });
}
