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
  if (!topic || typeof topic !== 'string' || topic.length > 500) {
    return jsonResponse({ error: 'Invalid topic' }, 400);
  }

  await incrementStat(env, 'generations_total');

  const prompt = `You are an English language tutor. Generate learning materials for the topic: "${topic}".

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
- Cards should be relevant vocabulary for the given topic
- Translations must be in Russian
- Examples should be natural and contextual
- In sentences, use ___ (triple underscore) for the blank
- The "blank" field should contain the exact word/phrase to fill in
- IDs should be 1 through 10
- Return ONLY valid JSON, no other text`;

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
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success) VALUES (?, ?, 0)').bind(chat_id, topic).run(); } catch(e) {}
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
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success) VALUES (?, ?, 0)').bind(chat_id, topic).run(); } catch(e) {}
    }
    return jsonResponse({ error: 'Failed to parse model response' }, 502);
  }

  if (!result.cards || !result.sentences || !Array.isArray(result.cards) || !Array.isArray(result.sentences)) {
    await incrementStat(env, 'generations_error');
    if (chat_id) {
      try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success) VALUES (?, ?, 0)').bind(chat_id, topic).run(); } catch(e) {}
    }
    return jsonResponse({ error: 'Invalid response format from model' }, 502);
  }

  await incrementStat(env, 'generations_success');
  if (chat_id) {
    try { await env.DB.prepare('INSERT INTO generations (chat_id, topic, success) VALUES (?, ?, 1)').bind(chat_id, topic).run(); } catch(e) {}
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

// ===== STATS ENDPOINT =====
async function handleStats(request, env) {
  const token = new URL(request.url).searchParams.get('token');
  if (token !== env.STATS_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // KV stats
  const kvKeys = ['app_opens', 'generations_total', 'generations_success', 'generations_error'];
  const stats = {};
  for (const key of kvKeys) {
    stats[key] = parseInt(await env.STATS.get(key) || '0', 10);
  }

  // D1 data
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
  } catch(e) {
    stats.db_error = e.message;
  }

  return jsonResponse(stats);
}

// ===== TELEGRAM BOT WEBHOOK =====
async function handleBotWebhook(request, env) {
  try {
  const update = await request.json();

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const from = update.message.from || {};

    if (text === '/start') {
      // Сохраняем/обновляем пользователя в D1
      try {
        await env.DB.prepare(
          'INSERT INTO users (chat_id, username, first_name) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name'
        ).bind(chatId, from.username || null, from.first_name || null).run();
      } catch(e) {
        console.error('DB user insert error:', e.message);
      }

      // KV unique counter
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
    } else if (text === '/stats') {
      const adminId = env.ADMIN_CHAT_ID;
      if (adminId && String(chatId) === String(adminId)) {
        const keys = ['bot_users', 'app_opens', 'generations_total', 'generations_success', 'generations_error'];
        const stats = {};
        for (const key of keys) {
          stats[key] = parseInt(await env.STATS.get(key) || '0', 10);
        }

        // Последние генерации из D1
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

        await sendTelegramMessage(env, chatId,
          '\u{1F4CA} <b>Статистика EnReady</b>\n\n' +
          '\u{1F464} Пользователей бота: <b>' + stats.bot_users + '</b>\n' +
          '\u{1F4F1} Открытий приложения: <b>' + stats.app_opens + '</b>\n' +
          '\u{1F504} Всего генераций: <b>' + stats.generations_total + '</b>\n' +
          '\u2705 Успешных: <b>' + stats.generations_success + '</b>\n' +
          '\u274C Ошибок: <b>' + stats.generations_error + '</b>' +
          recentText
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
        // Очищаем D1
        try {
          await env.DB.prepare('DELETE FROM generations').run();
          await env.DB.prepare('DELETE FROM users').run();
        } catch(e) {}
        await sendTelegramMessage(env, chatId, '\u2705 Статистика обнулена.');
      } else {
        await sendTelegramMessage(env, chatId, 'Эта команда доступна только администратору.');
      }
    } else {
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
      if (path === '/stats' && request.method === 'GET') {
        return handleStats(request, env);
      }
      if (path === '/track' && request.method === 'POST') {
        return handleTrack(request, env);
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
