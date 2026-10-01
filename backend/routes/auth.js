const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login admin user
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Protected
router.get('/verify', auth, authController.verify);

// @route   POST /api/auth/change-password
// @desc    Change admin password
// @access  Protected
router.post('/change-password', auth, authController.changePassword);

module.exports = router;