// ========================================
// IMAGE UPLOAD ROUTES - routes/images.js
// With Cloudinary Integration
// ========================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { getDb } = require('../models/initDb');

// Import auth middleware
let authenticateToken;
try {
  const auth = require('../middleware/auth');
  authenticateToken = auth.authenticateToken || auth.verifyToken || auth;
} catch (e) {
  const jwt = require('jsonwebtoken');
  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET || 'freshbread-secret-key', (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  };
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper: Upload to Cloudinary
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    uploadStream.end(buffer);
  });
}

// POST /api/images/upload
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Image key is required' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    console.log(`📸 Uploading image: ${key}`);

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'freshhotbread',
      public_id: `${key}-${Date.now()}`,
      overwrite: true,
      resource_type: 'image'
    });

    console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);

    // Save URL to database
    const db = getDb();
    db.run(
      `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      [`image_${key}`, result.secure_url, result.secure_url],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save image URL' });
        }

        res.json({
          success: true,
          url: result.secure_url,
          message: 'Image uploaded successfully'
        });
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// GET /api/images/list
router.get('/list', authenticateToken, (req, res) => {
  const db = getDb();
  
  db.all(
    `SELECT key, value FROM site_content WHERE key LIKE 'image_%'`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const images = (rows || []).map(row => ({
        key: row.key.replace('image_', ''),
        url: row.value
      }));

      res.json({ images });
    }
  );
});

// GET /api/images/:key
router.get('/:key', (req, res) => {
  const db = getDb();
  const { key } = req.params;

  db.get(
    `SELECT value FROM site_content WHERE key = ?`,
    [`image_${key}`],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Image not found' });
      }
      res.json({ url: row.value });
    }
  );
});

// DELETE /api/images/:key
router.delete('/:key', authenticateToken, (req, res) => {
  const { key } = req.params;
  const db = getDb();

  db.run(
    `DELETE FROM site_content WHERE key = ?`,
    [`image_${key}`],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete image' });
      }
      res.json({ success: true, message: 'Image deleted' });
    }
  );
});

module.exports = router;