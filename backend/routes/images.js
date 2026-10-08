// ========================================
// IMAGE UPLOAD ROUTES - routes/images.js
// Bulletproof Cloudinary + Local Fallback
// ========================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { getDb, backupDatabaseToCloudinary } = require('../models/initDb');

// Import auth middleware safely
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

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configure Multer for memory storage with safe filter
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, false);
    const isImage = file.mimetype.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp|jfif|avif|heic|bmp)$/i.test(file.originalname);
    if (isImage) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Helper: Upload stream to Cloudinary
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    uploadStream.end(buffer);
  });
}

// Safe Cloudinary Database Backup trigger
async function safeBackup() {
  if (typeof backupDatabaseToCloudinary === 'function') {
    try {
      await backupDatabaseToCloudinary();
    } catch (err) {
      console.error('Backup trigger error in images.js:', err.message);
    }
  }
}

// POST /api/images/upload - Upload Image
router.post('/upload', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('Multer upload error:', multerErr);
      return res.status(400).json({ error: multerErr.message || 'File upload error' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided or unsupported file type' });
      }

      const key = req.body.key || 'general';
      let imageUrl = '';

      // 1. Try uploading to Cloudinary
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
          console.log(`📸 Attempting Cloudinary upload for key: [${key}]`);
          const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'freshhotbread',
            public_id: `${key}-${Date.now()}`,
            overwrite: true,
            resource_type: 'image'
          });
          imageUrl = result.secure_url;
          console.log(`✅ Uploaded to Cloudinary successfully: ${imageUrl}`);
        } catch (cloudErr) {
          console.error('⚠️ Cloudinary Upload Failed, switching to local fallback:', cloudErr.message || cloudErr);
        }
      }

      // 2. Fallback to Local Server Directory if Cloudinary failed or not configured
      if (!imageUrl) {
        console.log(`📸 Saving image [${key}] to local server directory...`);
        const uploadsDir = path.join(__dirname, '../uploads/images');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
        const filename = `${key}-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, req.file.buffer);
        imageUrl = `/uploads/images/${filename}`;
        console.log(`✅ Saved to local directory: ${imageUrl}`);
      }

      // 3. Save Image URL into Database
      const db = getDb();
      db.run(
        `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
        [`image_${key}`, imageUrl, imageUrl],
        async function(err) {
          if (err) {
            console.error('Database error saving image URL:', err);
            return res.status(500).json({ error: 'Failed to save image URL in database' });
          }

          res.json({
            success: true,
            url: imageUrl,
            message: 'Image uploaded successfully'
          });

          await safeBackup();
        }
      );

    } catch (error) {
      console.error('Image Upload Fatal Error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
  });
});

// GET /api/images/list - List all images
router.get('/list', authenticateToken, (req, res) => {
  const db = getDb();
  db.all(
    `SELECT key, value FROM site_content WHERE key LIKE 'image_%'`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const images = (rows || []).map(row => ({
        key: row.key.replace('image_', ''),
        url: row.value
      }));
      res.json({ images });
    }
  );
});

// GET /api/images/:key - Get image URL by key
router.get('/:key', (req, res) => {
  const db = getDb();
  const { key } = req.params;

  db.get(
    `SELECT value FROM site_content WHERE key = ?`,
    [`image_${key}`],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Image not found' });
      res.json({ url: row.value });
    }
  );
});

// DELETE /api/images/:key - Delete image by key
router.delete('/:key', authenticateToken, (req, res) => {
  const { key } = req.params;
  const db = getDb();

  db.run(
    `DELETE FROM site_content WHERE key = ?`,
    [`image_${key}`],
    async function(err) {
      if (err) return res.status(500).json({ error: 'Failed to delete image' });
      res.json({ success: true, message: 'Image deleted' });
      await safeBackup();
    }
  );
});

module.exports = router;