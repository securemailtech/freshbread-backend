const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const auth = require('../middleware/auth');

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
router.post('/', auth, contentController.update);

// @route   POST /api/content/batch
// @desc    Batch update content
// @access  Protected
router.post('/batch', auth, contentController.batchUpdate);

// @route   DELETE /api/content/:key
// @desc    Delete content
// @access  Protected
router.delete('/:key', auth, contentController.delete);

module.exports = router;
