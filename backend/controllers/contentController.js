const { getDb } = require('../models/initDb');

// @desc    Get all content
// @route   GET /api/content
exports.getAll = (req, res) => {
  const db = getDb();
  
  db.all('SELECT key, value FROM site_content', (err, rows) => {
    if (err) {
      // Try alternate table name
      db.all('SELECT key, value FROM content', (err2, rows2) => {
        if (err2) {
          return res.status(500).json({ error: 'Database error' });
        }
        const content = {};
        (rows2 || []).forEach(row => {
          content[row.key] = row.value;
        });
        return res.json({ success: true, content });
      });
      return;
    }
    
    const content = {};
    (rows || []).forEach(row => {
      content[row.key] = row.value;
    });
    
    res.json({ success: true, content });
  });
};

// @desc    Get single content by key
// @route   GET /api/content/:key
exports.getByKey = (req, res) => {
  const db = getDb();
  const { key } = req.params;
  
  db.get('SELECT value FROM site_content WHERE key = ?', [key], (err, row) => {
    if (err) {
      db.get('SELECT value FROM content WHERE key = ?', [key], (err2, row2) => {
        if (err2) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!row2) {
          return res.status(404).json({ error: 'Content not found' });
        }
        return res.json({ success: true, key, value: row2.value });
      });
      return;
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ success: true, key, value: row.value });
  });
};

// @desc    Update content
// @route   POST /api/content
exports.update = (req, res) => {
  const { key, value } = req.body;
  
  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }
  
  const db = getDb();
  
  // Try site_content table first
  db.run(
    `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, value, value],
    function(err) {
      if (err) {
        // Try content table
        db.run(
          `INSERT INTO content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
          [key, value, value],
          function(err2) {
            if (err2) {
              return res.status(500).json({ error: 'Database error' });
            }
            return res.json({ success: true, key, value });
          }
        );
        return;
      }
      res.json({ success: true, key, value });
    }
  );
};

// @desc    Batch update content
// @route   POST /api/content/batch
exports.batchUpdate = (req, res) => {
  const { updates } = req.body;
  
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Updates object is required' });
  }
  
  const db = getDb();
  const keys = Object.keys(updates);
  let completed = 0;
  let errors = [];
  
  if (keys.length === 0) {
    return res.json({ success: true, updated: 0 });
  }
  
  keys.forEach(key => {
    const value = updates[key];
    
    db.run(
      `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [key, value, value],
      function(err) {
        if (err) {
          // Try alternate table
          db.run(
            `INSERT INTO content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
            [key, value, value],
            function(err2) {
              completed++;
              if (err2) errors.push({ key, error: err2.message });
              checkComplete();
            }
          );
        } else {
          completed++;
          checkComplete();
        }
      }
    );
  });
  
  function checkComplete() {
    if (completed === keys.length) {
      if (errors.length > 0) {
        res.status(207).json({ success: true, updated: keys.length - errors.length, errors });
      } else {
        res.json({ success: true, updated: keys.length });
      }
    }
  }
};

// @desc    Delete content
// @route   DELETE /api/content/:key
exports.delete = (req, res) => {
  const db = getDb();
  const { key } = req.params;
  
  db.run('DELETE FROM site_content WHERE key = ?', [key], function(err) {
    if (err) {
      db.run('DELETE FROM content WHERE key = ?', [key], function(err2) {
        if (err2) {
          return res.status(500).json({ error: 'Database error' });
        }
        return res.json({ success: true, deleted: this.changes > 0 });
      });
      return;
    }
    res.json({ success: true, deleted: this.changes > 0 });
  });
};
