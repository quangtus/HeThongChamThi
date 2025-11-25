const UserRepo = require('../models/User');
const { query } = require('../config/db');
const { validationResult } = require('express-validator');
const { handleCRUDError } = require('../utils/errorHandler');

// @desc    Lấy danh sách tất cả users
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async(req, res) => {
    try {
        console.log('🔍 Getting users list...');

        // Query với JOIN để lấy thông tin role
        const users = await query(`
      SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.is_active,
        u.last_login,
        u.created_at,
        r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
    `);

        console.log('✅ Found users:', users.length);

        res.json({
            success: true,
            message: 'Lấy danh sách users thành công',
            data: users,
            total: users.length
        });

    } catch (error) {
        console.error('❌ Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin user theo ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Getting user by ID:', id);

        const [user] = await query(`
      SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.is_active,
        u.last_login,
        u.created_at,
        u.role_id,
        r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = :id
    `, { id: Number(id) });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        res.json({
            success: true,
            message: 'Lấy thông tin user thành công',
            data: user
        });

    } catch (error) {
        console.error('❌ Error getting user by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin user',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Tạo user mới
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async(req, res) => {
    try {
        console.log('🔍 Creating new user...');

        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const userData = req.body;

        // Tạo user mới
        const newUser = await UserRepo.insert(userData);

        console.log('✅ User created successfully:', newUser.user_id);

        res.status(201).json({
            success: true,
            message: 'Tạo user thành công',
            data: newUser
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        
        const errorResponse = handleCRUDError(error, 'create', 'user');
        const statusCode = errorResponse.errorCode === '23505' || errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Cập nhật user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Updating user ID:', id);

        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const updateData = req.body;

        // Cập nhật user
        const updatedUser = await UserRepo.updateById(id, updateData);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        console.log('✅ User updated successfully:', id);

        res.json({
            success: true,
            message: 'Cập nhật user thành công',
            data: updatedUser
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        
        const errorResponse = handleCRUDError(error, 'update', 'user');
        const statusCode = errorResponse.errorCode === '23505' || errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Xóa user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Deleting user ID:', id);

        const result = await UserRepo.deleteById(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        console.log('✅ User deleted successfully:', id);

        res.json({
            success: true,
            message: 'Xóa user thành công'
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        
        const errorResponse = handleCRUDError(error, 'delete', 'user');
        const statusCode = errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Import danh sách users từ Excel
// @route   POST /api/users/import
// @access  Private (Admin)
const importUsers = async(req, res) => {
    try {
        console.log('🔍 Importing users...');

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng upload file Excel (.xlsx)' });
        }

        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        const results = { success: 0, failed: 0, errors: [] };
        
        for (const [index, row] of sheet.entries()) {
            try {
                const payload = {
                    username: row.username || row.USERNAME,
                    email: row.email || row.EMAIL || undefined,
                    password: row.password || row.PASSWORD || 'default123', // Default password
                    full_name: row.full_name || row.FULL_NAME,
                    phone: row.phone || row.PHONE || undefined,
                    role_id: Number(row.role_id || row.ROLE_ID || 3), // Default to candidate role
                    is_active: row.is_active === '' ? true : Boolean(row.is_active !== false)
                };

                // Basic required checks
                if (!payload.username || !payload.full_name) {
                    throw new Error('Thiếu cột bắt buộc: username, full_name');
                }

                // Validate role_id exists
                if (payload.role_id < 1 || payload.role_id > 3) {
                    throw new Error('role_id phải là 1 (Admin), 2 (Examiner), hoặc 3 (Candidate)');
                }

                await UserRepo.insert(payload);
                results.success += 1;
            } catch (err) {
                results.failed += 1;
                results.errors.push({ row: index + 2, message: err.message });
            }
        }

        res.json({
            success: true,
            message: `Import hoàn tất: ${results.success} thành công, ${results.failed} lỗi`,
            data: results
        });

    } catch (error) {
        console.error('❌ Error importing users:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi import users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    importUsers
};