const express = require('express');
const { login, getMe, logout } = require('../controllers/authControllerMock');
const { protect } = require('../middlewares/authMock');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Đăng nhập
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Lấy thông tin user hiện tại
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/logout
// @desc    Đăng xuất
// @access  Private
router.post('/logout', protect, logout);

module.exports = router;
