const path = require('path');
const fs = require('fs');
const { getDb } = require('../models/initDb');

// @desc    Get all images
// @route   GET /api/images
exports.getAll = (req, res) => {
  const db = getDb();
  
  db.all('SELECT * FROM site_images ORDER BY updated_at DESC', (err, rows) => {
    if (err) {
      // Try alternate table name
      db.all('SELECT * FROM images ORDER BY uploaded_at DESC', (err2, rows2) => {
        if (err2) {
          return res.status(500).json({ error: 'Database error' });
        }
        return res.json({ success: true, images: rows2 || [] });
      });
      return;
    }
    
    res.json({ success: true, images: rows || [] });
  });
};

// @desc    Get image by key
// @route   GET /api/images/:key
exports.getByKey = (req, res) => {
  const db = getDb();
  const { key } = req.params;
  
  db.get('SELECT * FROM site_images WHERE key = ?', [key], (err, row) => {
    if (err) {
      db.get('SELECT * FROM images WHERE key = ?', [key], (err2, row2) => {
        if (err2) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!row2) {
          return res.status(404).json({ error: 'Image not found' });
        }
        return res.json({ success: true, image: row2 });
      });
      return;
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({ success: true, image: row });
  });
};

// @desc    Upload image
// @route   POST /api/images/upload
exports.upload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  const { key } = req.body;
  const db = getDb();
  
  const imageData = {
    key: key || 'general',
    filename: req.file.filename,
    url: `/uploads/images/${req.file.filename}`,
    originalName: req.file.originalname
  };
  
  // Try site_images table first
  db.run(
    `INSERT INTO site_images (key, filename, url, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [imageData.key, imageData.filename, imageData.url],
    function(err) {
      if (err) {
        // Try images table
        db.run(
          `INSERT INTO images (key, filename, original_name, path, uploaded_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [imageData.key, imageData.filename, imageData.originalName, imageData.url],
          function(err2) {
            if (err2) {
              return res.status(500).json({ error: 'Database error: ' + err2.message });
            }
            return res.json({
              success: true,
              image: {
                id: this.lastID,
                ...imageData
              }
            });
          }
        );
        return;
      }
      
      res.json({
        success: true,
        image: {
          id: this.lastID,
          ...imageData
        }
      });
    }
  );
};

// @desc    Delete image
// @route   DELETE /api/images/:key
exports.delete = (req, res) => {
  const db = getDb();
  const { key } = req.params;
  
  // First get the image to find the file
  db.get('SELECT * FROM site_images WHERE key = ?', [key], (err, row) => {
    if (err || !row) {
      db.get('SELECT * FROM images WHERE key = ? OR id = ?', [key, key], (err2, row2) => {
        if (err2 || !row2) {
          return res.status(404).json({ error: 'Image not found' });
        }
        deleteImageFile(row2, 'images', res, db);
      });
      return;
    }
    deleteImageFile(row, 'site_images', res, db);
  });
};

function deleteImageFile(image, tableName, res, db) {
  // Delete the actual file
  const filePath = path.join(__dirname, '..', 'uploads', 'images', image.filename);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.log('Could not delete file:', e.message);
    }
  }
  
  // Delete from database
  const idField = tableName === 'site_images' ? 'key' : 'id';
  const idValue = tableName === 'site_images' ? image.key : image.id;
  
  db.run(`DELETE FROM ${tableName} WHERE ${idField} = ?`, [idValue], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, deleted: true });
  });
}

// @desc    Update image (replace)
// @route   PUT /api/images/:key
exports.update = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  const { key } = req.params;
  const db = getDb();
  
  // First, try to delete old image
  db.get('SELECT * FROM site_images WHERE key = ?', [key], (err, oldImage) => {
    if (oldImage && oldImage.filename) {
      const oldPath = path.join(__dirname, '..', 'uploads', 'images', oldImage.filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.log('Could not delete old file:', e.message);
        }
      }
    }
    
    const imageData = {
      key: key,
      filename: req.file.filename,
      url: `/uploads/images/${req.file.filename}`
    };
    
    // Update or insert
    db.run(
      `INSERT INTO site_images (key, filename, url, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET filename = ?, url = ?, updated_at = CURRENT_TIMESTAMP`,
      [imageData.key, imageData.filename, imageData.url, imageData.filename, imageData.url],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, image: imageData });
      }
    );
  });
};
