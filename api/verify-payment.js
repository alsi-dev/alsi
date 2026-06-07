import crypto from 'crypto';

const PLANS = { monthly: 30, '3months': 90, yearly: 365 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, email } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const session_token = crypto.randomBytes(32).toString('hex');

    return res.status(200).json({ success: true, session_token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
