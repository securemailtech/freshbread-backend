const express = require('express');
const router = express.Router();

// Load Stripe safely
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY is missing. Payment routes will not work until keys are added.');
}
const stripe = stripeKey ? require('stripe')(stripeKey) : null;

// Create a payment intent
router.post('/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured yet.' });

  try {
    const { amount, customerEmail, customerName, items } = req.body;

    // Validate amount (minimum $1.00 = 100 cents)
    if (!amount || amount < 100) {
      return res.status(400).json({ 
        error: 'Invalid amount. Minimum order is $1.00' 
      });
    }

    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerName: customerName || 'Guest',
        customerEmail: customerEmail || '',
        items: JSON.stringify(items || []),
        orderDate: new Date().toISOString()
      },
      receipt_email: customerEmail || undefined,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
});

// Confirm payment was successful
router.post('/confirm-payment', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured yet.' });

  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Here you could save order info to a database
      res.json({
        success: true,
        status: 'succeeded',
        message: 'Payment confirmed!'
      });
    } else {
      res.json({
        success: false,
        status: paymentIntent.status,
        message: 'Payment not yet complete'
      });
    }

  } catch (error) {
    console.error('Confirm Payment Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Stripe publishable key (safe to expose)
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  });
});

module.exports = router;
