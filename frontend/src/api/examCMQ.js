import api from "./axios";
import { mapExamResponse, prepareExamPayload } from "../utils/examMapper";

export const examCMQ = {
  // Danh sách đề trắc nghiệm
  getExams: async (params = {}) => {
    try {
      const res = await api.get('/exam-mcq', { params });
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi tải danh sách đề thi',
      };
    }
  },

  // Lấy chi tiết đề + câu hỏi để chỉnh sửa
  getExamById: async (id) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        return { success: false, message: 'Thiếu hoặc ID đề không hợp lệ' };
      }
      const res = await api.get(`/exam-mcq/${id}`);
      if (res.data?.success && res.data?.data) {
        return {
          ...res.data,
          data: mapExamResponse(res.data.data)
        };
      }
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi tải đề thi',
      };
    }
  },

  // Tạo đề trắc nghiệm
  createExamCMQ: async (data) => {
    try {
      const payload = prepareExamPayload(data);
      const res = await api.post('/exam-mcq', payload);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi tạo đề thi'
      };
    }
  },

  // Chỉ cập nhật thông tin đề thi (không thay đổi câu hỏi)
  updateExamInfo: async (id, data) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        return { success: false, message: 'Thiếu hoặc ID đề không hợp lệ' };
      }
      const payload = prepareExamPayload(data);
      const body = {
        exam_code: payload.id,
        id: payload.id,
        title: payload.title,
        subject: payload.subject,
        duration: payload.duration,
        description: payload.description,
        totalQuestions: payload.totalQuestions,
        totalScore: payload.totalScore,
        linkPdf: payload.linkPdf
      };
      const res = await api.patch(`/exam-mcq/${id}/info`, body);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi cập nhật thông tin đề thi'
      };
    }
  },

  // Cập nhật đề trắc nghiệm
  updateExamCMQ: async (id, data) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        return { success: false, message: 'Thiếu hoặc ID đề không hợp lệ' };
      }
      const payload = prepareExamPayload(data);
      const res = await api.put(`/exam-mcq/${id}`, payload);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi cập nhật đề thi'
      };
    }
  },

  // Xóa đề trắc nghiệm
  deleteExamCMQ: async (id) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        return { success: false, message: 'Thiếu hoặc ID đề không hợp lệ' };
      }
      const res = await api.delete(`/exam-mcq/${id}`);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi xóa đề thi'
      };
    }
  }
};

export default examCMQ;
