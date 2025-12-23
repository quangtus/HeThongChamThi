import axios from './axios';

/**
 * STATISTICS API
 * API cho báo cáo và thống kê
 */

const statisticsApi = {
    // Dashboard tổng quan
    getDashboardStats: () => {
        return axios.get('/statistics/dashboard');
    },

    // Danh sách báo cáo có sẵn
    getAvailableReports: () => {
        return axios.get('/statistics/reports');
    },

    // ====== NEW: APIs for Admin Dashboard ======

    // Thống kê số khối bài chấm theo ngày
    getGradingByDay: (params = {}) => {
        return axios.get('/statistics/grading-by-day', { params });
    },

    // Thống kê số khối bài chấm theo tuần
    getGradingByWeek: (params = {}) => {
        return axios.get('/statistics/grading-by-week', { params });
    },

    // Thống kê điểm trung bình theo giám khảo
    getAvgScoreByExaminer: (params = {}) => {
        return axios.get('/statistics/avg-score-by-examiner', { params });
    },

    // Phân bố điểm tổng thể
    getScoreDistributionOverall: () => {
        return axios.get('/statistics/score-distribution-overall');
    },

    // Tiến độ chấm theo môn
    getGradingProgressBySubject: () => {
        return axios.get('/statistics/grading-progress-by-subject');
    },

    // ====== END NEW ======

    // Thống kê theo môn
    getSubjectStats: () => {
        return axios.get('/statistics/subjects');
    },

    // Hiệu suất cán bộ chấm thi
    getExaminerPerformance: (params = {}) => {
        return axios.get('/statistics/examiner-performance', { params });
    },

    // Tiến độ chấm thi
    getGradingProgress: (params = {}) => {
        return axios.get('/statistics/grading-progress', { params });
    },

    // Phân bố điểm
    getScoreDistribution: (params = {}) => {
        return axios.get('/statistics/score-distribution', { params });
    },

    // So sánh kết quả chấm
    getGradingComparison: (params = {}) => {
        return axios.get('/statistics/grading-comparison', { params });
    },

    // Bài có chênh lệch điểm
    getMismatchedGradings: (params = {}) => {
        return axios.get('/statistics/mismatched-gradings', { params });
    },

    // Thống kê theo thời gian
    getTimeBasedStats: (params = {}) => {
        return axios.get('/statistics/time-based', { params });
    },

    // Xuất báo cáo điểm
    exportScores: (params = {}) => {
        return axios.get('/statistics/export-scores', { params });
    },

    // Xuất báo cáo điểm dạng CSV
    exportScoresCSV: (params = {}) => {
        return axios.get('/statistics/export-scores', {
            params: {...params, format: 'csv' },
            responseType: 'blob'
        });
    }
};

export default statisticsApi;