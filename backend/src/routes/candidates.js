const express = require('express');
const { body } = require('express-validator');
const {
    getCandidates,
    getCandidateById,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    toggleCandidateStatus,
    importCandidates,
    exportCandidates
} = require('../controllers/candidateController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/simpleAuth');
const upload = require('../middlewares/upload');

const router = express.Router();

// Validation rules
const createCandidateValidation = [
    body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID phải là số nguyên dương'),
    body('candidate_code')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Mã thí sinh phải có từ 3-20 ký tự')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Mã thí sinh chỉ chứa chữ hoa, số và dấu gạch dưới'),
    body('date_of_birth')
    .isISO8601()
    .withMessage('Ngày sinh không hợp lệ'),
    body('identity_card')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 9, max: 20 })
    .withMessage('Số CMND/CCCD phải có từ 9-20 ký tự'),
    body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được quá 500 ký tự')
];

const updateCandidateValidation = [
    body('candidate_code')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Mã thí sinh phải có từ 3-20 ký tự')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Mã thí sinh chỉ chứa chữ hoa, số và dấu gạch dưới'),
    body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Ngày sinh không hợp lệ'),
    body('identity_card')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 9, max: 20 })
    .withMessage('Số CMND/CCCD phải có từ 9-20 ký tự'),
    body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được quá 500 ký tự')
];

// Routes - Chỉ Admin mới được quản lý candidates
router.get('/', authenticateToken, requireAdmin, getCandidates);
router.get('/:id', authenticateToken, requireAdmin, getCandidateById);
router.post('/', authenticateToken, requireAdmin, createCandidateValidation, createCandidate);
router.put('/:id', authenticateToken, requireAdmin, updateCandidateValidation, updateCandidate);
router.delete('/:id', authenticateToken, requireAdmin, deleteCandidate);
router.patch('/:id/status', authenticateToken, requireAdmin, toggleCandidateStatus);
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), importCandidates);
router.get('/export', authenticateToken, requireAdmin, exportCandidates);

module.exports = router;