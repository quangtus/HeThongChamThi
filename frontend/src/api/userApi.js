import axios from './axios';

// User Management API
export const userApi = {
  // Lấy danh sách users với phân trang và tìm kiếm
  getUsers: async (params = {}) => {
    try {
      const response = await axios.get('/api/users', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Lấy thông tin user theo ID
  getUserById: async (id) => {
    try {
      const response = await axios.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Tạo user mới
  createUser: async (userData) => {
    try {
      const response = await axios.post('/api/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Cập nhật user
  updateUser: async (id, userData) => {
    try {
      const response = await axios.put(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Xóa user (vô hiệu hóa)
  deleteUser: async (id) => {
    try {
      const response = await axios.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Lấy danh sách roles
  getRoles: async () => {
    try {
      const response = await axios.get('/api/users/roles');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Lấy thống kê users
  getUserStatistics: async () => {
    try {
      const response = await axios.get('/api/users/statistics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default userApi;
