import axios from './axios';

const registrationApi = {
  // Lấy danh sách đăng ký thi
  getRegistrations: (params = {}) => {
    return axios.get('/registrations', { params });
  },

  // Lấy thông tin đăng ký thi theo ID
  getRegistrationById: (id) => {
    return axios.get(`/registrations/${id}`);
  },

  // Tạo đăng ký thi mới
  createRegistration: (data) => {
    return axios.post('/registrations', data);
  },

  // Cập nhật trạng thái đăng ký thi
  updateRegistrationStatus: (id, data) => {
    return axios.put(`/registrations/${id}/status`, data);
  },

  // Cập nhật thông tin đăng ký thi
  updateRegistration: (id, data) => {
    return axios.put(`/registrations/${id}`, data);
  },

  // Xóa đăng ký thi
  deleteRegistration: (id) => {
    return axios.delete(`/registrations/${id}`);
  },

  // Lấy đăng ký thi của thí sinh
  getRegistrationsByCandidate: (candidateId) => {
    return axios.get(`/registrations/candidate/${candidateId}`);
  },

  // Lấy thống kê đăng ký thi
  getRegistrationStatistics: () => {
    return axios.get('/registrations/statistics');
  }
};

export default registrationApi;
