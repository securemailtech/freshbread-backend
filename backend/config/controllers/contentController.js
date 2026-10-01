const db = require('../config/database');

// Get all content
exports.getAllContent = (req, res) => {
  db.all('SELECT * FROM site_content', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }

    // Convert array to object for easier access
    const content = {};
    rows.forEach(row => {
      content[row.key] = row.value;
    });

    res.json({ success: true, content });
  });
};

// Get specific content by key
exports.getContentByKey = (req, res) => {
  const { key } = req.params;

  db.get(
    'SELECT * FROM site_content WHERE key = ?',
    [key],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch content' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Content not found' });
      }

      res.json({ success: true, content: row });
    }
  );
};

// Update content
exports.updateContent = (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  db.run(
    `INSERT INTO site_content (key, value, updated_at) 
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET 
     value = excluded.value, 
     updated_at = CURRENT_TIMESTAMP`,
    [key, value],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update content' });
      }

      res.json({ 
        success: true, 
        message: 'Content updated successfully',
        key,
        value
      });
    }
  );
};

// Batch update multiple content items
exports.batchUpdateContent = (req, res) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates array is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO site_content (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET 
    value = excluded.value, 
    updated_at = CURRENT_TIMESTAMP
  `);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let hasError = false;

    updates.forEach(({ key, value }) => {
      if (key && value !== undefined) {
        stmt.run([key, value], (err) => {
          if (err) {
            console.error('Error updating content:', err);
            hasError = true;
          }
        });
      }
    });

    stmt.finalize((err) => {
      if (err || hasError) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update content' });
      }

      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to commit changes' });
        }

        res.json({ 
          success: true, 
          message: 'Content updated successfully',
          count: updates.length
        });
      });
    });
  });
};

// Delete content by key
exports.deleteContent = (req, res) => {
  const { key } = req.params;

  db.run(
    'DELETE FROM site_content WHERE key = ?',
    [key],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete content' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Content not found' });
      }

      res.json({ 
        success: true, 
        message: 'Content deleted successfully' 
      });
    }
  );
};
