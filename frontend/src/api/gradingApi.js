import axios from './axios';

/**
 * GRADING API
 * API cho phân công và chấm thi tự luận
 */

const gradingApi = {
    // ==================== ASSIGNMENTS ====================

    // Lấy danh sách phân công (admin)
    getAssignments: (params = {}) => {
        return axios.get('/grading/assignments', { params });
    },

    // Lấy chi tiết phân công
    getAssignmentById: (id) => {
        return axios.get(`/grading/assignments/${id}`);
    },

    // Tạo phân công mới
    createAssignment: (data) => {
        return axios.post('/grading/assignments', data);
    },

    // Phân công tự động
    autoAssign: (data) => {
        return axios.post('/grading/assignments/auto-assign', data);
    },

    // Cập nhật phân công
    updateAssignment: (id, data) => {
        return axios.put(`/grading/assignments/${id}`, data);
    },

    // Xóa phân công
    deleteAssignment: (id) => {
        return axios.delete(`/grading/assignments/${id}`);
    },

    // Lấy block chờ phân công
    getPendingBlocks: (params = {}) => {
        return axios.get('/grading/pending-blocks', { params });
    },

    // Lấy phân công của cán bộ đang đăng nhập
    getMyAssignments: (params = {}) => {
        return axios.get('/grading/my-assignments', { params });
    },

    // ==================== RESULTS ====================

    // Lấy danh sách kết quả chấm
    getResults: (params = {}) => {
        return axios.get('/grading/results', { params });
    },

    // Nộp kết quả chấm
    submitResult: (data) => {
        return axios.post('/grading/results', data);
    },

    // Cập nhật kết quả
    updateResult: (id, data) => {
        return axios.put(`/grading/results/${id}`, data);
    },

    // So sánh kết quả chấm của 1 block
    compareResults: (blockCode, params = {}) => {
        return axios.get(`/grading/compare/${blockCode}`, { params });
    },

    // Phân công vòng 3
    assignThirdRound: (blockCode, data = {}) => {
        return axios.post(`/grading/assign-third-round/${blockCode}`, data);
    },

    // Phê duyệt điểm
    approveScore: (blockCode, data = {}) => {
        return axios.post(`/grading/approve/${blockCode}`, data);
    },

    // Lấy thống kê chấm thi
    getGradingStats: (params = {}) => {
        return axios.get('/grading/stats', { params });
    }
};

export default gradingApi;