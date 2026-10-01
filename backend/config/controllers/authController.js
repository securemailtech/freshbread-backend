const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login
exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM admin_users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
          { id: user.id, username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username
          }
        });
      } catch (error) {
        console.error('Error comparing passwords:', error);
        res.status(500).json({ error: 'Server error' });
      }
    }
  );
};

// Verify token
exports.verify = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  db.get(
    'SELECT * FROM admin_users WHERE id = ?',
    [req.user.id],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      try {
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.run(
          'UPDATE admin_users SET password = ? WHERE id = ?',
          [hashedPassword, req.user.id],
          (err) => {
            if (err) {
              console.error('Error updating password:', err);
              return res.status(500).json({ error: 'Failed to update password' });
            }

            res.json({ success: true, message: 'Password updated successfully' });
          }
        );
      } catch (error) {
        console.error('Error processing password change:', error);
        res.status(500).json({ error: 'Server error' });
      }
    }
  );
};
