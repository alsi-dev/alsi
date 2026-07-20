import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CACHE_HOURS = 6;

function needsSearch(messages) {
  const lastMessage = messages[messages.length - 1]?.content;
  const lastText = typeof lastMessage === 'string' ? lastMessage : '';
  const triggers = [
    'date', 'when is', 'current', 'today', 'latest', 'price of',
    'who is', 'how many', 'news', 'score', 'weather', 'exchange rate',
    'amavasya', 'purnima', 'ekadashi', 'tithi', 'panchang', 'holiday',
    'kab hai', 'aaj', 'abhi'
  ];
  const lower = lastText.toLowerCase();
  return triggers.some(t => lower.includes(t));
}

async function getCachedSearch(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from('search_cache')
    .select('*')
    .eq('query', normalizedQuery)
    .single();

  if (error || !data) return null;

  const ageHours = (Date.now() - new Date(data.created_at).getTime()) / 3600000;
  if (ageHours > CACHE_HOURS) return null;

  return data.results;
}

async function saveCachedSearch(query, results) {
  const normalizedQuery = query.trim().toLowerCase();
  await supabase
    .from('search_cache')
    .upsert(
      { query: normalizedQuery, results, created_at: new Date().toISOString() },
      { onConflict: 'query' }
    );
}

async function searchWeb(query) {
  const cached = await getCachedSearch(query);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`,
      { headers: { 'X-API-Key': process.env.TINYFISH_API_KEY } }
    );
    if (!res.ok) throw new Error(`TinyFish error: ${res.status}`);
    const data = await res.json();

    await saveCachedSearch(query, data);
    return data;
  } catch (err) {
    console.error('Search failed:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, system } = req.body;
    let systemContent = system;

    if (needsSearch(messages)) {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const searchData = await searchWeb(lastMessage);

      if (searchData?.results?.length) {
        const snippet = searchData.results
          .slice(0, 3)
          .map(r => `- ${r.title}: ${r.snippet}`)
          .join('\n');

        systemContent += `\n\nUse this real-time web info to answer accurately. If it doesn't fully answer, say so instead of guessing:\n${snippet}`;
      } else {
        systemContent += `\n\nIf you're not 100% certain of a specific date, fact, or number, say "I'm not certain, please verify" instead of guessing.`;
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: (() => {
  const hasImage = messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some(part => part.type === 'image_url')
  );
  return hasImage ? 'qwen/qwen3.6-27b' : 'llama-3.3-70b-versatile';
})(),
        messages: [
          { role: 'system', content: systemContent },
          ...messages
        ],
        max_tokens: 1024
      })
    });

    const data = await response.json();
    return res.status(200).json({ content: data.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
