const express = require('express');
const { body } = require('express-validator');
const { login, getMe, logout, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Validation rules cho login
const loginValidation = [
    body('username')
    .trim()
    .notEmpty()
    .withMessage('Tên đăng nhập là bắt buộc')
    .isLength({ min: 3, max: 50 })
    .withMessage('Tên đăng nhập phải có từ 3-50 ký tự'),
    body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
];

// Routes
router.post('/login', loginValidation, login);
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;