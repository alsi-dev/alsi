const Razorpay = require('razorpay');

const PLANS = {
  Monthly:    { amount: 39900,  days: 30  },
  '3 Months': { amount: 99900,  days: 90  },
  Yearly:     { amount: 399900, days: 365 }
};

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const { plan } = JSON.parse(event.body);

    if (!PLANS[plan]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await razorpay.orders.create({
      amount: PLANS[plan].amount,
      currency: 'INR',
      receipt: `alsi_${plan.replace(' ', '_')}_${Date.now()}`,
      notes: { plan, product: 'Alsi Pro' }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create payment order' })
    };
  }
};
