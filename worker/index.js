export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const { topic } = await request.json();
      if (!topic || typeof topic !== 'string' || topic.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid topic' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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
          model: env.OPENROUTER_MODEL || 'qwen/qwen3-8b:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: 'OpenRouter error', details: errText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Extract JSON from response (handle potential markdown wrapping)
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      // Remove <think>...</think> blocks (some models like Qwen add reasoning)
      jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      const result = JSON.parse(jsonStr);

      // Validate structure
      if (!result.cards || !result.sentences || !Array.isArray(result.cards) || !Array.isArray(result.sentences)) {
        return new Response(JSON.stringify({ error: 'Invalid response format from model' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
