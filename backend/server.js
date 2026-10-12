const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { initializeDatabase, getDb } = require('./models/initDb');
const blogRoutes = require('./routes/blogs');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    console.warn('Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const imageRoutes = require('./routes/images');
const orderRoutes = require('./routes/orders');

let paymentRoutes;
try {
  paymentRoutes = require('./routes/payments');
} catch (e) {
  console.log('⚠️ Payments route not found - skipping');
}

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/blogs', blogRoutes); 

if (paymentRoutes) {
  app.use('/api/payments', paymentRoutes);
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fresh Bread API is running',
    timestamp: new Date().toISOString()
  });
});

// Admin Routes
app.use('/admin', express.static(path.join(__dirname, 'admin-dashboard')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard', 'index.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard', 'dashboard.html'));
});

// 404 Route
app.get(['/404', '/404.html'], (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'site', '404.html'));
});

// Serve Main Site Static Files
app.use(express.static(path.join(__dirname, 'site')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ==========================================
// CLEAN BLOG URL + SERVER SIDE META INJECTION
// ==========================================
app.get('/blog/:slug', async (req, res) => {
  try {
    const db = getDb();
    const slug = req.params.slug;

    db.get("SELECT * FROM blogs WHERE slug = ? AND status = 'published'", [slug], (err, blog) => {
      if (err || !blog) {
        return res.status(404).sendFile(path.join(__dirname, 'site', '404.html'));
      }

      const filePath = path.join(__dirname, 'site', 'post.html');
      if (!fs.existsSync(filePath)) {
        return res.status(500).send('post.html file not found');
      }

      let html = fs.readFileSync(filePath, 'utf8');

      // 1. Meta Title Logic
      const metaTitle = (blog.meta_title && blog.meta_title.trim() !== '') 
        ? blog.meta_title.trim() 
        : `${blog.title} | Fresh Hot Bread`;
      
      // 2. Meta Description Logic
      const metaDesc = (blog.meta_description && blog.meta_description.trim() !== '') 
        ? blog.meta_description.trim() 
        : (blog.excerpt || blog.title || 'Fresh Hot Bread All Day');

      // Replace Title
      html = html.replace(/<title[^>]*>.*?<\/title>/i, `<title>${metaTitle}</title>`);

      // Replace Meta Description Tag
      html = html.replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" id="post-meta-desc" content="${metaDesc.replace(/"/g, '&quot;')}">`
      );

      // Head Tags & Schema
      let headInject = `
  <meta property="og:title" content="${metaTitle.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${metaDesc.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  ${blog.image_url ? `<meta property="og:image" content="${blog.image_url}">` : ''}
  <meta property="og:url" content="https://freshhotbreadallday.com/blog/${blog.slug}">
`;

      if (blog.schema_code && blog.schema_code.trim() !== '') {
        let cleanSchema = blog.schema_code
          .replace(/<script[^>]*>/gi, '')
          .replace(/<\/script>/gi, '')
          .trim();
        
        if (cleanSchema) {
          headInject += `\n<script type="application/ld+json">\n${cleanSchema}\n</script>`;
        }
      }

      html = html.replace('</head>', `${headInject}\n</head>`);
      html = html.replace('<body>', `<body>\n<script>window.__BLOG_SLUG__ = "${blog.slug}";</script>`);

      res.send(html);
    });
  } catch (error) {
    console.error('Blog Route Error:', error);
    res.status(500).send('Server error');
  }
});

// Purane URL ko 301 Redirect
app.get('/post.html', (req, res) => {
  const slug = req.query.slug;
  if (slug) {
    return res.redirect(301, `/blog/${slug}`);
  }
  res.redirect('/blog');
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'site', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🍞 ═══════════════════════════════════════');
      console.log('   FRESH HOT BREAD - FULL STACK');
      console.log('═══════════════════════════════════════');
      console.log(`🌐 Website:         http://localhost:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
      console.log(`📡 API:             http://localhost:${PORT}/api`);
      console.log('═══════════════════════════════════════');
      console.log('');
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;