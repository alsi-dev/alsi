// api/create-order.js
const Razorpay = require('razorpay');

const PLANS = {
  Monthly:    { amount: 39900,  days: 30  },
  '3 Months': { amount: 99900,  days: 90  },
  Yearly:     { amount: 399900, days: 365 }
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan } = req.body;

  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET
    });

    const order = await razorpay.orders.create({
      amount: PLANS[plan].amount,
      currency: 'INR',
      receipt: `alsi_${plan.replace(' ', '_')}_${Date.now()}`,
      notes: { plan, product: 'Alsi Pro' }
    });

    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency, plan });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
};
