const express = require('express');
const router = express.Router();
const gradingController = require('../controllers/gradingController');
const { verifyToken, requireRole } = require('../middlewares/auth');

/**
 * GRADING ROUTES
 * Quản lý phân công và chấm thi tự luận
 */

// ==================== PUBLIC (chỉ cần đăng nhập) ====================

// Lấy phân công của cán bộ đang đăng nhập
router.get('/my-assignments', verifyToken, gradingController.getMyAssignments);

// Nộp kết quả chấm
router.post('/results', verifyToken, gradingController.submitResult);

// ==================== ADMIN ONLY ====================

// Quản lý phân công
router.get('/assignments', verifyToken, requireRole('admin'), gradingController.getAssignments);
router.get('/assignments/:id', verifyToken, requireRole('admin'), gradingController.getAssignmentById);
router.post('/assignments', verifyToken, requireRole('admin'), gradingController.createAssignment);
router.post('/assignments/auto-assign', verifyToken, requireRole('admin'), gradingController.autoAssign);
router.put('/assignments/:id', verifyToken, requireRole('admin'), gradingController.updateAssignment);
router.delete('/assignments/:id', verifyToken, requireRole('admin'), gradingController.deleteAssignment);

// Block chờ phân công
router.get('/pending-blocks', verifyToken, requireRole('admin'), gradingController.getPendingBlocks);

// Kết quả chấm
router.get('/results', verifyToken, requireRole('admin'), gradingController.getResults);
router.put('/results/:id', verifyToken, requireRole('admin'), gradingController.updateResult);

// So sánh và phê duyệt
router.get('/compare/:blockCode', verifyToken, requireRole('admin'), gradingController.compareResults);
router.post('/assign-third-round/:blockCode', verifyToken, requireRole('admin'), gradingController.assignThirdRound);
router.post('/approve/:blockCode', verifyToken, requireRole('admin'), gradingController.approveScore);

// Thống kê
router.get('/stats', verifyToken, requireRole('admin'), gradingController.getGradingStats);

module.exports = router;