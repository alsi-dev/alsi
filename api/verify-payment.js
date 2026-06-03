const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const PLANS = { Monthly: 30, '3 Months': 90, Yearly: 365 };

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, email } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan)
    return res.status(400).json({ error: 'Missing required payment fields' });

  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET).update(body).digest('hex');

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const days = PLANS[plan];
  const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const session_token = crypto.randomBytes(32).toString('hex');

  const { error: dbError } = await supabase.from('subscribers').insert({
    email: email || null, payment_id: razorpay_payment_id,
    order_id: razorpay_order_id, plan, expires_at,
    session_token, created_at: new Date().toISOString()
  });

  if (dbError) return res.status(500).json({ error: 'Failed to save subscription record' });

  return res.status(200).json({ success: true, session_token, plan, expires_at });
};
