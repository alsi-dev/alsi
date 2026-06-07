export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan } = req.body;

    const prices = { monthly: 39900, '3months': 99900, yearly: 299900 };
    const amount = prices[plan] || 39900;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
      },
      body: JSON.stringify({ amount, currency: 'INR', receipt: `receipt_${Date.now()}` })
    });

    const order = await response.json();
    return res.status(200).json(order);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
