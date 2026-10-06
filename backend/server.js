const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { initializeDatabase } = require('./models/initDb');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Render / cloud proxy ke peeche hone ke liye (local pe koi effect nahi)
app.set('trust proxy', 1);

// Middleware - CORS (local + production dono ke liye safe)
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://freshhotbreadallday.com',       
  'https://www.freshhotbreadallday.com',   
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Postman / mobile / same-origin requests allow
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }

    console.warn('Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files - FIXED!
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Import routes
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const imageRoutes = require('./routes/images');
const orderRoutes = require('./routes/orders');

// Check if payments route exists
let paymentRoutes;
try {
  paymentRoutes = require('./routes/payments');
} catch (e) {
  console.log('⚠️ Payments route not found - skipping');
}

// Use API routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/orders', orderRoutes);

if (paymentRoutes) {
  app.use('/api/payments', paymentRoutes);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fresh Bread API is running',
    timestamp: new Date().toISOString(),
    features: {
      orders: true,
      emailNotifications: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASS)
    }
  });
});

// -----------------------
// Serve Admin Dashboard
// -----------------------
app.use('/admin', express.static(path.join(__dirname, 'admin-dashboard')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard', 'index.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard', 'dashboard.html'));
});

// -----------------------
// Serve Main Site
// -----------------------
app.use(express.static(path.join(__dirname, 'site')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// -----------------------
// 404 Handler (Custom HTML 404 Page for WooRank + JSON for API)
// -----------------------
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Page Not Found | Fresh Hot Bread</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 60px 20px; background-color: #FFFEF9; color: #2C2C2C; }
          h1 { font-size: 72px; color: #960909; margin: 0; }
          h2 { font-size: 24px; margin-top: 10px; color: #2C2C2C; }
          p { color: #666; font-size: 16px; margin-bottom: 30px; }
          a { display: inline-block; background-color: #960909; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          a:hover { background-color: #6B0707; }
        </style>
      </head>
      <body>
        <h1>404</h1>
        <h2>Oops! Page Not Found</h2>
        <p>The page you are looking for might have been removed or is temporarily unavailable.</p>
        <a href="/">Back to Homepage</a>
      </body>
      </html>
    `);
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// -----------------------
// Error Handler
// -----------------------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// -----------------------
// Initialize Database & Start Server
// -----------------------
const PORT = process.env.PORT || 5000;

initializeDatabase()
  .then(() => {
    // '0.0.0.0' = local + Render dono pe safe
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🍞 ═══════════════════════════════════════');
      console.log('   FRESH HOT BREAD - FULL STACK');
      console.log('═══════════════════════════════════════');
      console.log(`🌐 Website:         http://localhost:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
      console.log(`📡 API:             http://localhost:${PORT}/api`);
      console.log(`🔧 Environment:     ${process.env.NODE_ENV || 'development'}`);
      console.log('═══════════════════════════════════════');
      console.log('');
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;