// ===== HELPERS =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function incrementStat(env, key) {
  try {
    const val = parseInt(await env.STATS.get(key) || '0', 10);
    await env.STATS.put(key, String(val + 1));
  } catch(e) {}
}

// ===== GENERATE ENDPOINT =====
async function handleGenerate(request, env) {
  const body = await request.json();
  const { topic, chat_id } = body;
  const level = ['A2','B1','B2','C1'].includes(body.level) ? body.level : 'B1';
  const exclude = Array.isArray(body.exclude) ? body.exclude.slice(0, 20) : [];
  if (!topic || typeof topic !== 'string' || topic.length > 500) {
    return jsonResponse({ error: 'Invalid topic' }, 400);
  }

  // Лимит генераций в день
  const dailyLimit = parseInt(env.DAILY_LIMIT || '10', 10);
  if (!chat_id) {
    return jsonResponse({ error: 'Откройте приложение через Telegram' }, 403);
  }
  if (chat_id) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const count = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM generations WHERE chat_id = ? AND created_at >= ? || 'T00:00:00'"
      ).bind(chat_id, today).first();
      if (count && count.cnt >= dailyLimit) {
        return jsonResponse({ error: 'Достигнут дневной лимит (' + dailyLimit + ' генераций). Попробуйте завтра!' }, 429);
      }
    } catch(e) {
      console.error('Limit check error:', e.message);
    }
  }

  await incrementStat(env, 'generations_total');

  const excludeRule = exclude.length > 0
    ? `\n- IMPORTANT: Do NOT use any of these words or phrases: ${exclude.join(', ')}. Generate completely different vocabulary.`
    : '';

  const prompt = `You are an English language tutor. Generate vocabulary at CEFR ${level} level for the topic: "${topic}".

Return a valid JSON object with exactly this structure (no markdown, no code blocks, just raw JSON):
{
  "cards": [
    {
      "id": 1,
      "word": "English word or phrase",
      "explanation": "Short explanation in English",
      "translation": "Russian translation",
      "example": "Example sentence using this word"
    }
  ],
  "sentences": [
    {
      "cardId": 1,
      "sentence": "Sentence with ___ instead of the target word",
      "blank": "the word that fills the blank"
    }
  ]
}

Rules:
- Generate exactly 10 cards
- Generate exactly 10 sentences (one per card, matching by cardId)
- Cards should be relevant vocabulary for the given topic at CEFR ${level} level
- IMPORTANT: Avoid basic/elementary vocabulary (A1 level) such as common words like "cat", "table", "good", "big", "house". Focus on words that a ${level} learner would find challenging but useful
- Include collocations, phrasal verbs, or idiomatic expressions where appropriate for the level
- Translations must be in Russian
- Examples should be natural and contextual
- In sentences, use ___ (triple underscore) for the blank
- The "blank" field should contain the exact word/phrase to fill in
- IDs should be 1 through 10
- Return ONLY valid JSON, no other text${excludeRule}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://enready.app',
      'X-Title': 'EnReady'
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    await incrementStat(env, 'generations_error');
    if (chat_id) {
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success, level) VALUES (?, ?, 0, ?)').bind(chat_id, topic, level).run(); } catch(e) {}
    }
    const errText = await response.text();
    return jsonResponse({ error: 'OpenRouter: ' + errText }, 502);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  let result;
  try {
    result = JSON.parse(jsonStr);
  } catch(e) {
    await incrementStat(env, 'generations_error');
    if (chat_id) {
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success, level) VALUES (?, ?, 0, ?)').bind(chat_id, topic, level).run(); } catch(e) {}
    }
    return jsonResponse({ error: 'Failed to parse model response' }, 502);
  }

  if (!result.cards || !result.sentences || !Array.isArray(result.cards) || !Array.isArray(result.sentences)) {
    await incrementStat(env, 'generations_error');
    if (chat_id) {
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success, level) VALUES (?, ?, 0, ?)').bind(chat_id, topic, level).run(); } catch(e) {}
    }
    return jsonResponse({ error: 'Invalid response format from model' }, 502);
  }

  await incrementStat(env, 'generations_success');
  if (chat_id) {
    try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success, level) VALUES (?, ?, 1, ?)').bind(chat_id, topic, level).run(); } catch(e) {}
    // Запрашиваем отзыв после первой успешной генерации
    try {
      const user = await env.DB.prepare('SELECT feedback_asked FROM users WHERE chat_id = ?').bind(chat_id).first();
      if (user && !user.feedback_asked) {
        await env.DB.prepare('UPDATE users SET feedback_asked = 1 WHERE chat_id = ?').bind(chat_id).run();
        await sendTelegramMessage(env, chat_id,
          '\u{1F4AC} <b>Как вам EnReady?</b>\n\nОцените приложение \u2014 это займёт пару секунд:',
          {
            inline_keyboard: [[
              { text: '1 \u2B50', callback_data: 'rate_1' },
              { text: '2 \u2B50', callback_data: 'rate_2' },
              { text: '3 \u2B50', callback_data: 'rate_3' },
              { text: '4 \u2B50', callback_data: 'rate_4' },
              { text: '5 \u2B50', callback_data: 'rate_5' },
            ]]
          }
        );
      }
    } catch(e) {
      console.error('Feedback ask error:', e.message);
    }
  }
  return jsonResponse(result);
}

// ===== TRACK EVENT ENDPOINT =====
async function handleTrack(request, env) {
  const { event } = await request.json();
  if (event === 'app_opened') {
    await incrementStat(env, 'app_opens');
  }
  return jsonResponse({ ok: true });
}

// ===== FEEDBACK ENDPOINT =====
async function handleFeedback(request, env) {
  const { chat_id, rating, text } = await request.json();
  if (!rating || rating < 1 || rating > 5) {
    return jsonResponse({ error: 'Rating must be 1-5' }, 400);
  }
  try {
    await env.DB.prepare('INSERT INTO feedback (chat_id, rating, text) VALUES (?, ?, ?)')
      .bind(chat_id || null, rating, text || null).run();
  } catch(e) {
    return jsonResponse({ error: 'DB error' }, 500);
  }
  return jsonResponse({ ok: true });
}

// ===== STATS ENDPOINT =====
async function handleStats(request, env) {
  const token = new URL(request.url).searchParams.get('token');
  if (token !== env.STATS_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const kvKeys = ['app_opens', 'generations_total', 'generations_success', 'generations_error'];
  const stats = {};
  for (const key of kvKeys) {
    stats[key] = parseInt(await env.STATS.get(key) || '0', 10);
  }

  try {
    const usersResult = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    stats.bot_users = usersResult.count;

    const users = await env.DB.prepare(
      'SELECT u.chat_id, u.username, u.first_name, u.created_at, COUNT(g.id) as gen_count, MAX(g.created_at) as last_gen FROM users u LEFT JOIN generations g ON u.chat_id = g.chat_id GROUP BY u.chat_id ORDER BY u.created_at DESC LIMIT 50'
    ).all();
    stats.users = users.results;

    const recentGens = await env.DB.prepare(
      'SELECT g.topic, g.success, g.created_at, u.username, u.first_name FROM generations g LEFT JOIN users u ON g.chat_id = u.chat_id ORDER BY g.created_at DESC LIMIT 20'
    ).all();
    stats.recent_generations = recentGens.results;

    const feedbackResult = await env.DB.prepare(
      'SELECT f.rating, f.text, f.created_at, u.username, u.first_name FROM feedback f LEFT JOIN users u ON f.chat_id = u.chat_id ORDER BY f.created_at DESC LIMIT 20'
    ).all();
    stats.feedback = feedbackResult.results;

    const avgRating = await env.DB.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM feedback').first();
    stats.feedback_avg = avgRating.avg ? Math.round(avgRating.avg * 10) / 10 : null;
    stats.feedback_count = avgRating.count;
  } catch(e) {
    stats.db_error = e.message;
  }

  return jsonResponse(stats);
}

// ===== TELEGRAM BOT WEBHOOK =====
async function handleBotWebhook(request, env) {
  try {
    const update = await request.json();

    // Обработка нажатий на inline-кнопки (оценка)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;

      if (data && data.startsWith('rate_')) {
        const rating = parseInt(data.split('_')[1], 10);
        if (rating >= 1 && rating <= 5) {
          // Сохраняем оценку в DB
          const fbResult = await env.DB.prepare('INSERT INTO feedback (chat_id, rating) VALUES (?, ?) RETURNING id')
            .bind(chatId, rating).first();

          // Запоминаем ID отзыва для комментария
          if (fbResult && fbResult.id) {
            await env.DB.prepare('UPDATE users SET awaiting_feedback_id = ? WHERE chat_id = ?')
              .bind(fbResult.id, chatId).run();
          }

          // Отвечаем на callback
          await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/answerCallbackQuery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cb.id, text: '\u2B50'.repeat(rating) + ' Спасибо!' })
          });

          // Убираем кнопки из сообщения
          await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/editMessageReplyMarkup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } })
          });

          // Предлагаем оставить комментарий
          await sendTelegramMessage(env, chatId,
            '\u2B50'.repeat(rating) + ' Спасибо за оценку!\n\n' +
            'Если хотите, напишите комментарий \u2014 что понравилось или что улучшить.\n' +
            'Или просто нажмите кнопку ниже, чтобы продолжить.',
            {
              inline_keyboard: [[{
                text: '\u{1F680} Открыть EnReady',
                web_app: { url: env.WEBAPP_URL }
              }]]
            }
          );
        }
      }
      return new Response('OK');
    }

    // Обработка текстовых сообщений
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const from = update.message.from || {};

      // Проверяем, ждём ли комментарий к отзыву
      if (!text.startsWith('/')) {
        try {
          const user = await env.DB.prepare('SELECT awaiting_feedback_id FROM users WHERE chat_id = ?').bind(chatId).first();
          if (user && user.awaiting_feedback_id) {
            await env.DB.prepare('UPDATE feedback SET text = ? WHERE id = ?')
              .bind(text.substring(0, 1000), user.awaiting_feedback_id).run();
            await env.DB.prepare('UPDATE users SET awaiting_feedback_id = NULL WHERE chat_id = ?')
              .bind(chatId).run();
            await sendTelegramMessage(env, chatId,
              '\u{1F64F} Спасибо за отзыв! Мы обязательно учтём ваше мнение.',
              {
                inline_keyboard: [[{
                  text: '\u{1F680} Открыть EnReady',
                  web_app: { url: env.WEBAPP_URL }
                }]]
              }
            );
            return new Response('OK');
          }
        } catch(e) {
          console.error('Feedback comment error:', e.message);
        }
      }

      if (text === '/start') {
        try {
          await env.DB.prepare(
            'INSERT INTO users (chat_id, username, first_name) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name'
          ).bind(chatId, from.username || null, from.first_name || null).run();
        } catch(e) {
          console.error('DB user insert error:', e.message);
        }

        const userKey = 'user:' + chatId;
        const exists = await env.STATS.get(userKey);
        if (!exists) {
          await env.STATS.put(userKey, '1');
          await incrementStat(env, 'bot_users');
        }

        await sendTelegramMessage(env, chatId,
          '\u{1F44B} <b>Добро пожаловать в EnReady!</b>\n\n' +
          'Я помогу тебе быстро выучить английские слова и фразы на любую тему.\n\n' +
          '\u{1F4DD} Напиши тему и я создам для тебя:\n' +
          '\u25B8 <b>Карточки</b> со словами и переводом\n' +
          '\u25B8 <b>Упражнения</b> на перевод\n' +
          '\u25B8 <b>Задания</b> на подстановку слов\n\n' +
          'Нажми кнопку ниже, чтобы начать! \u{1F447}',
          {
            inline_keyboard: [[{
              text: '\u{1F680} Открыть EnReady',
              web_app: { url: env.WEBAPP_URL }
            }]]
          }
        );
      } else if (text === '/help') {
        const dailyLimit = parseInt(env.DAILY_LIMIT || '10', 10);
        await sendTelegramMessage(env, chatId,
          '\u{2753} <b>Как работает EnReady</b>\n\n' +

          '<b>Что это?</b>\n' +
          'EnReady \u2014 бот для изучения английских слов и фраз. Ты пишешь тему, а ИИ генерирует персональные учебные материалы.\n\n' +

          '<b>Что ты получишь:</b>\n' +
          '\u25B8 <b>10 карточек</b> \u2014 слово, перевод, объяснение и пример\n' +
          '\u25B8 <b>Упражнение на перевод</b> \u2014 выбери правильный перевод из вариантов\n' +
          '\u25B8 <b>Упражнение на подстановку</b> \u2014 вставь пропущенное слово в предложение\n' +
          '\u25B8 <b>Озвучка</b> \u2014 нажми на кнопку \u{1F509} на карточке, чтобы услышать произношение\n\n' +

          '<b>Уровни сложности:</b>\n' +
          'На главном экране можно выбрать уровень: A2, B1, B2 или C1. Слова подбираются по стандарту CEFR.\n\n' +

          '<b>Лимиты:</b>\n' +
          '\u25B8 ' + dailyLimit + ' генераций в день\n' +
          '\u25B8 Если лимит исчерпан \u2014 попробуй завтра\n' +
          '\u25B8 Пройденные темы сохраняются в истории и доступны без лимита\n\n' +

          '<b>Кнопка \u00ABПерегенерировать\u00BB:</b>\n' +
          'Если слова не понравились \u2014 нажми \u00ABПерегенерировать\u00BB в карточках. Бот создаст новые слова на ту же тему (старые не повторятся).\n\n' +

          '<b>Команды:</b>\n' +
          '/start \u2014 начать\n' +
          '/help \u2014 это сообщение',
          {
            inline_keyboard: [[{
              text: '\u{1F680} Открыть EnReady',
              web_app: { url: env.WEBAPP_URL }
            }]]
          }
        );
      } else if (text === '/stats') {
        const adminId = env.ADMIN_CHAT_ID;
        if (adminId && String(chatId) === String(adminId)) {
          const keys = ['bot_users', 'app_opens', 'generations_total', 'generations_success', 'generations_error'];
          const stats = {};
          for (const key of keys) {
            stats[key] = parseInt(await env.STATS.get(key) || '0', 10);
          }

          let recentText = '';
          try {
            const recent = await env.DB.prepare(
              'SELECT g.topic, g.success, g.created_at, u.username, u.first_name FROM generations g LEFT JOIN users u ON g.chat_id = u.chat_id ORDER BY g.created_at DESC LIMIT 5'
            ).all();
            if (recent.results.length > 0) {
              recentText = '\n\n\u{1F4CB} <b>Последние генерации:</b>\n';
              for (const r of recent.results) {
                const name = r.username ? '@' + r.username : (r.first_name || '?');
                const status = r.success ? '\u2705' : '\u274C';
                recentText += status + ' ' + name + ': ' + r.topic + '\n';
              }
            }
          } catch(e) {}

          let feedbackText = '';
          try {
            const avgResult = await env.DB.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM feedback').first();
            if (avgResult.count > 0) {
              const stars = '\u2B50'.repeat(Math.round(avgResult.avg));
              feedbackText = '\n\n\u{1F4AC} <b>Отзывы:</b> ' + stars + ' ' + (Math.round(avgResult.avg * 10) / 10) + '/5 (' + avgResult.count + ' шт.)';
              const recent = await env.DB.prepare(
                'SELECT f.rating, f.text, u.username, u.first_name FROM feedback f LEFT JOIN users u ON f.chat_id = u.chat_id ORDER BY f.created_at DESC LIMIT 3'
              ).all();
              for (const r of recent.results) {
                if (r.text) {
                  const name = r.username ? '@' + r.username : (r.first_name || '?');
                  feedbackText += '\n' + '\u2B50'.repeat(r.rating) + ' ' + name + ': ' + r.text;
                }
              }
            }
          } catch(e) {}

          await sendTelegramMessage(env, chatId,
            '\u{1F4CA} <b>Статистика EnReady</b>\n\n' +
            '\u{1F464} Пользователей бота: <b>' + stats.bot_users + '</b>\n' +
            '\u{1F4F1} Открытий приложения: <b>' + stats.app_opens + '</b>\n' +
            '\u{1F504} Всего генераций: <b>' + stats.generations_total + '</b>\n' +
            '\u2705 Успешных: <b>' + stats.generations_success + '</b>\n' +
            '\u274C Ошибок: <b>' + stats.generations_error + '</b>' +
            recentText +
            feedbackText
          );
        } else {
          await sendTelegramMessage(env, chatId, 'Эта команда доступна только администратору.');
        }
      } else if (text === '/reset') {
        const adminId = env.ADMIN_CHAT_ID;
        if (adminId && String(chatId) === String(adminId)) {
          const statKeys = ['bot_users', 'app_opens', 'generations_total', 'generations_success', 'generations_error'];
          for (const key of statKeys) {
            await env.STATS.put(key, '0');
          }
          let cursor = undefined;
          do {
            const list = await env.STATS.list({ prefix: 'user:', cursor });
            for (const key of list.keys) {
              await env.STATS.delete(key.name);
            }
            cursor = list.list_complete ? undefined : list.cursor;
          } while (cursor);
          try {
            await env.DB.prepare('DELETE FROM feedback').run();
            await env.DB.prepare('DELETE FROM generations').run();
            await env.DB.prepare('DELETE FROM users').run();
          } catch(e) {}
          await sendTelegramMessage(env, chatId, '\u2705 Статистика обнулена.');
        } else {
          await sendTelegramMessage(env, chatId, 'Эта команда доступна только администратору.');
        }
      } else {
        // Любой другой текст — кнопка открытия приложения
        await sendTelegramMessage(env, chatId,
          'Нажми кнопку ниже, чтобы открыть приложение! \u{1F447}',
          {
            inline_keyboard: [[{
              text: '\u{1F680} Открыть EnReady',
              web_app: { url: env.WEBAPP_URL }
            }]]
          }
        );
      }
    }

  } catch(e) {
    console.error('Webhook error:', e.message, e.stack);
  }
  return new Response('OK');
}

async function sendTelegramMessage(env, chatId, text, replyMarkup) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const resp = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error('Telegram sendMessage error:', err);
  }
}

// ===== ROUTER =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/webhook' && request.method === 'POST') {
        return handleBotWebhook(request, env);
      }
      if (path === '/setup' && request.method === 'GET') {
        const token = new URL(request.url).searchParams.get('token');
        if (token !== env.STATS_TOKEN) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
        // Регистрация команд меню бота
        const cmdResp = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/setMyCommands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: [
              { command: 'start', description: 'Запустить приложение' },
              { command: 'help', description: 'Как работает EnReady' }
            ]
          })
        });
        const cmdResult = await cmdResp.json();
        return jsonResponse({ commands: cmdResult });
      }
      if (path === '/stats' && request.method === 'GET') {
        return handleStats(request, env);
      }
      if (path === '/track' && request.method === 'POST') {
        return handleTrack(request, env);
      }
      if (path === '/feedback' && request.method === 'POST') {
        return handleFeedback(request, env);
      }
      if (request.method === 'POST') {
        return handleGenerate(request, env);
      }
      return new Response('EnReady API', { status: 200 });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};
