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

// Helper: promisify db.run
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Helper: promisify db.get
function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper: promisify db.all
function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ==========================================
// 1. GET ALL BLOGS
// ==========================================
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status;

    let query = "SELECT * FROM blogs ORDER BY created_at DESC";
    let params = [];

    if (status && status !== 'all') {
      query = "SELECT * FROM blogs WHERE status = ? ORDER BY created_at DESC";
      params = [status];
    } else if (!status) {
      query = "SELECT * FROM blogs WHERE status = 'published' ORDER BY created_at DESC";
    }

    const rows = await allAsync(db, query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. GET SINGLE BLOG BY SLUG OR ID
// ==========================================
router.get('/:slugOrId', async (req, res) => {
  try {
    const db = getDb();
    const param = req.params.slugOrId;

    const row = await getAsync(
      db,
      "SELECT * FROM blogs WHERE slug = ? OR id = ?",
      [param, param]
    );

    if (!row) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. CREATE NEW BLOG POST
// ==========================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, slug, excerpt, content, image_url,
      quick_answer, sources, cta, status,
      meta_title, meta_description, schema_code
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and Content are required.' });
    }

    const db = getDb();

    const finalSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const result = await runAsync(
      db,
      `INSERT INTO blogs (
        title, slug, excerpt, content, image_url,
        quick_answer, sources, cta, status,
        meta_title, meta_description, schema_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

    // DB write complete hone ke BAAD hi backup
    await backupDatabaseToCloudinary();

    res.json({
      id: result.id,
      slug: finalSlug,
      message: 'Blog created successfully!'
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A blog with this title or slug already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. UPDATE EXISTING BLOG POST
// ==========================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title, slug, excerpt, content, image_url,
      quick_answer, sources, cta, status,
      meta_title, meta_description, schema_code
    } = req.body;

    const db = getDb();
    const id = req.params.id;

    const finalSlug = slug
      ? slug.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')
      : (title || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    const result = await runAsync(
      db,
      `UPDATE blogs SET
        title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?,
        quick_answer = ?, sources = ?, cta = ?, status = ?,
        meta_title = ?, meta_description = ?, schema_code = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
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
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // DB write complete hone ke BAAD hi backup
    await backupDatabaseToCloudinary();

    res.json({ message: 'Blog updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. DELETE BLOG POST
// ==========================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;

    const result = await runAsync(db, "DELETE FROM blogs WHERE id = ?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    await backupDatabaseToCloudinary();

    res.json({ message: 'Blog deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;