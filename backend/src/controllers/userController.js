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

        const { search, is_active, role_id, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Build WHERE clause
        let whereConditions = [];
        const params = {};

        if (search) {
            whereConditions.push(`(LOWER(u.username) LIKE :search OR LOWER(u.full_name) LIKE :search OR LOWER(u.email) LIKE :search)`);
            params.search = `%${search.toLowerCase()}%`;
        }

        if (is_active !== undefined) {
            whereConditions.push(`u.is_active = :is_active`);
            params.is_active = is_active === 'true';
        }

        // Filter by role_id if provided
        if (role_id !== undefined) {
            const roleIdNum = parseInt(role_id);
            if (!isNaN(roleIdNum) && roleIdNum > 0) {
                whereConditions.push(`u.role_id = :role_id`);
                params.role_id = roleIdNum;
            }
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ${whereClause}
    `, params);
        const total = parseInt(countResult[0]?.total || 0);

        // Get paginated data
        params.limit = parseInt(limit);
        params.offset = parseInt(skip);
        
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
        u.role_id,
        r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT :limit OFFSET :offset
    `, params);

        console.log('✅ Found users:', users.length);

        res.json({
            success: true,
            message: 'Lấy danh sách users thành công',
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
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
        const numericId = Number(id);

        const existingUser = await UserRepo.findById(numericId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        const [candidateRelation, examinerRelation] = await Promise.all([
            query('SELECT candidate_id FROM candidates WHERE user_id = :user_id LIMIT 1', { user_id: numericId }),
            query('SELECT examiner_id FROM examiners WHERE user_id = :user_id LIMIT 1', { user_id: numericId })
        ]);

        const hasCandidate = candidateRelation.length > 0;
        const hasExaminer = examinerRelation.length > 0;
        const hasRelations = hasCandidate || hasExaminer;

        let result;
        let mode = 'hard';

        if (hasRelations) {
            result = await UserRepo.softDeleteById(numericId, {
                deactivateCandidate: hasCandidate,
                deactivateExaminer: hasExaminer
            });
            mode = 'soft';
        } else {
            result = await UserRepo.hardDeleteById(numericId);
        }

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        console.log('✅ User deleted successfully:', id);

        const relationLabels = [];
        if (hasCandidate) relationLabels.push('thí sinh');
        if (hasExaminer) relationLabels.push('cán bộ chấm thi');

        const message = mode === 'soft'
            ? `User đang liên kết với dữ liệu ${relationLabels.join(' và ')} nên đã được khóa thay vì xóa vĩnh viễn.`
            : 'Xóa user thành công';

        res.json({
            success: true,
            message,
            data: {
                mode,
                relations: {
                    candidate: hasCandidate,
                    examiner: hasExaminer
                }
            }
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        
        const errorResponse = handleCRUDError(error, 'delete', 'user');
        const statusCode = errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Import danh sách users từ Excel/CSV
// @route   POST /api/users/import
// @access  Private (Admin)
const importUsers = async(req, res) => {
    try {
        console.log('🔍 Importing users...');

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng upload file Excel (.xlsx, .xls) hoặc CSV (.csv)' });
        }

        const XLSX = require('xlsx');
        let sheet;
        
        // Check if file is CSV or Excel
        const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
        
        if (fileExtension === '.csv') {
            // Read CSV file
            const csvString = req.file.buffer.toString('utf8');
            const workbook = XLSX.read(csvString, { type: 'string', sheetRows: 0 });
            const sheetName = workbook.SheetNames[0];
            sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        } else {
            // Read Excel file
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        }

        if (!sheet || sheet.length === 0) {
            return res.status(400).json({ success: false, message: 'File không có dữ liệu hoặc định dạng không đúng' });
        }

        const results = { success: 0, failed: 0, errors: [] };
        
        for (const [index, row] of sheet.entries()) {
            try {
                // Normalize field names (support both lowercase and uppercase)
                const payload = {
                    username: String(row.username || row.USERNAME || '').trim(),
                    email: row.email || row.EMAIL ? String(row.email || row.EMAIL).trim() : undefined,
                    password: row.password || row.PASSWORD || 'default123',
                    full_name: String(row.full_name || row.FULL_NAME || '').trim(),
                    phone: row.phone || row.PHONE ? String(row.phone || row.PHONE).trim() : undefined,
                    role_id: Number(row.role_id || row.ROLE_ID || 3),
                    is_active: row.is_active === '' || row.is_active === undefined ? true : Boolean(row.is_active !== false && row.is_active !== 'false' && row.is_active !== 0)
                };

                // Validate required fields
                if (!payload.username || payload.username === '') {
                    throw new Error('Thiếu cột bắt buộc: username');
                }
                if (!payload.full_name || payload.full_name === '') {
                    throw new Error('Thiếu cột bắt buộc: full_name');
                }

                // Validate username format
                if (!/^[a-zA-Z0-9_]+$/.test(payload.username)) {
                    throw new Error('Username chỉ chứa chữ cái, số và dấu gạch dưới');
                }

                // Validate email format if provided
                if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                    throw new Error('Email không hợp lệ');
                }

                // Validate role_id
                if (isNaN(payload.role_id) || payload.role_id < 1 || payload.role_id > 3) {
                    throw new Error('role_id phải là 1 (Admin), 2 (Examiner), hoặc 3 (Candidate)');
                }

                // Validate password length
                if (payload.password.length < 6) {
                    throw new Error('Password phải có ít nhất 6 ký tự');
                }

                // Check username/email uniqueness BEFORE insert
                const existingUser = await UserRepo.findOneByEmailOrUsername(payload.email, payload.username);
                if (existingUser) {
                    if (existingUser.username === payload.username) {
                        throw new Error(`Username "${payload.username}" đã tồn tại`);
                    }
                    if (payload.email && existingUser.email === payload.email) {
                        throw new Error(`Email "${payload.email}" đã tồn tại`);
                    }
                }

                await UserRepo.insert(payload);
                results.success += 1;
            } catch (err) {
                results.failed += 1;
                const errorMessage = err.code === '23505' 
                    ? 'Username hoặc email đã tồn tại' 
                    : err.message;
                results.errors.push({ 
                    row: index + 2, 
                    message: errorMessage,
                    data: {
                        username: row.username || row.USERNAME || '',
                        email: row.email || row.EMAIL || ''
                    }
                });
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