import { CARDS } from '../data.js';
import tg from '../telegram.js';

let currentIndex = 0;
let touchStartX = 0;

export function initCards() {
  const container = document.getElementById('cards-container');
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.flashcard');
    if (card) {
      card.classList.toggle('flipped');
      tg.hapticLight();
    }
  });

  document.getElementById('card-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('card-next').addEventListener('click', () => navigate(1));

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      navigate(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
}

function navigate(dir) {
  const next = currentIndex + dir;
  if (next < 0 || next >= CARDS.length) return;
  currentIndex = next;
  tg.hapticLight();
  renderCard();
}

export function resetCards() {
  currentIndex = 0;
  renderCard();
}

function renderCard() {
  const card = CARDS[currentIndex];
  const container = document.getElementById('cards-container');
  const counter = document.getElementById('cards-counter');

  container.innerHTML = `
    <div class="flashcard">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="flashcard-word">${card.word}</div>
          <div class="flashcard-explanation">${card.explanation}</div>
          <div class="flashcard-hint">Tap to flip</div>
        </div>
        <div class="flashcard-back">
          <div class="flashcard-translation">${card.translation}</div>
          <div class="flashcard-example">"${card.example}"</div>
        </div>
      </div>
    </div>
  `;

  counter.textContent = `${currentIndex + 1} / ${CARDS.length}`;

  document.getElementById('card-prev').disabled = currentIndex === 0;
  document.getElementById('card-next').disabled = currentIndex === CARDS.length - 1;
}
