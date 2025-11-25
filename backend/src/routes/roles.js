const express = require('express');
const {
    getRoles
} = require('../controllers/roleController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Routes - Chỉ có route lấy danh sách roles
router.get('/', authenticateToken, requireRole('admin'), getRoles);

module.exports = router;