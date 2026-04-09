const MESSAGES = [
  { from: 'bot', text: "Hi! I'm your interview practice partner. Let's prepare for your English interview! 🎯" },
  { from: 'bot', text: "Tell me, why are you interested in this position?" }
];

export function initDialog() {
  const form = document.getElementById('dialog-form');
  const input = document.getElementById('dialog-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    showToast('Dialog feature coming soon in the full version!');
  });
}

export function resetDialog() {
  const container = document.getElementById('dialog-messages');
  container.innerHTML = MESSAGES.map(m => `
    <div class="dialog-msg ${m.from}">
      ${m.from === 'bot' ? '<div class="dialog-avatar">En</div>' : ''}
      <div class="dialog-bubble">${m.text}</div>
    </div>
  `).join('');
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
