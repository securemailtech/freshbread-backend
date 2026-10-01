const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { getDb } = require('../models/initDb');
const authMiddleware = require('../middleware/auth');

// ========================================
// ORDER NOTIFICATION SYSTEM
// ========================================

// Email transporter (Gmail)
let transporter = null;

// Initialize email transporter
function initializeEmail() {
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASS
        }
      });
      console.log('✅ Email notifications enabled');
    } catch (error) {
      console.log('⚠️ Email setup failed:', error.message);
    }
  } else {
    console.log('⚠️ Email not configured - add EMAIL_USER and EMAIL_APP_PASS to .env');
  }
}

// Initialize on module load
initializeEmail();

// Helper: Get current time in Pacific timezone
function getPacificTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
}

// Helper: Get Pacific date string (YYYY-MM-DD)
function getPacificDateString() {
  const now = new Date();
  const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacific.toISOString().split('T')[0];
}

// ========================================
// PUBLIC ROUTES
// ========================================

// POST /api/orders - Create new order (public)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, items, total, notes } = req.body;

    // Validate required fields
    if (!customerName || !customerPhone || !items || !total) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, phone, items, and total are required' 
      });
    }

    const db = getDb();
    const pacificTime = getPacificTime();

    // Save order to database
    db.run(
      `INSERT INTO orders (customer_name, customer_phone, customer_email, items, total, notes, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [customerName, customerPhone, customerEmail || '', items, total, notes || '', pacificTime],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save order' });
        }

        const orderId = this.lastID;

        // Logging
        console.log(`\n📦 ════════════════════════════════════`);
        console.log(`   NEW ORDER #${orderId}`);
        console.log('════════════════════════════════════');
        console.log(`   Customer: ${customerName}`);
        console.log(`   Phone: ${customerPhone}`);
        console.log(`   Items: ${items}`);
        console.log(`   Total: $${parseFloat(total).toFixed(2)}`);
        console.log(`   Time: ${pacificTime}`);
        console.log('════════════════════════════════════\n');

        // 1️⃣ RESPOND IMMEDIATELY
        res.json({
          success: true,
          message: 'Order placed successfully! We will contact you shortly.',
          orderId
        });

        // 2️⃣ SEND EMAIL IN BACKGROUND (non-blocking)
        if (transporter && (process.env.OWNER_EMAIL || process.env.EMAIL_USER)) {
          setImmediate(async () => {
            try {
              await sendOrderEmail({
                id: orderId,
                customerName,
                customerPhone,
                customerEmail: customerEmail || 'Not provided',
                items,
                total,
                notes
              });
              console.log('✅ Email notification sent to owner');
            } catch (emailError) {
              console.log('⚠️ Email failed (order still saved):', emailError.message);
            }
          });
        } else {
          console.log('⚠️ Email skipped: OWNER_EMAIL or EMAIL_USER not set');
        }
      }
    );

  } catch (error) {
    console.error('Order Error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ========================================
// PROTECTED ROUTES (Admin Only)
// ========================================

// GET /api/orders - Get all orders
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, limit = 50 } = req.query;

  let query = 'SELECT * FROM orders';
  let params = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, orders) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(orders || []);
  });
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const todayDate = getPacificDateString();

  db.get('SELECT value FROM site_content WHERE key = ?', ['manual_revenue'], (err, manualRow) => {
    const manualRevenue = manualRow ? parseFloat(manualRow.value) || 0 : 0;

    db.get(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN date(created_at) = ? THEN 1 ELSE 0 END) as today_orders,
        COALESCE(SUM(CASE WHEN date(created_at) = ? THEN total ELSE 0 END), 0) as today_revenue
      FROM orders
    `, [todayDate, todayDate], (err, stats) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const result = stats || {
        total_orders: 0,
        total_revenue: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        today_orders: 0,
        today_revenue: 0
      };

      result.total_revenue = (parseFloat(result.total_revenue) || 0) + manualRevenue;
      result.manual_revenue = manualRevenue;

      res.json(result);
    });
  });
});

// POST /api/orders/adjust-revenue - Add/adjust manual revenue
router.post('/adjust-revenue', authMiddleware, (req, res) => {
  const { amount, action } = req.body; // action: 'add', 'set', 'reset'
  const db = getDb();

  if (amount === undefined && action !== 'reset') {
    return res.status(400).json({ error: 'Amount is required' });
  }

  if (action === 'reset') {
    db.run(
      `INSERT INTO site_content (key, value, updated_at) VALUES ('manual_revenue', '0', CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = '0', updated_at = CURRENT_TIMESTAMP`,
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, manual_revenue: 0 });
      }
    );
  } else if (action === 'set') {
    db.run(
      `INSERT INTO site_content (key, value, updated_at) VALUES ('manual_revenue', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [amount.toString(), amount.toString()],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, manual_revenue: amount });
      }
    );
  } else {
    db.get('SELECT value FROM site_content WHERE key = ?', ['manual_revenue'], (err, row) => {
      const currentManual = row ? parseFloat(row.value) || 0 : 0;
      const newManual = currentManual + parseFloat(amount);

      db.run(
        `INSERT INTO site_content (key, value, updated_at) VALUES ('manual_revenue', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
        [newManual.toString(), newManual.toString()],
        function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, manual_revenue: newManual });
        }
      );
    });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();

  db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });
});

// PUT /api/orders/:id - Update order status
router.put('/:id', authMiddleware, (req, res) => {
  const { status, notes } = req.body;
  const { id } = req.params;
  const db = getDb();

  let updates = ['updated_at = ?'];
  let params = [getPacificTime()];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

  params.push(id);
  const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
    console.log(`📝 Order #${id} updated to: ${status || 'no status change'}`);
    res.json({ success: true, id, status, notes });
  });
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();

  db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
    console.log(`🗑️ Order #${req.params.id} deleted`);
    res.json({ success: true });
  });
});

// ========================================
// EMAIL FUNCTION
// ========================================

async function sendOrderEmail(order) {
  if (!transporter) throw new Error('Email not configured');

  const ownerEmail = process.env.OWNER_EMAIL || process.env.EMAIL_USER;
  const pacificTime = getPacificTime();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #960909, #6B0707); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header .order-id { opacity: 0.9; font-size: 14px; margin-top: 8px; }
        .content { padding: 24px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 12px; font-weight: bold; color: #960909; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 2px solid #FDF6E8; padding-bottom: 8px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #666; }
        .info-value { font-weight: 600; color: #333; text-align: right; }
        .total-row { background: #FDF6E8; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .total-label { font-size: 18px; font-weight: bold; color: #333; }
        .total-value { font-size: 28px; font-weight: bold; color: #960909; }
        .cta { background: #960909; color: white !important; text-decoration: none; display: block; text-align: center; padding: 16px; border-radius: 8px; font-weight: bold; margin-top: 20px; }
        .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; background: #f9f9f9; }
        .notes { background: #fff3cd; padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 14px; }
        .notes strong { color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍞 New Order!</h1>
          <div class="order-id">Order #${order.id}</div>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">Customer Information</div>
            <div class="info-row"><span class="info-label">Name</span><span class="info-value">${order.customerName}</span></div>
            <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${order.customerPhone}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${order.customerEmail}</span></div>
          </div>
          <div class="section">
            <div class="section-title">Order Details</div>
            <div class="info-row"><span class="info-label">Items</span><span class="info-value">${order.items}</span></div>
            ${order.notes ? `<div class="notes"><strong>📝 Customer Notes:</strong><br>${order.notes}</div>` : ''}
          </div>
          <div class="total-row">
            <span class="total-label">Total</span>
            <span class="total-value">$${parseFloat(order.total).toFixed(2)}</span>
          </div>
          <a href="tel:${order.customerPhone.replace(/[^0-9]/g, '')}" class="cta">📞 Call Customer Now</a>
        </div>
        <div class="footer">
          Fresh Hot Bread All Day • Stockton, CA<br>
          <small>Order received at ${pacificTime}</small>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
🍞 NEW ORDER #${order.id}
═══════════════════════════

CUSTOMER INFORMATION
• Name: ${order.customerName}
• Phone: ${order.customerPhone}
• Email: ${order.customerEmail}

ORDER DETAILS
• Items: ${order.items}
• Total: $${parseFloat(order.total).toFixed(2)}
${order.notes ? `\n📝 Notes: ${order.notes}` : ''}

═══════════════════════════
📞 Call the customer to confirm pickup!

Fresh Hot Bread All Day
Stockton, CA
Time: ${pacificTime}
  `;

  await transporter.sendMail({
    from: `"Fresh Hot Bread 🍞" <${process.env.EMAIL_USER}>`,
    to: ownerEmail,
    subject: `🍞 New Order #${order.id} - $${parseFloat(order.total).toFixed(2)} - ${order.customerName}`,
    text: textContent,
    html: htmlContent
  });
}

module.exports = router;
