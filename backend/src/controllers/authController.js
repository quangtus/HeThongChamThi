const UserRepo = require('../models/User');
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Generate JWT token
const generateToken = (userId, roleId, roleName) => {
    return jwt.sign({
            userId,
            role_id: roleId, // ⭐ Đổi thành role_id để thống nhất với middleware
            roleId, // Giữ lại để tương thích ngược (nếu cần)
            roleName,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
const login = async(req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array().map(err => ({
                    field: err.param,
                    message: err.msg
                }))
            });
        }

        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập và mật khẩu là bắt buộc'
            });
        }

        // Tìm user theo username
        const [userData] = await query(`
      SELECT u.user_id, u.username, u.email, u.full_name, u.is_active, 
             u.role_id, r.role_name, u.phone, u.password
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      WHERE u.username = ? OR u.email = ?
    `, [username, username]);

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

        // Kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Cập nhật last_login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [userData.user_id]
        );

        // Tạo token
        const token = generateToken(
            userData.user_id,
            userData.role_id,
            userData.role_name
        );

        // Log successful login
        console.log(`✅ User ${userData.username} logged in successfully`);

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
        console.error('❌ Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập. Vui lòng thử lại sau.',
            code: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/auth/me
// @access  Private
const getMe = async(req, res) => {
    try {
        const userId = req.user.userId;
        const user = await UserRepo.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin user'
            });
        }

        res.json({
            success: true,
            data: user
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

// @desc    Đăng xuất
// @route   POST /api/auth/logout
// @access  Private
const logout = async(req, res) => {
    try {
        // Với JWT, logout chỉ cần xóa token ở client
        // Có thể implement blacklist token nếu cần
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

// @desc    Đổi mật khẩu
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        // Lấy thông tin user hiện tại
        const [user] = await query(
            'SELECT password FROM users WHERE user_id = :user_id', { user_id: userId }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(12);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Cập nhật mật khẩu
        await query(
            'UPDATE users SET password = :password WHERE user_id = :user_id', { password: hashedNewPassword, user_id: userId }
        );

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đổi mật khẩu',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

module.exports = {
    login,
    getMe,
    logout,
    changePassword
};