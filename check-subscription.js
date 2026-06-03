const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_token } = req.body;

  if (!session_token) return res.status(200).json({ is_pro: false, reason: 'No token provided' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data, error } = await supabase
    .from('subscribers')
    .select('plan, expires_at, session_token')
    .eq('session_token', session_token)
    .single();

  if (error || !data) return res.status(200).json({ is_pro: false, reason: 'Token not found' });

  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (now > expiresAt) return res.status(200).json({ is_pro: false, reason: 'Subscription expired', expired_at: data.expires_at });

  return res.status(200).json({ is_pro: true, plan: data.plan, expires_at: data.expires_at });
};
