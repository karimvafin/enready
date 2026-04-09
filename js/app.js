(function() {
  'use strict';

  // ===== TELEGRAM SDK WRAPPER =====
  var webApp = window.Telegram && window.Telegram.WebApp;
  var backHandler = null;
  var mainHandler = null;

  var tg = {
    init: function() {
      if (!webApp) return;
      webApp.ready();
      webApp.expand();

      if (webApp.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }

      webApp.setHeaderColor('secondary_bg_color');
      webApp.setBackgroundColor('secondary_bg_color');
    },

    showBack: function(cb) {
      if (!webApp) return;
      if (backHandler) webApp.BackButton.offClick(backHandler);
      backHandler = cb;
      webApp.BackButton.onClick(backHandler);
      webApp.BackButton.show();
    },

    hideBack: function() {
      if (!webApp) return;
      if (backHandler) webApp.BackButton.offClick(backHandler);
      backHandler = null;
      webApp.BackButton.hide();
    },

    showMain: function(text, cb) {
      if (!webApp) return;
      if (mainHandler) webApp.MainButton.offClick(mainHandler);
      mainHandler = cb;
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(mainHandler);
      webApp.MainButton.show();
    },

    hideMain: function() {
      if (!webApp) return;
      if (mainHandler) webApp.MainButton.offClick(mainHandler);
      mainHandler = null;
      webApp.MainButton.hide();
    },

    hapticLight: function() {
      if (webApp && webApp.HapticFeedback) webApp.HapticFeedback.impactOccurred('light');
    },

    hapticMedium: function() {
      if (webApp && webApp.HapticFeedback) webApp.HapticFeedback.impactOccurred('medium');
    },

    hapticSuccess: function() {
      if (webApp && webApp.HapticFeedback) webApp.HapticFeedback.notificationOccurred('success');
    },

    hapticError: function() {
      if (webApp && webApp.HapticFeedback) webApp.HapticFeedback.notificationOccurred('error');
    }
  };

  // ===== DATA =====
  var CARDS = [
    { id: 1, word: "to elaborate", explanation: "To explain something in more detail", translation: "\u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435", example: "Could you elaborate on your experience with project management?" },
    { id: 2, word: "strengths", explanation: "Positive qualities or abilities that someone has", translation: "\u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B", example: "What are your greatest strengths?" },
    { id: 3, word: "weaknesses", explanation: "Areas where you need improvement", translation: "\u0441\u043B\u0430\u0431\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B", example: "What would you say are your weaknesses?" },
    { id: 4, word: "to handle", explanation: "To deal with or manage a situation", translation: "\u0441\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C\u0441\u044F", example: "How do you handle stressful situations at work?" },
    { id: 5, word: "deadline", explanation: "The latest time by which something must be completed", translation: "\u043A\u0440\u0430\u0439\u043D\u0438\u0439 \u0441\u0440\u043E\u043A", example: "I always make sure to meet every deadline." },
    { id: 6, word: "team player", explanation: "A person who works well as a member of a team", translation: "\u043A\u043E\u043C\u0430\u043D\u0434\u043D\u044B\u0439 \u0438\u0433\u0440\u043E\u043A", example: "I consider myself a strong team player." },
    { id: 7, word: "to contribute", explanation: "To give or add something valuable to a group effort", translation: "\u0432\u043D\u043E\u0441\u0438\u0442\u044C \u0432\u043A\u043B\u0430\u0434", example: "How can you contribute to our company?" },
    { id: 8, word: "relevant experience", explanation: "Past work or activities directly related to the job", translation: "\u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u044B\u0439 \u043E\u043F\u044B\u0442", example: "Do you have any relevant experience in this field?" },
    { id: 9, word: "to prioritize", explanation: "To decide the order of importance of tasks", translation: "\u0440\u0430\u0441\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u044B", example: "How do you prioritize your tasks when everything is urgent?" },
    { id: 10, word: "feedback", explanation: "Comments or information about how well someone is doing", translation: "\u043E\u0431\u0440\u0430\u0442\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C", example: "I appreciate constructive feedback from my colleagues." },
    { id: 11, word: "to achieve", explanation: "To successfully reach a goal through effort", translation: "\u0434\u043E\u0441\u0442\u0438\u0433\u0430\u0442\u044C", example: "What is the biggest goal you have achieved in your career?" },
    { id: 12, word: "challenge", explanation: "A difficult task or situation that tests your abilities", translation: "\u0432\u044B\u0437\u043E\u0432, \u0441\u043B\u043E\u0436\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430", example: "Tell me about a challenge you faced at your previous job." },
    { id: 13, word: "to collaborate", explanation: "To work together with others on a shared goal", translation: "\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0430\u0442\u044C", example: "I enjoy collaborating with cross-functional teams." },
    { id: 14, word: "growth", explanation: "The process of developing or improving over time", translation: "\u0440\u043E\u0441\u0442, \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435", example: "I am looking for opportunities for professional growth." },
    { id: 15, word: "to adapt", explanation: "To change your behavior to fit new conditions", translation: "\u0430\u0434\u0430\u043F\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F", example: "How quickly can you adapt to new technologies?" }
  ];

  var SENTENCES = [
    { cardId: 1, sentence: "Can you ___ on why you decided to change your career path?", blank: "elaborate" },
    { cardId: 2, sentence: "My key ___ include problem-solving and communication skills.", blank: "strengths" },
    { cardId: 3, sentence: "One of my ___ is that I sometimes focus too much on details.", blank: "weaknesses" },
    { cardId: 4, sentence: "I learned to ___ multiple projects simultaneously at my last job.", blank: "handle" },
    { cardId: 5, sentence: "We had a tight ___ but the team delivered the project on time.", blank: "deadline" },
    { cardId: 6, sentence: "Being a ___ means putting the group's success above your own.", blank: "team player" },
    { cardId: 7, sentence: "I want to ___ to the success of your organization.", blank: "contribute" },
    { cardId: 8, sentence: "I have three years of ___ in software development.", blank: "relevant experience" },
    { cardId: 9, sentence: "I use a task management system to ___ my daily work.", blank: "prioritize" },
    { cardId: 10, sentence: "Regular ___ helps me understand areas where I can improve.", blank: "feedback" },
    { cardId: 11, sentence: "I was able to ___ a 30% increase in sales last quarter.", blank: "achieve" },
    { cardId: 12, sentence: "The biggest ___ was migrating the entire system to the cloud.", blank: "challenge" },
    { cardId: 13, sentence: "I love to ___ with designers and engineers to build great products.", blank: "collaborate" },
    { cardId: 14, sentence: "This role offers excellent opportunities for career ___.", blank: "growth" },
    { cardId: 15, sentence: "You need to ___ quickly when requirements change mid-project.", blank: "adapt" }
  ];

  // ===== DIALOG =====
  var MESSAGES = [
    { from: 'bot', text: "Hi! I'm your interview practice partner. Let's prepare for your English interview! \uD83C\uDFAF" },
    { from: 'bot', text: "Tell me, why are you interested in this position?" }
  ];

  function initDialog() {
    var form = document.getElementById('dialog-form');
    var input = document.getElementById('dialog-input');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      showToast('Dialog feature coming soon in the full version!');
    });
  }

  function resetDialog() {
    var container = document.getElementById('dialog-messages');
    container.innerHTML = MESSAGES.map(function(m) {
      return '<div class="dialog-msg ' + m.from + '">' +
        (m.from === 'bot' ? '<div class="dialog-avatar">En</div>' : '') +
        '<div class="dialog-bubble">' + m.text + '</div>' +
      '</div>';
    }).join('');
  }

  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
  }

  // ===== CARDS =====
  var currentCardIndex = 0;
  var touchStartX = 0;

  function initCards() {
    var container = document.getElementById('cards-container');
    container.addEventListener('click', function(e) {
      var card = e.target.closest('.flashcard');
      if (card) {
        card.classList.toggle('flipped');
        tg.hapticLight();
      }
    });

    document.getElementById('card-prev').addEventListener('click', function() { navigateCard(-1); });
    document.getElementById('card-next').addEventListener('click', function() { navigateCard(1); });

    container.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      var diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        navigateCard(diff > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  function navigateCard(dir) {
    var next = currentCardIndex + dir;
    if (next < 0 || next >= CARDS.length) return;
    currentCardIndex = next;
    tg.hapticLight();
    renderCard();
  }

  function resetCards() {
    currentCardIndex = 0;
    renderCard();
  }

  function renderCard() {
    var card = CARDS[currentCardIndex];
    var container = document.getElementById('cards-container');
    var counter = document.getElementById('cards-counter');

    container.innerHTML =
      '<div class="flashcard">' +
        '<div class="flashcard-inner">' +
          '<div class="flashcard-front">' +
            '<div class="flashcard-word">' + card.word + '</div>' +
            '<div class="flashcard-explanation">' + card.explanation + '</div>' +
            '<div class="flashcard-hint">Tap to flip</div>' +
          '</div>' +
          '<div class="flashcard-back">' +
            '<div class="flashcard-translation">' + card.translation + '</div>' +
            '<div class="flashcard-example">"' + card.example + '"</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    counter.textContent = (currentCardIndex + 1) + ' / ' + CARDS.length;

    document.getElementById('card-prev').disabled = currentCardIndex === 0;
    document.getElementById('card-next').disabled = currentCardIndex === CARDS.length - 1;
  }

  // ===== LEARNING =====
  var exercise = 1;
  var learningStep = 0;
  var score = 0;
  var order = [];
  var answered = false;

  function initLearning() {
    document.getElementById('learning-next-exercise').addEventListener('click', function() {
      startExercise(2);
    });
    document.getElementById('learning-restart').addEventListener('click', function() {
      startExercise(1);
    });
  }

  function resetLearning() {
    startExercise(1);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function startExercise(num) {
    exercise = num;
    learningStep = 0;
    score = 0;
    answered = false;
    order = shuffle(CARDS.map(function(_, i) { return i; }));
    tg.hideMain();
    renderExercise();
  }

  function renderExercise() {
    var area = document.getElementById('learning-area');
    var result = document.getElementById('learning-result');
    area.style.display = '';
    result.style.display = 'none';

    if (exercise === 1) renderTranslationPick();
    else renderFillBlank();
  }

  function renderTranslationPick() {
    var area = document.getElementById('learning-area');
    var idx = order[learningStep];
    var card = CARDS[idx];

    var distractors = shuffle(
      CARDS.filter(function(_, i) { return i !== idx; }).map(function(c) { return c.translation; })
    ).slice(0, 3);

    var options = shuffle([card.translation].concat(distractors));

    area.innerHTML =
      '<div class="exercise-header">' +
        '<div class="exercise-title">Choose the correct translation</div>' +
        '<div class="exercise-progress">' +
          '<div class="progress-bar">' +
            '<div class="progress-fill" style="width: ' + ((learningStep / CARDS.length) * 100) + '%"></div>' +
          '</div>' +
          '<span>' + (learningStep + 1) + ' / ' + CARDS.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="exercise-word">' + card.word + '</div>' +
      '<div class="exercise-options">' +
        options.map(function(opt) {
          return '<button class="option-btn" data-answer="' + opt + '">' + opt + '</button>';
        }).join('') +
      '</div>';

    answered = false;
    area.querySelectorAll('.option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { handleAnswer(btn, card.translation); });
    });
  }

  function renderFillBlank() {
    var area = document.getElementById('learning-area');
    var idx = order[learningStep];
    var card = CARDS[idx];
    var sentence = null;
    for (var i = 0; i < SENTENCES.length; i++) {
      if (SENTENCES[i].cardId === card.id) { sentence = SENTENCES[i]; break; }
    }

    var distractors = shuffle(
      SENTENCES.filter(function(s) { return s.cardId !== card.id; }).map(function(s) { return s.blank; })
    ).slice(0, 3);

    var options = shuffle([sentence.blank].concat(distractors));

    var displaySentence = sentence.sentence.replace('___', '<span class="blank-slot">___</span>');

    area.innerHTML =
      '<div class="exercise-header">' +
        '<div class="exercise-title">Fill in the blank</div>' +
        '<div class="exercise-progress">' +
          '<div class="progress-bar">' +
            '<div class="progress-fill" style="width: ' + ((learningStep / CARDS.length) * 100) + '%"></div>' +
          '</div>' +
          '<span>' + (learningStep + 1) + ' / ' + CARDS.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="exercise-sentence">' + displaySentence + '</div>' +
      '<div class="exercise-options">' +
        options.map(function(opt) {
          return '<button class="option-btn" data-answer="' + opt + '">' + opt + '</button>';
        }).join('') +
      '</div>';

    answered = false;
    area.querySelectorAll('.option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { handleAnswer(btn, sentence.blank); });
    });
  }

  function handleAnswer(btn, correct) {
    if (answered) return;
    answered = true;

    var isCorrect = btn.dataset.answer === correct;
    if (isCorrect) {
      score++;
      tg.hapticSuccess();
    } else {
      tg.hapticError();
    }

    btn.classList.add(isCorrect ? 'correct' : 'wrong');

    if (!isCorrect) {
      var area = document.getElementById('learning-area');
      area.querySelectorAll('.option-btn').forEach(function(b) {
        if (b.dataset.answer === correct) b.classList.add('correct');
      });
    }

    setTimeout(function() {
      learningStep++;
      if (learningStep >= CARDS.length) {
        showLearningResult();
      } else {
        renderExercise();
      }
    }, 1000);
  }

  function showLearningResult() {
    var area = document.getElementById('learning-area');
    var result = document.getElementById('learning-result');
    area.style.display = 'none';
    result.style.display = '';

    var pct = Math.round((score / CARDS.length) * 100);
    var emoji = pct >= 80 ? '\uD83C\uDF89' : pct >= 50 ? '\uD83D\uDC4D' : '\uD83D\uDCAA';

    document.getElementById('learning-score').textContent = score + ' / ' + CARDS.length;
    document.getElementById('learning-percentage').textContent = pct + '%';
    document.getElementById('learning-emoji').textContent = emoji;

    var nextBtn = document.getElementById('learning-next-exercise');
    var restartBtn = document.getElementById('learning-restart');

    if (exercise === 1) {
      nextBtn.style.display = '';
      nextBtn.textContent = 'Next: Fill in the blanks \u2192';
      restartBtn.style.display = 'none';
      tg.showMain('Next: Fill in the blanks \u2192', function() { startExercise(2); });
    } else {
      nextBtn.style.display = 'none';
      restartBtn.style.display = '';
      tg.showMain('Start Over', function() { startExercise(1); });
    }
  }

  // ===== HOME =====
  function initHome(app) {
    var input = document.getElementById('home-input');
    var form = document.getElementById('home-form');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;

      tg.hapticMedium();

      var query = {
        id: Date.now(),
        text: text,
        title: text.length > 30 ? text.slice(0, 30) + '...' : text
      };

      app.openTopic(query);
      input.value = '';
    });
  }

  // ===== APP =====
  var app = {
    state: {
      currentView: 'home',
      activeTab: 'cards'
    },

    showView: function(name) {
      document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
      document.getElementById('view-' + name).classList.add('active');
      this.state.currentView = name;

      if (name === 'topic') {
        var self = this;
        tg.showBack(function() { self.showView('home'); });
      } else {
        tg.hideBack();
        tg.hideMain();
      }
    },

    openTopic: function(query) {
      document.getElementById('topic-title').textContent =
        query.title.replace('...', '');
      this.showView('topic');
      this.switchTab('cards');
      resetCards();
      resetLearning();
      resetDialog();
    },

    switchTab: function(tab) {
      this.state.activeTab = tab;
      tg.hapticLight();
      tg.hideMain();

      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      document.querySelectorAll('.tab-content').forEach(function(c) {
        c.classList.toggle('active', c.id === 'tab-' + tab);
      });
    },

    init: function() {
      tg.init();

      initHome(this);
      initCards();
      initLearning();
      initDialog();

      var self = this;
      document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { self.switchTab(btn.dataset.tab); });
      });
    }
  };

  app.init();
})();
