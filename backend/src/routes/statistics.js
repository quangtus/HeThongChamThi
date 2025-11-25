const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { verifyToken, requireRole } = require('../middlewares/auth');

/**
 * STATISTICS ROUTES
 * Báo cáo và thống kê hệ thống
 */

// Tất cả routes đều yêu cầu đăng nhập với role admin
router.use(verifyToken);
router.use(requireRole('admin'));

// Dashboard tổng quan
router.get('/dashboard', statisticsController.getDashboardStats);

// Danh sách báo cáo có sẵn
router.get('/reports', statisticsController.getAvailableReports);

// Thống kê theo môn
router.get('/subjects', statisticsController.getSubjectStats);

// Hiệu suất cán bộ chấm thi
router.get('/examiner-performance', statisticsController.getExaminerPerformance);

// Tiến độ chấm thi
router.get('/grading-progress', statisticsController.getGradingProgress);

// Phân bố điểm
router.get('/score-distribution', statisticsController.getScoreDistribution);

// So sánh kết quả chấm
router.get('/grading-comparison', statisticsController.getGradingComparison);

// Bài có chênh lệch điểm
router.get('/mismatched-gradings', statisticsController.getMismatchedGradings);

// Thống kê theo thời gian
router.get('/time-based', statisticsController.getTimeBasedStats);

// Xuất báo cáo điểm
router.get('/export-scores', statisticsController.exportScores);

module.exports = router;