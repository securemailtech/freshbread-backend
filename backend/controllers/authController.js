const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../models/initDb');

// @desc    Login admin user
// @route   POST /api/auth/login
exports.login = (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const db = getDb();
  
  // Check both table names (admin_users or admins)
  db.get(
    `SELECT * FROM admin_users WHERE username = ? 
     UNION 
     SELECT * FROM admins WHERE username = ?`,
    [username, username],
    (err, admin) => {
      // If union fails, try each table separately
      if (err) {
        db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err2, admin2) => {
          if (err2) {
            db.get('SELECT * FROM admins WHERE username = ?', [username], (err3, admin3) => {
              if (err3 || !admin3) {
                return res.status(401).json({ error: 'Invalid credentials' });
              }
              validateAndRespond(admin3, password, res);
            });
          } else if (admin2) {
            validateAndRespond(admin2, password, res);
          } else {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
        });
        return;
      }
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      validateAndRespond(admin, password, res);
    }
  );
};

function validateAndRespond(admin, password, res) {
  const validPassword = bcrypt.compareSync(password, admin.password);
  
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  
  res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username
    }
  });
}

// @desc    Verify JWT token
// @route   GET /api/auth/verify
exports.verify = (req, res) => {
  // If we get here, the auth middleware already verified the token
  res.json({
    valid: true,
    admin: req.admin || req.user
  });
};

// @desc    Change admin password
// @route   POST /api/auth/change-password
exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin?.id || req.user?.id;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  
  const db = getDb();
  
  // Try both table names
  db.get('SELECT * FROM admin_users WHERE id = ?', [adminId], (err, admin) => {
    if (err || !admin) {
      db.get('SELECT * FROM admins WHERE id = ?', [adminId], (err2, admin2) => {
        if (err2 || !admin2) {
          return res.status(404).json({ error: 'Admin not found' });
        }
        processPasswordChange(admin2, 'admins', currentPassword, newPassword, res, db);
      });
      return;
    }
    processPasswordChange(admin, 'admin_users', currentPassword, newPassword, res, db);
  });
};

function processPasswordChange(admin, tableName, currentPassword, newPassword, res, db) {
  const validPassword = bcrypt.compareSync(currentPassword, admin.password);
  
  if (!validPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  
  db.run(
    `UPDATE ${tableName} SET password = ? WHERE id = ?`,
    [hashedPassword, admin.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      res.json({ success: true, message: 'Password updated successfully' });
    }
  );
}
