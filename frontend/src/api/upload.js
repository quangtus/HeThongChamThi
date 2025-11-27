import api from './axios';

const defaultUploadConfig = {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
};

const extractError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const uploadApi = {
  async uploadPdf(file, meta = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (meta.examCode) formData.append('examCode', meta.examCode);
      if (meta.examTitle) formData.append('examTitle', meta.examTitle);
      const res = await api.post('/upload-pdf', formData, defaultUploadConfig);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: extractError(error, 'Lỗi khi tải PDF lên máy chủ')
      };
    }
  },

  async uploadImage(file, folder = 'images', meta = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (meta.examCode) formData.append('examCode', meta.examCode);
      if (meta.examTitle) formData.append('examTitle', meta.examTitle);
      if (meta.questionNo != null) formData.append('questionNo', String(meta.questionNo));
      if (meta.imageNo != null) formData.append('imageNo', String(meta.imageNo));
      const res = await api.post(`/upload-image?folder=${encodeURIComponent(folder)}`, formData, defaultUploadConfig);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: extractError(error, 'Lỗi khi tải hình ảnh lên máy chủ')
      };
    }
  },

  async uploadCriteriaImage(file, meta = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (meta.folder) formData.append('folder', meta.folder);
      if (meta.questionNo != null) formData.append('questionNo', String(meta.questionNo));
      if (meta.criterionNo != null) formData.append('criterionNo', String(meta.criterionNo));
      const res = await api.post('/upload-criteria-image', formData, defaultUploadConfig);
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: extractError(error, 'Không thể tải ảnh tiêu chí lên Cloudinary')
      };
    }
  },

  async deleteFile(key) {
    if (!key) return { success: true };
    try {
      const res = await api.delete('/delete-file', { data: { key } });
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: extractError(error, 'Không thể xóa file trên máy chủ')
      };
    }
  },

  async getSignedGetUrl({ key, url }) {
    try {
      const res = await api.get('/sign-get', { params: { key, url } });
      return res.data;
    } catch (error) {
      return { success: false, message: extractError(error, 'Không thể lấy liên kết xem file') };
    }
  }
};

export default uploadApi;
