(function() {
  'use strict';

  // ===== CONFIG =====
  var API_URL = 'https://enready-api.enready.workers.dev'; // TODO: replace after deploy

  // ===== ERROR OVERLAY =====
  window.onerror = function(msg, src, line) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:16px;background:red;color:#fff;font:14px monospace;z-index:9999;word-break:break-all';
    d.textContent = 'Error: ' + msg + ' (line ' + line + ')';
    document.body.appendChild(d);
  };

  // ===== HELPERS =====
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function setClass(el, cls, on) {
    if (on) el.classList.add(cls); else el.classList.remove(cls);
  }
  function findParent(el, cls) {
    while (el) {
      if (el.classList && el.classList.contains(cls)) return el;
      el = el.parentElement;
    }
    return null;
  }

  // ===== TELEGRAM SDK WRAPPER =====
  var webApp = (window.Telegram && window.Telegram.WebApp) || null;
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
      try { webApp.setHeaderColor('secondary_bg_color'); } catch(e) {}
      try { webApp.setBackgroundColor('secondary_bg_color'); } catch(e) {}
    },
    showBack: function(cb) {
      if (!webApp) return;
      try {
        if (backHandler) webApp.BackButton.offClick(backHandler);
        backHandler = cb;
        webApp.BackButton.onClick(backHandler);
        webApp.BackButton.show();
      } catch(e) {}
    },
    hideBack: function() {
      if (!webApp) return;
      try {
        if (backHandler) webApp.BackButton.offClick(backHandler);
        backHandler = null;
        webApp.BackButton.hide();
      } catch(e) {}
    },
    showMain: function(text, cb) {
      if (!webApp) return;
      try {
        if (mainHandler) webApp.MainButton.offClick(mainHandler);
        mainHandler = cb;
        webApp.MainButton.setText(text);
        webApp.MainButton.onClick(mainHandler);
        webApp.MainButton.show();
      } catch(e) {}
    },
    hideMain: function() {
      if (!webApp) return;
      try {
        if (mainHandler) webApp.MainButton.offClick(mainHandler);
        mainHandler = null;
        webApp.MainButton.hide();
      } catch(e) {}
    },
    hapticLight: function() {
      try { webApp && webApp.HapticFeedback && webApp.HapticFeedback.impactOccurred('light'); } catch(e) {}
    },
    hapticMedium: function() {
      try { webApp && webApp.HapticFeedback && webApp.HapticFeedback.impactOccurred('medium'); } catch(e) {}
    },
    hapticSuccess: function() {
      try { webApp && webApp.HapticFeedback && webApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    },
    hapticError: function() {
      try { webApp && webApp.HapticFeedback && webApp.HapticFeedback.notificationOccurred('error'); } catch(e) {}
    }
  };

  // ===== DYNAMIC DATA =====
  var CARDS = [];
  var SENTENCES = [];

  // ===== API =====
  function generateMaterials(topic, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 60000;

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.cards && data.sentences) {
            onSuccess(data);
          } else if (data.error) {
            onError(data.error);
          } else {
            onError('\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u043e\u0442\u0432\u0435\u0442\u0430');
          }
        } catch(e) {
          onError('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u043e\u0442\u0432\u0435\u0442\u0430');
        }
      } else {
        try {
          var err = JSON.parse(xhr.responseText);
          onError(err.error || ('Server error ' + xhr.status));
        } catch(e) {
          onError('Server error ' + xhr.status);
        }
      }
    };

    xhr.onerror = function() { onError('\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435.'); };
    xhr.ontimeout = function() { onError('\u0412\u0440\u0435\u043c\u044f \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f \u0438\u0441\u0442\u0435\u043a\u043b\u043e. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451.'); };

    xhr.send(JSON.stringify({ topic: topic }));
  }

  // ===== TOAST =====
  function showToast(msg) {
    var toast = $('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
  }

  // ===== DIALOG =====
  function initDialog() {
    $('dialog-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var input = $('dialog-input');
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      showToast('\u0414\u0438\u0430\u043b\u043e\u0433 \u0441\u043a\u043e\u0440\u043e \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u043f\u043e\u043b\u043d\u043e\u0439 \u0432\u0435\u0440\u0441\u0438\u0438!');
    });
  }

  function resetDialog() {
    $('dialog-messages').innerHTML =
      '<div class="dialog-msg bot">' +
        '<div class="dialog-avatar">En</div>' +
        '<div class="dialog-bubble">\u041f\u0440\u0438\u0432\u0435\u0442! \u042f \u0442\u0432\u043e\u0439 \u043f\u0430\u0440\u0442\u043d\u0451\u0440 \u0434\u043b\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0438. \u0414\u0430\u0432\u0430\u0439 \u0443\u0447\u0438\u0442\u044c\u0441\u044f \u0432\u043c\u0435\u0441\u0442\u0435! \uD83C\uDFAF</div>' +
      '</div>' +
      '<div class="dialog-msg bot">' +
        '<div class="dialog-avatar">En</div>' +
        '<div class="dialog-bubble">\u0427\u0442\u043e \u0431\u044b \u0442\u044b \u0445\u043e\u0442\u0435\u043b \u043f\u043e\u043f\u0440\u0430\u043a\u0442\u0438\u043a\u043e\u0432\u0430\u0442\u044c?</div>' +
      '</div>';
  }

  // ===== CARDS =====
  var currentCardIndex = 0;
  var touchStartX = 0;

  function initCards() {
    var container = $('cards-container');
    container.addEventListener('click', function(e) {
      var card = findParent(e.target, 'flashcard');
      if (card) {
        card.classList.toggle('flipped');
        tg.hapticLight();
      }
    });

    $('card-prev').addEventListener('click', function() { navigateCard(-1); });
    $('card-next').addEventListener('click', function() { navigateCard(1); });
    $('card-reset').addEventListener('click', function() {
      currentCardIndex = 0;
      renderCard();
      tg.hapticLight();
    });

    container.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, false);

    container.addEventListener('touchend', function(e) {
      var diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        navigateCard(diff > 0 ? 1 : -1);
      }
    }, false);
  }

  var isAnimating = false;

  function navigateCard(dir) {
    var next = currentCardIndex + dir;
    if (next < 0 || next >= CARDS.length || isAnimating) return;
    isAnimating = true;
    tg.hapticLight();

    var container = $('cards-container');
    var oldCard = container.firstChild;
    if (oldCard) {
      oldCard.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      oldCard.style.transform = 'translateX(' + (dir > 0 ? '-60px' : '60px') + ')';
      oldCard.style.opacity = '0';
    }

    setTimeout(function() {
      currentCardIndex = next;
      renderCard();
      var newCard = container.firstChild;
      if (newCard) {
        newCard.style.transform = 'translateX(' + (dir > 0 ? '60px' : '-60px') + ')';
        newCard.style.opacity = '0';
        // force reflow
        newCard.offsetHeight;
        newCard.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        newCard.style.transform = 'translateX(0)';
        newCard.style.opacity = '1';
      }
      setTimeout(function() { isAnimating = false; }, 250);
    }, 200);
  }

  function resetCards() {
    currentCardIndex = 0;
    if (CARDS.length > 0) renderCard();
  }

  function renderCard() {
    if (CARDS.length === 0) return;
    var card = CARDS[currentCardIndex];
    $('cards-container').innerHTML =
      '<div class="flashcard">' +
        '<div class="flashcard-inner">' +
          '<div class="flashcard-front">' +
            '<div class="flashcard-word">' + card.word + '</div>' +
            '<div class="flashcard-explanation">' + card.explanation + '</div>' +
            '<div class="flashcard-hint">\u041d\u0430\u0436\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u043f\u0435\u0440\u0435\u0432\u0435\u0440\u043d\u0443\u0442\u044c</div>' +
          '</div>' +
          '<div class="flashcard-back">' +
            '<div class="flashcard-translation">' + card.translation + '</div>' +
            '<div class="flashcard-example">"' + card.example + '"</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('cards-counter').textContent = (currentCardIndex + 1) + ' / ' + CARDS.length;
    $('card-prev').disabled = currentCardIndex === 0;
    $('card-next').disabled = currentCardIndex === CARDS.length - 1;
  }

  // ===== LEARNING =====
  var exercise = 1;
  var learningStep = 0;
  var score = 0;
  var order = [];
  var answered = false;

  function initLearning() {
    $('learning-next-exercise').addEventListener('click', function() { startExercise(2); });
    $('learning-restart').addEventListener('click', function() { startExercise(1); });
  }

  function resetLearning() { startExercise(1); }

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
    var indices = [];
    for (var i = 0; i < CARDS.length; i++) indices.push(i);
    order = shuffle(indices);
    tg.hideMain();
    if (CARDS.length > 0) renderExercise();
  }

  function renderExercise() {
    $('learning-area').style.display = '';
    $('learning-result').style.display = 'none';
    if (exercise === 1) renderTranslationPick();
    else renderFillBlank();
  }

  function buildOptionsHTML(options) {
    var html = '';
    for (var i = 0; i < options.length; i++) {
      html += '<button class="option-btn" data-answer="' + options[i] + '">' + options[i] + '</button>';
    }
    return html;
  }

  function bindOptions(area, correct) {
    var btns = $$('.option-btn', area);
    for (var i = 0; i < btns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() { handleAnswer(btn, correct); });
      })(btns[i]);
    }
  }

  function renderTranslationPick() {
    var area = $('learning-area');
    var idx = order[learningStep];
    var card = CARDS[idx];
    var others = [];
    for (var i = 0; i < CARDS.length; i++) {
      if (i !== idx) others.push(CARDS[i].translation);
    }
    var distractors = shuffle(others).slice(0, 3);
    var options = shuffle([card.translation].concat(distractors));

    area.innerHTML =
      '<div class="exercise-header">' +
        '<div class="exercise-title">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434</div>' +
        '<div class="exercise-progress">' +
          '<div class="progress-bar">' +
            '<div class="progress-fill" style="width: ' + ((learningStep / CARDS.length) * 100) + '%"></div>' +
          '</div>' +
          '<span>' + (learningStep + 1) + ' / ' + CARDS.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="exercise-word">' + card.word + '</div>' +
      '<div class="exercise-options">' + buildOptionsHTML(options) + '</div>';

    answered = false;
    bindOptions(area, card.translation);
  }

  function renderFillBlank() {
    var area = $('learning-area');
    var idx = order[learningStep];
    var card = CARDS[idx];
    var sentence = null;
    for (var i = 0; i < SENTENCES.length; i++) {
      if (SENTENCES[i].cardId === card.id) { sentence = SENTENCES[i]; break; }
    }
    if (!sentence) { learningStep++; renderExercise(); return; }

    var others = [];
    for (var i = 0; i < SENTENCES.length; i++) {
      if (SENTENCES[i].cardId !== card.id) others.push(SENTENCES[i].blank);
    }
    var distractors = shuffle(others).slice(0, 3);
    var options = shuffle([sentence.blank].concat(distractors));
    var displaySentence = sentence.sentence.replace('___', '<span class="blank-slot">___</span>');

    area.innerHTML =
      '<div class="exercise-header">' +
        '<div class="exercise-title">\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043d\u043e\u0435 \u0441\u043b\u043e\u0432\u043e</div>' +
        '<div class="exercise-progress">' +
          '<div class="progress-bar">' +
            '<div class="progress-fill" style="width: ' + ((learningStep / CARDS.length) * 100) + '%"></div>' +
          '</div>' +
          '<span>' + (learningStep + 1) + ' / ' + CARDS.length + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="exercise-sentence">' + displaySentence + '</div>' +
      '<div class="exercise-options">' + buildOptionsHTML(options) + '</div>';

    answered = false;
    bindOptions(area, sentence.blank);
  }

  function handleAnswer(btn, correct) {
    if (answered) return;
    answered = true;
    var isCorrect = btn.getAttribute('data-answer') === correct;
    if (isCorrect) { score++; tg.hapticSuccess(); }
    else { tg.hapticError(); }

    btn.classList.add(isCorrect ? 'correct' : 'wrong');

    if (!isCorrect) {
      var btns = $$('.option-btn', $('learning-area'));
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-answer') === correct) btns[i].classList.add('correct');
      }
    }

    setTimeout(function() {
      learningStep++;
      if (learningStep >= CARDS.length) showLearningResult();
      else renderExercise();
    }, 1000);
  }

  function showLearningResult() {
    $('learning-area').style.display = 'none';
    $('learning-result').style.display = '';

    var pct = Math.round((score / CARDS.length) * 100);
    var emoji = pct >= 80 ? '\uD83C\uDF89' : pct >= 50 ? '\uD83D\uDC4D' : '\uD83D\uDCAA';

    $('learning-score').textContent = score + ' / ' + CARDS.length;
    $('learning-percentage').textContent = pct + '%';
    $('learning-emoji').textContent = emoji;

    if (exercise === 1) {
      $('learning-next-exercise').style.display = '';
      $('learning-next-exercise').textContent = '\u0414\u0430\u043b\u0435\u0435: \u0432\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0441\u043b\u043e\u0432\u043e \u2192';
      $('learning-restart').style.display = 'none';
      tg.showMain('\u0414\u0430\u043b\u0435\u0435: \u0432\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0441\u043b\u043e\u0432\u043e \u2192', function() { startExercise(2); });
    } else {
      $('learning-next-exercise').style.display = 'none';
      $('learning-restart').style.display = '';
      tg.showMain('\u041d\u0430\u0447\u0430\u0442\u044c \u0437\u0430\u043d\u043e\u0432\u043e', function() { startExercise(1); });
    }
  }

  // ===== HOME =====
  function initHome(app) {
    $('home-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var input = $('home-input');
      var text = input.value.trim();
      if (!text) return;
      tg.hapticMedium();
      input.value = '';

      var query = {
        id: Date.now(),
        text: text,
        title: text.length > 30 ? text.slice(0, 30) + '...' : text
      };

      // Show loading screen
      app.showView('loading');
      $('loading-subtext').textContent = '\u042d\u0442\u043e \u0437\u0430\u0439\u043c\u0451\u0442 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0435\u043a\u0443\u043d\u0434';

      generateMaterials(text, function(data) {
        CARDS = data.cards;
        SENTENCES = data.sentences;
        app.openTopic(query);
      }, function(errMsg) {
        $('loading-subtext').textContent = 'Error: ' + errMsg;
        setTimeout(function() { app.showView('home'); }, 3000);
        tg.hapticError();
      });
    });
  }

  // ===== APP =====
  var app = {
    state: { currentView: 'home', activeTab: 'cards' },

    showView: function(name) {
      var views = $$('.view');
      for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
      $('view-' + name).classList.add('active');
      this.state.currentView = name;
      if (name === 'topic') {
        var self = this;
        tg.showBack(function() { self.showView('home'); });
      } else if (name === 'loading') {
        var self = this;
        tg.showBack(function() { self.showView('home'); });
      } else {
        tg.hideBack();
        tg.hideMain();
      }
    },

    openTopic: function(query) {
      $('topic-title').textContent = query.title.replace('...', '');
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
      var tabBtns = $$('.tab-btn');
      for (var i = 0; i < tabBtns.length; i++) {
        setClass(tabBtns[i], 'active', tabBtns[i].getAttribute('data-tab') === tab);
      }
      var tabPanes = $$('.tab-content');
      for (var i = 0; i < tabPanes.length; i++) {
        setClass(tabPanes[i], 'active', tabPanes[i].id === 'tab-' + tab);
      }
    },

    init: function() {
      tg.init();
      initHome(this);
      initCards();
      initLearning();
      initDialog();
      var self = this;
      var tabBtns = $$('.tab-btn');
      for (var i = 0; i < tabBtns.length; i++) {
        (function(btn) {
          btn.addEventListener('click', function() {
            self.switchTab(btn.getAttribute('data-tab'));
          });
        })(tabBtns[i]);
      }
    }
  };

  app.init();
})();
