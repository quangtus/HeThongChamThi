import axios from 'axios';

// Tạo instance axios với base URL
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 60000, // Increase timeout to 60 seconds for file uploads
})

// Request interceptor để thêm token vào header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor để xử lý lỗi
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Xử lý lỗi token hết hạn
        if (error.response && error.response.status === 401) {
            console.log('Token hết hạn hoặc không hợp lệ');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export default api;