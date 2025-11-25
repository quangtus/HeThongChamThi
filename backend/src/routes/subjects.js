const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/simpleAuth');

/**
 * SUBJECT ROUTES
 * Các route cho quản lý môn thi
 * Chỉ Admin mới được quản lý môn thi
 */

// GET /api/subjects - Lấy danh sách môn thi
router.get('/', authenticateToken, requireAdmin, subjectController.getSubjects);

// GET /api/subjects/:id - Lấy chi tiết môn thi
router.get('/:id', authenticateToken, requireAdmin, subjectController.getSubjectById);

// POST /api/subjects - Tạo môn thi mới
router.post('/', authenticateToken, requireAdmin, subjectController.createSubject);

// PUT /api/subjects/:id - Cập nhật môn thi
router.put('/:id', authenticateToken, requireAdmin, subjectController.updateSubject);

// DELETE /api/subjects/:id - Xóa môn thi
router.delete('/:id', authenticateToken, requireAdmin, subjectController.deleteSubject);

// GET /api/subjects - Lấy danh sách môn thi
router.get('/', subjectController.getSubjects);

// GET /api/subjects/:id - Lấy chi tiết môn thi
router.get('/:id', subjectController.getSubjectById);

// POST /api/subjects - Tạo môn thi mới
router.post('/', subjectController.createSubject);

// PUT /api/subjects/:id - Cập nhật môn thi
router.put('/:id', subjectController.updateSubject);

// DELETE /api/subjects/:id - Xóa môn thi (soft delete)
router.delete('/:id', subjectController.deleteSubject);

module.exports = router;