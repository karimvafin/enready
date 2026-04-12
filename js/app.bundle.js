(function() {
  'use strict';

  // ===== CONFIG =====
  var API_URL = 'https://enready-api.enready.workers.dev'; // TODO: replace after deploy
  var selectedLevel = 'B1';
  var currentLang = localStorage.getItem('enready_lang') || 'en';

  // ===== I18N =====
  var i18n = {
    ru: {
      // Home
      home_subtitle: 'Учи английские слова и фразы<br>на любую тему',
      home_description: 'Напиши тему и получи персональные карточки, упражнения на перевод и подстановку слов — всё генерируется ИИ за несколько секунд.',
      home_placeholder: 'Напр. Я в иностранном аэропорту',
      chip_restaurant: 'Ресторан',
      chip_interview: 'Собеседование',
      chip_travel: 'Путешествие',
      chip_topic_restaurant: 'Ресторан и кафе',
      chip_topic_interview: 'Подготовка к собеседованию',
      chip_topic_travel: 'Путешествие и аэропорт',
      history_title: 'История',
      // Loading
      loading_text: 'Генерируем материалы...',
      loading_subtext: 'Это займёт несколько секунд',
      loading_regen: 'Перегенерируем...',
      // Tabs
      tab_cards: 'Карточки',
      tab_learning: 'Упражнения',
      tab_dialog: 'Диалог',
      // Cards
      card_hint: 'Нажми, чтобы перевернуть',
      card_reset: 'В начало',
      card_regen: '\u21BB Перегенерировать',
      // Learning
      exercise_translate: 'Выберите перевод',
      exercise_fillblank: 'Вставьте слово',
      exercise_progress: ' из ',
      exercise_next: 'Далее: вставьте слово \u2192',
      exercise_restart: 'Начать заново',
      result_title: 'Ваш результат',
      // Dialog
      dialog_hi: 'Hi! I\'m your practice partner. Let\'s learn together! \uD83C\uDFAF',
      dialog_ask: 'What would you like to practice?',
      dialog_placeholder: 'Напишите ответ...',
      dialog_soon: 'Диалог скоро появится!',
      // Errors
      err_format: 'Неверный формат ответа',
      err_parse: 'Ошибка обработки ответа',
      err_network: 'Ошибка сети. Проверьте подключение.',
      err_timeout: 'Время ожидания истекло. Попробуйте ещё.'
    },
    en: {
      home_subtitle: 'Learn English words and phrases<br>on any topic',
      home_description: 'Type a topic and get personalized flashcards, translation and fill-in-the-blank exercises — all AI-generated in seconds.',
      home_placeholder: 'E.g. Job interview preparation',
      chip_restaurant: 'Restaurant',
      chip_interview: 'Interview',
      chip_travel: 'Travel',
      chip_topic_restaurant: 'Restaurant and cafe',
      chip_topic_interview: 'Job interview preparation',
      chip_topic_travel: 'Travel and airport',
      history_title: 'History',
      loading_text: 'Generating materials...',
      loading_subtext: 'This will take a few seconds',
      loading_regen: 'Regenerating...',
      tab_cards: 'Cards',
      tab_learning: 'Exercises',
      tab_dialog: 'Dialog',
      card_hint: 'Tap to flip',
      card_reset: 'Back to start',
      card_regen: '\u21BB Regenerate',
      exercise_translate: 'Choose the definition',
      exercise_fillblank: 'Fill in the blank',
      exercise_progress: ' of ',
      exercise_next: 'Next: fill in the blank \u2192',
      exercise_restart: 'Start over',
      result_title: 'Your result',
      dialog_hi: 'Hi! I\'m your practice partner. Let\'s learn together! \uD83C\uDFAF',
      dialog_ask: 'What would you like to practice?',
      dialog_placeholder: 'Type your answer...',
      dialog_soon: 'Dialog is coming soon!',
      err_format: 'Invalid response format',
      err_parse: 'Error processing response',
      err_network: 'Network error. Check your connection.',
      err_timeout: 'Request timed out. Try again.'
    }
  };

  function t(key) {
    return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.en[key]) || key;
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem('enready_lang', lang); } catch(e) {}
    updateTexts();
  }

  function updateTexts() {
    // Home
    var sub = $('home-subtitle');
    if (sub) sub.innerHTML = t('home_subtitle');
    var desc = $('home-description');
    if (desc) desc.textContent = t('home_description');
    var inp = $('home-input');
    if (inp) inp.placeholder = t('home_placeholder');
    // History
    var ht = document.querySelector('.history-title');
    if (ht) ht.textContent = t('history_title');
    // Tabs
    var tabBtns = $$('.tab-btn');
    var tabKeys = ['tab_cards', 'tab_learning', 'tab_dialog'];
    for (var i = 0; i < tabBtns.length && i < tabKeys.length; i++) {
      tabBtns[i].textContent = t(tabKeys[i]);
    }
    // Cards buttons
    var cr = $('card-reset');
    if (cr) cr.textContent = t('card_reset');
    var cg = $('card-regen');
    if (cg) cg.innerHTML = t('card_regen');
    // Loading
    var lt = document.querySelector('.loading-text');
    if (lt) lt.textContent = t('loading_text');
    // Dialog placeholder
    var di = $('dialog-input');
    if (di) di.placeholder = t('dialog_placeholder');
    // Chips
    var chips = $$('.home-chip');
    var chipKeys = ['chip_restaurant', 'chip_interview', 'chip_travel'];
    var chipTopicKeys = ['chip_topic_restaurant', 'chip_topic_interview', 'chip_topic_travel'];
    for (var i = 0; i < chips.length && i < chipKeys.length; i++) {
      chips[i].textContent = t(chipKeys[i]);
      chips[i].setAttribute('data-topic', t(chipTopicKeys[i]));
    }
    // Learning result
    var lst = $('learning-score-text');
    if (lst) lst.textContent = t('result_title');
    // Lang toggle
    var langBtns = $$('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      setClass(langBtns[i], 'active', langBtns[i].getAttribute('data-lang') === currentLang);
    }
  }

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

  // ===== TRACK EVENT =====
  function trackEvent(event) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL + '/track', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ event: event }));
    } catch(e) {}
  }

  // ===== DYNAMIC DATA =====
  var CARDS = [];
  var SENTENCES = [];
  var currentTopic = '';
  var HISTORY_KEY = 'enready_history';
  var MAX_HISTORY = 10;

  // ===== HISTORY =====
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch(e) { return []; }
  }

  function saveToHistory(topic, level, cards, sentences) {
    var history = getHistory();
    // Remove duplicate topic
    for (var i = history.length - 1; i >= 0; i--) {
      if (history[i].topic === topic) history.splice(i, 1);
    }
    history.unshift({ topic: topic, level: level, cards: cards, sentences: sentences, ts: Date.now() });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e) {}
  }

  function removeFromHistory(index) {
    var history = getHistory();
    history.splice(index, 1);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e) {}
  }

  function renderHistory() {
    var history = getHistory();
    var section = $('history-section');
    var list = $('history-list');
    if (!history.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    list.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      (function(idx, item) {
        var btn = document.createElement('button');
        btn.className = 'history-item';
        btn.innerHTML = '<span class="history-item-text">' + escapeHtml(item.topic) + '</span>' +
          '<span class="history-item-level">' + (item.level || 'B1') + '</span>' +
          '<span class="history-item-delete">&times;</span>';
        btn.addEventListener('click', function(e) {
          var del = e.target;
          if (del.className === 'history-item-delete') {
            e.stopPropagation();
            removeFromHistory(idx);
            renderHistory();
            tg.hapticLight();
            return;
          }
          CARDS = item.cards;
          SENTENCES = item.sentences;
          currentTopic = item.topic;
          var query = { id: Date.now(), text: item.topic, title: item.topic.length > 30 ? item.topic.slice(0, 30) + '...' : item.topic };
          app.openTopic(query);
          tg.hapticLight();
        }, false);
        list.appendChild(btn);
      })(i, history[i]);
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== SPEAK =====
  function speakWord(word) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  // ===== API =====
  function generateMaterials(topic, onSuccess, onError, exclude) {
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
            onError(t('err_format'));
          }
        } catch(e) {
          onError(t('err_parse'));
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

    xhr.onerror = function() { onError(t('err_network')); };
    xhr.ontimeout = function() { onError(t('err_timeout')); };

    var payload = { topic: topic, level: selectedLevel, lang: currentLang };
    if (exclude && exclude.length) { payload.exclude = exclude; }
    try {
      var tgUser = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
      if (tgUser && tgUser.id) { payload.chat_id = tgUser.id; }
    } catch(e) {}
    xhr.send(JSON.stringify(payload));
  }

  // ===== FEEDBACK =====
  var feedbackRating = 0;
  var feedbackSent = false;

  function initFeedback() {
    var starsEl = $('feedback-stars');
    var sendBtn = $('feedback-send');
    if (!starsEl || !sendBtn) return;

    var stars = starsEl.getElementsByTagName('span');
    for (var i = 0; i < stars.length; i++) {
      (function(idx) {
        stars[idx].addEventListener('click', function() {
          if (feedbackSent) return;
          feedbackRating = idx + 1;
          for (var j = 0; j < stars.length; j++) {
            setClass(stars[j], 'active', j < feedbackRating);
            stars[j].innerHTML = j < feedbackRating ? '&#9733;' : '&#9734;';
          }
          sendBtn.disabled = false;
          tg.hapticLight();
        }, false);
      })(i);
    }

    sendBtn.addEventListener('click', function() {
      if (feedbackSent || feedbackRating === 0) return;
      var payload = { rating: feedbackRating };
      var textEl = $('feedback-text');
      if (textEl && textEl.value.trim()) {
        payload.text = textEl.value.trim();
      }
      try {
        var tgUser = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
        if (tgUser && tgUser.id) { payload.chat_id = tgUser.id; }
      } catch(e) {}

      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL + '/feedback', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));

      feedbackSent = true;
      sendBtn.style.display = 'none';
      if (textEl) textEl.style.display = 'none';
      starsEl.style.pointerEvents = 'none';
      $('feedback-thanks').style.display = '';
      tg.hapticSuccess();
    }, false);
  }

  function showFeedbackBlock() {
    var block = $('feedback-block');
    if (block && !feedbackSent) {
      block.style.display = '';
    }
  }

  function resetFeedbackBlock() {
    var block = $('feedback-block');
    if (!block) return;
    block.style.display = 'none';
    if (!feedbackSent) {
      feedbackRating = 0;
      var stars = $('feedback-stars').getElementsByTagName('span');
      for (var i = 0; i < stars.length; i++) {
        setClass(stars[i], 'active', false);
        stars[i].innerHTML = '&#9734;';
      }
      $('feedback-send').disabled = true;
      $('feedback-text').value = '';
      $('feedback-thanks').style.display = 'none';
    }
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
      showToast(t('dialog_soon'));
    });
  }

  function resetDialog() {
    $('dialog-messages').innerHTML =
      '<div class="dialog-msg bot">' +
        '<div class="dialog-avatar">En</div>' +
        '<div class="dialog-bubble">' + t('dialog_hi') + '</div>' +
      '</div>' +
      '<div class="dialog-msg bot">' +
        '<div class="dialog-avatar">En</div>' +
        '<div class="dialog-bubble">' + t('dialog_ask') + '</div>' +
      '</div>';
  }

  // ===== CARDS =====
  var currentCardIndex = 0;
  var touchStartX = 0;

  function initCards() {
    var container = $('cards-container');
    container.addEventListener('click', function(e) {
      // Speak button — don't flip
      if (e.target.className === 'speak-btn' || findParent(e.target, 'speak-btn')) {
        e.stopPropagation();
        var btn = e.target.className === 'speak-btn' ? e.target : findParent(e.target, 'speak-btn');
        var word = btn.getAttribute('data-word');
        if (word) speakWord(word);
        tg.hapticLight();
        return;
      }
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

    $('card-regen').addEventListener('click', function() {
      if (!currentTopic) return;
      var exclude = [];
      for (var i = 0; i < CARDS.length; i++) {
        exclude.push(CARDS[i].word);
      }
      tg.hapticMedium();
      app.showView('loading');
      $('loading-subtext').textContent = t('loading_regen');
      generateMaterials(currentTopic, function(data) {
        CARDS = data.cards;
        SENTENCES = data.sentences;
        saveToHistory(currentTopic, selectedLevel, CARDS, SENTENCES);
        app.showView('topic');
        app.switchTab('cards');
        resetCards();
        resetLearning();
      }, function(errMsg) {
        $('loading-subtext').textContent = 'Error: ' + errMsg;
        setTimeout(function() { app.showView('topic'); }, 3000);
        tg.hapticError();
      }, exclude);
    }, false);

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
    var frontHTML, backHTML;
    if (currentLang === 'en') {
      frontHTML =
        '<div class="flashcard-spacer"></div>' +
        '<div class="flashcard-word">' + card.word + '</div>' +
        '<div class="flashcard-spacer"></div>' +
        '<button class="speak-btn" data-word="' + card.word.replace(/"/g, '&quot;') + '" aria-label="Listen">&#128264;</button>';
      backHTML =
        '<div class="flashcard-explanation">' + card.explanation + '</div>' +
        '<div class="flashcard-example">"' + card.example + '"</div>';
    } else {
      frontHTML =
        '<div class="flashcard-spacer"></div>' +
        '<div class="flashcard-word">' + card.word + '</div>' +
        '<div class="flashcard-explanation">' + card.explanation + '</div>' +
        '<div class="flashcard-spacer"></div>' +
        '<button class="speak-btn" data-word="' + card.word.replace(/"/g, '&quot;') + '" aria-label="Listen">&#128264;</button>';
      backHTML =
        '<div class="flashcard-translation">' + card.translation + '</div>' +
        '<div class="flashcard-example">"' + card.example + '"</div>';
    }
    $('cards-container').innerHTML =
      '<div class="flashcard">' +
        '<div class="flashcard-inner">' +
          '<div class="flashcard-front">' + frontHTML + '</div>' +
          '<div class="flashcard-back">' + backHTML + '</div>' +
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
    var answerField = currentLang === 'en' ? 'explanation' : 'translation';
    var correctAnswer = card[answerField];
    var others = [];
    for (var i = 0; i < CARDS.length; i++) {
      if (i !== idx) others.push(CARDS[i][answerField]);
    }
    var distractors = shuffle(others).slice(0, 3);
    var options = shuffle([correctAnswer].concat(distractors));

    area.innerHTML =
      '<div class="exercise-header">' +
        '<div class="exercise-title">' + t('exercise_translate') + '</div>' +
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
    bindOptions(area, correctAnswer);
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
        '<div class="exercise-title">' + t('exercise_fillblank') + '</div>' +
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
      $('learning-next-exercise').textContent = t('exercise_next');
      $('learning-restart').style.display = 'none';
      resetFeedbackBlock();
      tg.showMain(t('exercise_next'), function() { startExercise(2); });
    } else {
      $('learning-next-exercise').style.display = 'none';
      $('learning-restart').style.display = '';
      showFeedbackBlock();
      tg.showMain(t('exercise_restart'), function() { startExercise(1); });
    }
  }

  // ===== HOME =====
  function initHome(app) {
    // Language toggle
    var langBtns = $$('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          setLang(btn.getAttribute('data-lang'));
          tg.hapticLight();
        }, false);
      })(langBtns[i]);
    }

    // Level selector
    var levelBtns = $$('.level-btn');
    for (var i = 0; i < levelBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          for (var j = 0; j < levelBtns.length; j++) {
            setClass(levelBtns[j], 'active', levelBtns[j] === btn);
          }
          selectedLevel = btn.getAttribute('data-level');
          tg.hapticLight();
        }, false);
      })(levelBtns[i]);
    }

    var chips = $$('.home-chip');
    for (var i = 0; i < chips.length; i++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var topic = chip.getAttribute('data-topic');
          if (topic) {
            $('home-input').value = topic;
            $('home-input').focus();
            tg.hapticLight();
          }
        }, false);
      })(chips[i]);
    }

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
      $('loading-subtext').textContent = t('loading_subtext');

      currentTopic = text;
      generateMaterials(text, function(data) {
        CARDS = data.cards;
        SENTENCES = data.sentences;
        saveToHistory(text, selectedLevel, CARDS, SENTENCES);
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
        if (name === 'home') renderHistory();
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
      trackEvent('app_opened');
      initHome(this);
      initCards();
      initLearning();
      initDialog();
      initFeedback();
      updateTexts();
      renderHistory();
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
