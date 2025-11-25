const jwt = require('jsonwebtoken');

// Mock users data (không cần database)
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    password: 'admin123', // Plain text cho demo
    full_name: 'Quản trị viên hệ thống',
    email: 'admin@examgrading.edu.vn',
    phone: '0123456789',
    role_id: 1,
    role_name: 'admin',
    is_active: true
  },
  {
    user_id: 2,
    username: 'examiner',
    password: 'examiner123',
    full_name: 'Nguyễn Văn Chấm',
    email: 'examiner@examgrading.edu.vn',
    phone: '0123456788',
    role_id: 2,
    role_name: 'examiner',
    is_active: true
  },
  {
    user_id: 3,
    username: 'candidate',
    password: 'candidate123',
    full_name: 'Trần Thị Thí Sinh',
    email: 'candidate@examgrading.edu.vn',
    phone: '0123456787',
    role_id: 3,
    role_name: 'candidate',
    is_active: true
  }
];

// Generate JWT token
const generateToken = (userId, roleId, roleName) => {
    return jwt.sign({
            userId,
            roleId,
            roleName,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here', 
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @desc    Đăng nhập (Mock version)
// @route   POST /api/auth/login
// @access  Public
const login = async(req, res) => {
    try {
        console.log('🔐 Mock Login attempt:', req.body);

        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập và mật khẩu là bắt buộc'
            });
        }

        // Tìm user trong mock data
        const userData = mockUsers.find(user => 
            user.username === username && user.password === password
        );

        if (!userData) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (!userData.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
                code: 'ACCOUNT_DISABLED'
            });
        }

        // Tạo token
        const token = generateToken(
            userData.user_id,
            userData.role_id,
            userData.role_name
        );

        // Log successful login
        console.log(`✅ Mock User ${userData.username} logged in successfully`);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    user_id: userData.user_id,
                    username: userData.username,
                    email: userData.email,
                    full_name: userData.full_name,
                    role_id: userData.role_id,
                    role_name: userData.role_name,
                    phone: userData.phone,
                    last_login: new Date()
                }
            }
        });
    } catch (error) {
        console.error('❌ Mock Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập. Vui lòng thử lại sau.',
            code: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin user hiện tại (Mock version)
// @route   GET /api/auth/me
// @access  Private
const getMe = async(req, res) => {
    try {
        const userId = req.user.userId;
        const userData = mockUsers.find(user => user.user_id === userId);

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin user'
            });
        }

        res.json({
            success: true,
            data: {
                user_id: userData.user_id,
                username: userData.username,
                email: userData.email,
                full_name: userData.full_name,
                role_id: userData.role_id,
                role_name: userData.role_name,
                phone: userData.phone,
                is_active: userData.is_active
            }
        });
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin user',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

// @desc    Đăng xuất (Mock version)
// @route   POST /api/auth/logout
// @access  Private
const logout = async(req, res) => {
    try {
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        console.error('Error in logout:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng xuất',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

module.exports = {
    login,
    getMe,
    logout
};
