import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/adminApi';
import { isAdmin, isExaminer, isCandidate, isAdminOrExaminer, getRoleName } from '../utils/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Khởi tạo authentication khi app load
    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async() => {
        try {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');

            if (token && userData) {
                // Verify token với server
                try {
                    const response = await authApi.getCurrentUser();
                    if (response.success) {
                        setUser(response.data);
                        setIsAuthenticated(true);
                    } else {
                        // Token không hợp lệ, xóa khỏi localStorage
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } catch (error) {
                    // Token expired hoặc không hợp lệ
                    console.error('Token verification failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async(credentials) => {
        try {
            const response = await authApi.login(credentials);

            if (response.success) {
                const { token, user: userData } = response.data;

                // Lưu vào localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(userData));

                // Cập nhật state
                setUser(userData);
                setIsAuthenticated(true);

                return { success: true, user: userData };
            }

            return { success: false, message: response.message };
        } catch (error) {
            console.error('Login error:', error);

            let errorMessage = 'Đăng nhập thất bại';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            return { success: false, message: errorMessage };
        }
    };

    const logout = async() => {
        try {
            // Gọi API logout (nếu cần)
            await authApi.logout();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Luôn luôn clear local state
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        setUser,
        // ⭐ Thêm role checks
        isAdmin: isAdmin(user),
        isExaminer: isExaminer(user),
        isCandidate: isCandidate(user),
        isAdminOrExaminer: isAdminOrExaminer(user),
        roleName: getRoleName(user?.role_id),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};