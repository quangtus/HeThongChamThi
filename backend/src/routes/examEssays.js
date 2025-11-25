const express = require('express');
const router = express.Router();
const examEssayController = require('../controllers/examEssayController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/simpleAuth');

/**
 * EXAM ESSAY ROUTES
 * Các route cho quản lý đề thi tự luận và câu hỏi essay
 */

// ==================== EXAM ESSAYS ====================
// Chỉ Admin mới được quản lý đề thi tự luận

// GET /api/exam-essays - Lấy danh sách đề thi tự luận
router.get('/', authenticateToken, requireAdmin, examEssayController.getExamEssays);

// GET /api/exam-essays/:id - Lấy chi tiết đề thi tự luận (bao gồm câu hỏi)
router.get('/:id', authenticateToken, requireAdmin, examEssayController.getExamEssayById);

// POST /api/exam-essays - Tạo đề thi tự luận mới
router.post('/', authenticateToken, requireAdmin, examEssayController.createExamEssay);

// PUT /api/exam-essays/:id - Cập nhật đề thi tự luận
router.put('/:id', authenticateToken, requireAdmin, examEssayController.updateExamEssay);

// DELETE /api/exam-essays/:id - Xóa đề thi tự luận (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, examEssayController.deleteExamEssay);

// ==================== ESSAY QUESTIONS ====================
// Chỉ Admin mới được quản lý câu hỏi tự luận

// GET /api/exam-essays/:essayId/questions - Lấy danh sách câu hỏi của đề thi
router.get('/:essayId/questions', authenticateToken, requireAdmin, examEssayController.getQuestions);

// POST /api/exam-essays/:essayId/questions - Thêm câu hỏi mới
router.post('/:essayId/questions', authenticateToken, requireAdmin, examEssayController.addQuestion);

// PUT /api/exam-essays/questions/:questionId - Cập nhật câu hỏi
router.put('/questions/:questionId', authenticateToken, requireAdmin, examEssayController.updateQuestion);

// DELETE /api/exam-essays/questions/:questionId - Xóa câu hỏi
router.delete('/questions/:questionId', authenticateToken, requireAdmin, examEssayController.deleteQuestion);

module.exports = router;