const Statistics = require('../models/Statistics');

/**
 * STATISTICS CONTROLLER
 * Báo cáo và thống kê hệ thống
 */

/**
 * GET /api/statistics/dashboard
 * Lấy thống kê tổng quan cho dashboard
 */
async function getDashboardStats(req, res) {
    try {
        const stats = await Statistics.getDashboardStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê dashboard',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/grading-by-day
 * Lấy thống kê số khối bài đã chấm theo ngày
 */
async function getGradingByDay(req, res) {
    try {
        const { days } = req.query;
        const data = await Statistics.getGradingByDay({
            days: days ? parseInt(days) : 7
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting grading by day:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê chấm theo ngày',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/grading-by-week
 * Lấy thống kê số khối bài đã chấm theo tuần
 */
async function getGradingByWeek(req, res) {
    try {
        const { weeks } = req.query;
        const data = await Statistics.getGradingByWeek({
            weeks: weeks ? parseInt(weeks) : 4
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting grading by week:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê chấm theo tuần',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/avg-score-by-examiner
 * Lấy thống kê điểm trung bình theo giám khảo
 */
async function getAvgScoreByExaminer(req, res) {
    try {
        const { limit } = req.query;
        const data = await Statistics.getAvgScoreByExaminer({
            limit: limit ? parseInt(limit) : 10
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting avg score by examiner:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê điểm theo giám khảo',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/score-distribution-overall
 * Lấy thống kê phân bố điểm tổng thể
 */
async function getScoreDistributionOverall(req, res) {
    try {
        const data = await Statistics.getScoreDistributionOverall();

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting score distribution:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy phân bố điểm',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/grading-progress-by-subject
 * Lấy thống kê tiến độ chấm theo môn
 */
async function getGradingProgressBySubject(req, res) {
    try {
        const data = await Statistics.getGradingProgressBySubject();

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting grading progress by subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy tiến độ chấm theo môn',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/subjects
 * Lấy thống kê theo môn thi
 */
async function getSubjectStats(req, res) {
    try {
        const stats = await Statistics.getSubjectStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting subject stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê môn thi',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/examiner-performance
 * Lấy thống kê hiệu suất cán bộ chấm thi
 */
async function getExaminerPerformance(req, res) {
    try {
        const { from_date, to_date, subject_id } = req.query;

        const stats = await Statistics.getExaminerPerformance({
            from_date,
            to_date,
            subject_id: subject_id ? parseInt(subject_id) : undefined
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting examiner performance:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê hiệu suất',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/grading-progress
 * Lấy thống kê tiến độ chấm thi
 */
async function getGradingProgress(req, res) {
    try {
        const { essay_id, subject_id } = req.query;

        const progress = await Statistics.getGradingProgress({
            essay_id: essay_id ? parseInt(essay_id) : undefined,
            subject_id: subject_id ? parseInt(subject_id) : undefined
        });

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        console.error('Error getting grading progress:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy tiến độ chấm thi',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/score-distribution
 * Lấy phân bố điểm theo môn
 */
async function getScoreDistribution(req, res) {
    try {
        const { subject_id } = req.query;

        const distribution = await Statistics.getScoreDistribution({
            subject_id: subject_id ? parseInt(subject_id) : undefined
        });

        res.json({
            success: true,
            data: distribution
        });
    } catch (error) {
        console.error('Error getting score distribution:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy phân bố điểm',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/grading-comparison
 * Lấy thống kê so sánh kết quả chấm
 */
async function getGradingComparison(req, res) {
    try {
        const { subject_id, threshold } = req.query;

        const comparison = await Statistics.getGradingComparison({
            subject_id: subject_id ? parseInt(subject_id) : undefined,
            threshold: threshold ? parseFloat(threshold) : 1.0
        });

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error getting grading comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy so sánh kết quả chấm',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/mismatched-gradings
 * Lấy danh sách bài có chênh lệch điểm lớn
 */
async function getMismatchedGradings(req, res) {
    try {
        const { subject_id, threshold, limit } = req.query;

        const mismatches = await Statistics.getMismatchedGradings({
            subject_id: subject_id ? parseInt(subject_id) : undefined,
            threshold: threshold ? parseFloat(threshold) : 1.0,
            limit: limit ? parseInt(limit) : 50
        });

        res.json({
            success: true,
            data: mismatches,
            total: mismatches.length
        });
    } catch (error) {
        console.error('Error getting mismatched gradings:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách chênh lệch',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/time-based
 * Lấy thống kê theo thời gian
 */
async function getTimeBasedStats(req, res) {
    try {
        const { period, from_date, to_date, limit } = req.query;

        const stats = await Statistics.getTimeBasedStats({
            period: period || 'day',
            from_date,
            to_date,
            limit: limit ? parseInt(limit) : 30
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting time-based stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê theo thời gian',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/export-scores
 * Xuất báo cáo điểm
 */
async function exportScores(req, res) {
    try {
        const { subject_id, status, format } = req.query;

        const scores = await Statistics.exportScoreReport({
            subject_id: subject_id ? parseInt(subject_id) : undefined,
            status,
            format: format || 'json'
        });

        if (format === 'csv') {
            // Xuất CSV
            const headers = ['Mã thí sinh', 'Họ tên', 'Mã môn', 'Tên môn', 'Điểm tự luận', 'Điểm TN', 'Tổng điểm', 'Xếp loại', 'Trạng thái'];
            const csvRows = [headers.join(',')];

            scores.forEach(s => {
                csvRows.push([
                    s.candidate_code,
                    `"${s.candidate_name}"`,
                    s.subject_code,
                    `"${s.subject_name}"`,
                    s.essay_score || '',
                    s.mcq_score || '',
                    s.total_score || '',
                    s.grade || '',
                    s.status
                ].join(','));
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=scores.csv');
            return res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel UTF-8
        }

        res.json({
            success: true,
            data: scores,
            total: scores.length
        });
    } catch (error) {
        console.error('Error exporting scores:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất báo cáo điểm',
            error: error.message
        });
    }
}

/**
 * GET /api/statistics/reports
 * Lấy danh sách các loại báo cáo có sẵn
 */
async function getAvailableReports(req, res) {
    try {
        const reports = [{
                id: 'dashboard',
                name: 'Tổng quan hệ thống',
                description: 'Thống kê tổng quan về người dùng, đề thi, kết quả',
                endpoint: '/api/statistics/dashboard'
            },
            {
                id: 'subjects',
                name: 'Thống kê theo môn thi',
                description: 'Số lượng thí sinh, đề thi, điểm trung bình theo từng môn',
                endpoint: '/api/statistics/subjects'
            },
            {
                id: 'examiner-performance',
                name: 'Hiệu suất cán bộ chấm thi',
                description: 'Số bài chấm, thời gian trung bình, tỉ lệ hoàn thành',
                endpoint: '/api/statistics/examiner-performance',
                filters: ['from_date', 'to_date', 'subject_id']
            },
            {
                id: 'grading-progress',
                name: 'Tiến độ chấm thi',
                description: 'Tiến độ chấm theo từng đề thi',
                endpoint: '/api/statistics/grading-progress',
                filters: ['essay_id', 'subject_id']
            },
            {
                id: 'score-distribution',
                name: 'Phân bố điểm',
                description: 'Phân bố điểm theo xếp loại A/B/C/D/F',
                endpoint: '/api/statistics/score-distribution',
                filters: ['subject_id']
            },
            {
                id: 'grading-comparison',
                name: 'So sánh kết quả chấm',
                description: 'Tỉ lệ trùng khớp và chênh lệch giữa các vòng chấm',
                endpoint: '/api/statistics/grading-comparison',
                filters: ['subject_id', 'threshold']
            },
            {
                id: 'mismatched-gradings',
                name: 'Bài có chênh lệch điểm',
                description: 'Danh sách bài thi có chênh lệch điểm lớn giữa các vòng chấm',
                endpoint: '/api/statistics/mismatched-gradings',
                filters: ['subject_id', 'threshold', 'limit']
            },
            {
                id: 'time-based',
                name: 'Thống kê theo thời gian',
                description: 'Số bài chấm theo ngày/tuần/tháng',
                endpoint: '/api/statistics/time-based',
                filters: ['period', 'from_date', 'to_date']
            },
            {
                id: 'export-scores',
                name: 'Xuất báo cáo điểm',
                description: 'Xuất danh sách điểm ra file CSV/Excel',
                endpoint: '/api/statistics/export-scores',
                filters: ['subject_id', 'status', 'format'],
                exportable: true
            }
        ];

        res.json({
            success: true,
            data: reports
        });
    } catch (error) {
        console.error('Error getting available reports:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách báo cáo',
            error: error.message
        });
    }
}

module.exports = {
    getDashboardStats,
    getSubjectStats,
    getExaminerPerformance,
    getGradingProgress,
    getScoreDistribution,
    getGradingComparison,
    getMismatchedGradings,
    getTimeBasedStats,
    exportScores,
    getAvailableReports,
    // New endpoints for Admin Dashboard
    getGradingByDay,
    getGradingByWeek,
    getAvgScoreByExaminer,
    getScoreDistributionOverall,
    getGradingProgressBySubject
};