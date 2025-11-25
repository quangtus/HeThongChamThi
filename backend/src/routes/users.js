const express = require('express');
const { body } = require('express-validator');
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    importUsers
} = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/simpleAuth');
const { query } = require('../config/db');
const upload = require('../middlewares/upload');

const router = express.Router();

// Validation rules
const createUserValidation = [
    body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username phải có từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ chứa chữ cái, số và dấu gạch dưới'),
    body('password')
    .isLength({ min: 6 })
    .withMessage('Password phải có ít nhất 6 ký tự'),
    body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải có từ 2-100 ký tự'),
    body('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
    body('role_id')
    .customSanitizer((value) => {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            throw new Error('Role ID phải là số nguyên dương');
        }
        return numValue;
    })
    .custom(async(value) => {
        try {
            const roles = await query('SELECT role_id FROM roles WHERE role_id = :role_id', { role_id: value });
            if (roles.length === 0) {
                throw new Error('Role ID không tồn tại');
            }
            return true;
        } catch (error) {
            throw new Error('Lỗi kiểm tra Role ID: ' + error.message);
        }
    })
];

const updateUserValidation = [
    body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username phải có từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ chứa chữ cái, số và dấu gạch dưới'),
    body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password phải có ít nhất 6 ký tự'),
    body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải có từ 2-100 ký tự'),
    body('email')
    .optional()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
    body('role_id')
    .optional()
    .customSanitizer((value) => {
        if (value === undefined || value === null) return value;
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            throw new Error('Role ID phải là số nguyên dương');
        }
        return numValue;
    })
    .custom(async(value) => {
        if (value === undefined || value === null) return true;
        try {
            const roles = await query('SELECT role_id FROM roles WHERE role_id = :role_id', { role_id: value });
            if (roles.length === 0) {
                throw new Error('Role ID không tồn tại');
            }
            return true;
        } catch (error) {
            throw new Error('Lỗi kiểm tra Role ID: ' + error.message);
        }
    })
];

// Routes - Chỉ Admin mới được quản lý users
router.get('/', authenticateToken, requireAdmin, getUsers);
router.get('/:id', authenticateToken, requireAdmin, getUserById);
router.post('/', authenticateToken, requireAdmin, createUserValidation, createUser);
router.put('/:id', authenticateToken, requireAdmin, updateUserValidation, updateUser);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

// POST /api/users/import - Import users từ Excel
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), importUsers);

// Get roles for dropdown - Chỉ Admin
router.get('/roles/list', authenticateToken, requireAdmin, async(req, res) => {
    try {
        const roles = await query('SELECT role_id, role_name FROM roles WHERE is_active = true ORDER BY role_name');
        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('❌ Error getting roles:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách roles',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;