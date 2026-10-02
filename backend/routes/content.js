const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const auth = require('../middleware/auth');
const { backupDatabaseToCloudinary } = require('../models/initDb');

// Middleware: Trigger backup AFTER response is successfully sent
const triggerBackup = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      backupDatabaseToCloudinary();
    }
  });
  next();
};

// @route   GET /api/content
// @desc    Get all content
// @access  Public
router.get('/', contentController.getAll);

// @route   GET /api/content/:key
// @desc    Get content by key
// @access  Public
router.get('/:key', contentController.getByKey);

// @route   POST /api/content
// @desc    Update content
// @access  Protected
router.post('/', auth, triggerBackup, contentController.update);

// @route   POST /api/content/batch
// @desc    Batch update content
// @access  Protected
router.post('/batch', auth, triggerBackup, contentController.batchUpdate);

// @route   DELETE /api/content/:key
// @desc    Delete content
// @access  Protected
router.delete('/:key', auth, triggerBackup, contentController.delete);

module.exports = router;