const express = require('express');
const router = express.Router();
const { getDb, backupDatabaseToCloudinary } = require('../models/initDb');
const authMiddleware = require('../middleware/auth');

// Helper function to create URL-friendly slug
function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Helper: Safe Cloudinary Backup Trigger
async function safeBackup() {
  if (typeof backupDatabaseToCloudinary === 'function') {
    try {
      await backupDatabaseToCloudinary();
    } catch (err) {
      console.error('⚠️ Backup trigger error:', err.message);
    }
  }
}

// ========================================
// PUBLIC ROUTES
// ========================================

// GET /api/blogs - Get all published blogs
router.get('/', (req, res) => {
  const db = getDb();
  // If admin passes status=all, show everything, else only published
  const { status } = req.query;
  const query = status === 'all' ? 'SELECT * FROM blogs ORDER BY created_at DESC' : 'SELECT * FROM blogs WHERE status = "published" ORDER BY created_at DESC';

  db.all(query, [], (err, blogs) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(blogs || []);
  });
});

// GET /api/blogs/:slug - Get single blog by slug
router.get('/:slug', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM blogs WHERE slug = ?', [req.params.slug], (err, blog) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  });
});

// ========================================
// PROTECTED ROUTES (Admin Only)
// ========================================

router.post('/', authenticateToken, (req, res) => {
  const { title, slug, excerpt, content, image_url, quick_answer, sources, status } = req.body;
  const db = getDb();
  
  db.run(
    `INSERT INTO blogs (title, slug, excerpt, content, image_url, quick_answer, sources, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, slug, excerpt, content, image_url, quick_answer, sources, status],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Blog created successfully' });
    }
  );
});

// PUT /api/blogs/:id - Update a blog
router.put('/:id', authenticateToken, (req, res) => {
  const { title, slug, excerpt, content, image_url, quick_answer, sources, status } = req.body;
  const db = getDb();
  
  db.run(
    `UPDATE blogs SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, quick_answer = ?, sources = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, slug, excerpt, content, image_url, quick_answer, sources, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Blog updated successfully' });
    }
  );
});

// DELETE /api/blogs/:id - Delete a blog
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM blogs WHERE id = ?', [req.params.id], async function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete blog' });
    if (this.changes === 0) return res.status(404).json({ error: 'Blog not found' });
    
    res.json({ success: true });
    await safeBackup();
  });
});

module.exports = router;