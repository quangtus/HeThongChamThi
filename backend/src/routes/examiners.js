const express = require('express');
const { body } = require('express-validator');
const {
    getExaminers,
    getExaminerById,
    createExaminer,
    updateExaminer,
    deleteExaminer,
    toggleExaminerStatus,
    addExaminerSubject,
    removeExaminerSubject,
    getExaminerSubjects,
    importExaminers
} = require('../controllers/examinerController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/simpleAuth');
const upload = require('../middlewares/upload');

const router = express.Router();

// Validation rules
const createExaminerValidation = [
    body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID phải là số nguyên dương'),
    body('examiner_code')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Mã cán bộ chấm thi phải có từ 3-20 ký tự')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Mã cán bộ chấm thi chỉ chứa chữ hoa, số và dấu gạch dưới'),
    body('specialization')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Chuyên môn không được quá 100 ký tự'),
    body('experience_years')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0, max: 50 })
    .withMessage('Số năm kinh nghiệm phải từ 0-50'),
    body('certification_level')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['JUNIOR', 'SENIOR', 'EXPERT'])
    .withMessage('Cấp độ chứng chỉ phải là JUNIOR, SENIOR hoặc EXPERT'),
    body('subjects')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .withMessage('Môn chấm phải là mảng'),
    body('subjects.*.subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Subject ID phải là số nguyên dương'),
    body('subjects.*.is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary phải là boolean'),
    body('subjects.*.qualification_level')
    .optional()
    .isIn(['BASIC', 'ADVANCED', 'EXPERT'])
    .withMessage('Cấp độ trình độ phải là BASIC, ADVANCED hoặc EXPERT')
];

const updateExaminerValidation = [
    body('examiner_code')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Mã cán bộ chấm thi phải có từ 3-20 ký tự')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Mã cán bộ chấm thi chỉ chứa chữ hoa, số và dấu gạch dưới'),
    body('specialization')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Chuyên môn không được quá 100 ký tự'),
    body('experience_years')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0, max: 50 })
    .withMessage('Số năm kinh nghiệm phải từ 0-50'),
    body('certification_level')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['JUNIOR', 'SENIOR', 'EXPERT'])
    .withMessage('Cấp độ chứng chỉ phải là JUNIOR, SENIOR hoặc EXPERT'),
    body('subjects')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .withMessage('Môn chấm phải là mảng'),
    body('subjects.*.subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Subject ID phải là số nguyên dương'),
    body('subjects.*.is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary phải là boolean'),
    body('subjects.*.qualification_level')
    .optional()
    .isIn(['BASIC', 'ADVANCED', 'EXPERT'])
    .withMessage('Cấp độ trình độ phải là BASIC, ADVANCED hoặc EXPERT')
];

const addSubjectValidation = [
    body('subject_id')
    .isInt({ min: 1 })
    .withMessage('Subject ID phải là số nguyên dương'),
    body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary phải là boolean'),
    body('qualification_level')
    .optional()
    .isIn(['BASIC', 'ADVANCED', 'EXPERT'])
    .withMessage('Cấp độ trình độ phải là BASIC, ADVANCED hoặc EXPERT')
];

// Routes - Chỉ Admin mới được quản lý examiners
router.get('/', authenticateToken, requireAdmin, getExaminers);
router.get('/:id', authenticateToken, requireAdmin, getExaminerById);
router.post('/', authenticateToken, requireAdmin, createExaminerValidation, createExaminer);
router.put('/:id', authenticateToken, requireAdmin, updateExaminerValidation, updateExaminer);
router.delete('/:id', authenticateToken, requireAdmin, deleteExaminer);
router.patch('/:id/status', authenticateToken, requireAdmin, toggleExaminerStatus);
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), importExaminers);

// Subject management routes - Chỉ Admin
router.post('/:id/subjects', authenticateToken, requireAdmin, addSubjectValidation, addExaminerSubject);
router.delete('/:id/subjects/:subject_id', authenticateToken, requireAdmin, removeExaminerSubject);
router.get('/:id/subjects', authenticateToken, requireAdmin, getExaminerSubjects);

module.exports = router;