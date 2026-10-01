const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Get all images
exports.getAllImages = (req, res) => {
  db.all('SELECT * FROM site_images', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }

    res.json({ success: true, images: rows });
  });
};

// Get specific image by key
exports.getImageByKey = (req, res) => {
  const { key } = req.params;

  db.get(
    'SELECT * FROM site_images WHERE key = ?',
    [key],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch image' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Image not found' });
      }

      res.json({ success: true, image: row });
    }
  );
};

// Upload/update image
exports.uploadImage = (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Image key is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const filename = req.file.filename;
  const url = `/uploads/images/${filename}`;

  // Check if image with this key already exists
  db.get('SELECT * FROM site_images WHERE key = ?', [key], (err, existingImage) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Delete old image file if exists
    if (existingImage && existingImage.filename) {
      const oldFilePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || './uploads/images', existingImage.filename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
      }
    }

    // Insert or update image record
    db.run(
      `INSERT INTO site_images (key, filename, url, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET 
       filename = excluded.filename,
       url = excluded.url,
       updated_at = CURRENT_TIMESTAMP`,
      [key, filename, url],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save image' });
        }

        res.json({ 
          success: true, 
          message: 'Image uploaded successfully',
          image: { key, filename, url }
        });
      }
    );
  });
};

// Delete image
exports.deleteImage = (req, res) => {
  const { key } = req.params;

  db.get('SELECT * FROM site_images WHERE key = ?', [key], (err, image) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || './uploads/images', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting image file:', err);
      });
    }

    // Delete from database
    db.run('DELETE FROM site_images WHERE key = ?', [key], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete image' });
      }

      res.json({ 
        success: true, 
        message: 'Image deleted successfully' 
      });
    });
  });
};
