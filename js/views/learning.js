import { CARDS, SENTENCES } from '../data.js';
import tg from '../telegram.js';

let exercise = 1;
let step = 0;
let score = 0;
let order = [];
let answered = false;

export function initLearning() {
  document.getElementById('learning-next-exercise').addEventListener('click', () => {
    startExercise(2);
  });
  document.getElementById('learning-restart').addEventListener('click', () => {
    startExercise(1);
  });
}

export function resetLearning() {
  startExercise(1);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startExercise(num) {
  exercise = num;
  step = 0;
  score = 0;
  answered = false;
  order = shuffle(CARDS.map((_, i) => i));
  tg.hideMain();
  renderExercise();
}

function renderExercise() {
  const area = document.getElementById('learning-area');
  const result = document.getElementById('learning-result');
  area.style.display = '';
  result.style.display = 'none';

  if (exercise === 1) renderTranslationPick();
  else renderFillBlank();
}

function renderTranslationPick() {
  const area = document.getElementById('learning-area');
  const idx = order[step];
  const card = CARDS[idx];

  const distractors = shuffle(
    CARDS.filter((_, i) => i !== idx).map(c => c.translation)
  ).slice(0, 3);

  const options = shuffle([card.translation, ...distractors]);

  area.innerHTML = `
    <div class="exercise-header">
      <div class="exercise-title">Choose the correct translation</div>
      <div class="exercise-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(step / CARDS.length) * 100}%"></div>
        </div>
        <span>${step + 1} / ${CARDS.length}</span>
      </div>
    </div>
    <div class="exercise-word">${card.word}</div>
    <div class="exercise-options">
      ${options.map(opt => `
        <button class="option-btn" data-answer="${opt}">${opt}</button>
      `).join('')}
    </div>
  `;

  answered = false;
  area.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn, card.translation));
  });
}

function renderFillBlank() {
  const area = document.getElementById('learning-area');
  const idx = order[step];
  const card = CARDS[idx];
  const sentence = SENTENCES.find(s => s.cardId === card.id);

  const distractors = shuffle(
    SENTENCES.filter(s => s.cardId !== card.id).map(s => s.blank)
  ).slice(0, 3);

  const options = shuffle([sentence.blank, ...distractors]);

  const displaySentence = sentence.sentence.replace('___',
    '<span class="blank-slot">___</span>');

  area.innerHTML = `
    <div class="exercise-header">
      <div class="exercise-title">Fill in the blank</div>
      <div class="exercise-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(step / CARDS.length) * 100}%"></div>
        </div>
        <span>${step + 1} / ${CARDS.length}</span>
      </div>
    </div>
    <div class="exercise-sentence">${displaySentence}</div>
    <div class="exercise-options">
      ${options.map(opt => `
        <button class="option-btn" data-answer="${opt}">${opt}</button>
      `).join('')}
    </div>
  `;

  answered = false;
  area.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn, sentence.blank));
  });
}

function handleAnswer(btn, correct) {
  if (answered) return;
  answered = true;

  const isCorrect = btn.dataset.answer === correct;
  if (isCorrect) {
    score++;
    tg.hapticSuccess();
  } else {
    tg.hapticError();
  }

  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (!isCorrect) {
    const area = document.getElementById('learning-area');
    area.querySelectorAll('.option-btn').forEach(b => {
      if (b.dataset.answer === correct) b.classList.add('correct');
    });
  }

  setTimeout(() => {
    step++;
    if (step >= CARDS.length) {
      showResult();
    } else {
      renderExercise();
    }
  }, 1000);
}

function showResult() {
  const area = document.getElementById('learning-area');
  const result = document.getElementById('learning-result');
  area.style.display = 'none';
  result.style.display = '';

  const pct = Math.round((score / CARDS.length) * 100);
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';

  document.getElementById('learning-score').textContent = `${score} / ${CARDS.length}`;
  document.getElementById('learning-percentage').textContent = `${pct}%`;
  document.getElementById('learning-emoji').textContent = emoji;

  const nextBtn = document.getElementById('learning-next-exercise');
  const restartBtn = document.getElementById('learning-restart');

  if (exercise === 1) {
    nextBtn.style.display = '';
    nextBtn.textContent = 'Next: Fill in the blanks →';
    restartBtn.style.display = 'none';
    tg.showMain('Next: Fill in the blanks →', () => startExercise(2));
  } else {
    nextBtn.style.display = 'none';
    restartBtn.style.display = '';
    tg.showMain('Start Over', () => startExercise(1));
  }
}
