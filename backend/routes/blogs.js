const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb, backupDatabaseToCloudinary } = require('../models/initDb');

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'freshbread_secret_key_2025';

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// 1. GET ALL BLOGS
// ==========================================
router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status;

  let query = "SELECT * FROM blogs ORDER BY created_at DESC";
  let params = [];

  if (status && status !== 'all') {
    query = "SELECT * FROM blogs WHERE status = ? ORDER BY created_at DESC";
    params = [status];
  } else if (!status) {
    // Default public view: only published blogs
    query = "SELECT * FROM blogs WHERE status = 'published' ORDER BY created_at DESC";
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// ==========================================
// 2. GET SINGLE BLOG BY SLUG OR ID
// ==========================================
router.get('/:slugOrId', (req, res) => {
  const db = getDb();
  const param = req.params.slugOrId;

  const query = "SELECT * FROM blogs WHERE slug = ? OR id = ?";
  db.get(query, [param, param], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(row);
  });
});

// ==========================================
// 3. CREATE NEW BLOG POST
// ==========================================
router.post('/', authenticateToken, (req, res) => {
  const { title, slug, excerpt, content, image_url, quick_answer, sources, cta, status, meta_title, meta_description, schema_code } = req.body;
  const db = getDb();

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and Content are required.' });
  }

  const finalSlug = (slug || title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // EXACTLY 12 COLUMNS & EXACTLY 12 PLACEHOLDERS (?)
  const query = `
    INSERT INTO blogs (title, slug, excerpt, content, image_url, quick_answer, sources, cta, status, meta_title, meta_description, schema_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    finalSlug,
    excerpt || '',
    content,
    image_url || '',
    quick_answer || '',
    sources || '',
    cta || '',
    status || 'published',
    meta_title || '', 
    meta_description || '', 
    schema_code || ''
  ];

  db.run(query, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A blog with this title or slug already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }

    if (typeof backupDatabaseToCloudinary === 'function') {
      backupDatabaseToCloudinary();
    }

    res.json({
      id: this.lastID,
      slug: finalSlug,
      message: 'Blog created successfully!'
    });
  });
});

// ==========================================
// 4. UPDATE EXISTING BLOG POST
// ==========================================
router.put('/:id', authenticateToken, (req, res) => {
  const { title, slug, excerpt, content, image_url, quick_answer, sources, cta, status } = req.body;
  const db = getDb();
  const id = req.params.id;

  const finalSlug = slug
    ? slug.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')
    : title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

  const query = `
    UPDATE blogs 
    SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, quick_answer = ?, sources = ?, cta = ?, status = ?, meta_title = ?, meta_description = ?, schema_code = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params = [
    title,
    finalSlug,
    excerpt || '',
    content,
    image_url || '',
    quick_answer || '',
    sources || '',
    cta || '',
    status || 'published',
    meta_title || '', 
    meta_description || '', 
    schema_code || '',
    id
  ];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (typeof backupDatabaseToCloudinary === 'function') {
      backupDatabaseToCloudinary();
    }

    res.json({ message: 'Blog updated successfully!' });
  });
});

// ==========================================
// 5. DELETE BLOG POST
// ==========================================
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const id = req.params.id;

  db.run("DELETE FROM blogs WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (typeof backupDatabaseToCloudinary === 'function') {
      backupDatabaseToCloudinary();
    }

    res.json({ message: 'Blog deleted successfully!' });
  });
});

module.exports = router;