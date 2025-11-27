const ExaminerRepo = require('../models/Examiner');
const UserRepo = require('../models/User');
const { query } = require('../config/db');
const { validationResult } = require('express-validator');

// @desc    Lấy danh sách tất cả cán bộ chấm thi
// @route   GET /api/examiners
// @access  Private (Admin)
const getExaminers = async(req, res) => {
    try {
        console.log('🔍 Getting examiners list...');

        const { search, is_active, specialization, certification_level, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const examiners = await ExaminerRepo.find({}, { 
            search, 
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            specialization,
            certification_level,
            limit: parseInt(limit), 
            skip: parseInt(skip) 
        });

        const total = await ExaminerRepo.count({}, { 
            search, 
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            specialization,
            certification_level
        });

        console.log('✅ Found examiners:', examiners.length);

        res.json({
            success: true,
            message: 'Lấy danh sách cán bộ chấm thi thành công',
            data: examiners,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error getting examiners:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin cán bộ chấm thi theo ID
// @route   GET /api/examiners/:id
// @access  Private
const getExaminerById = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Getting examiner by ID:', id);

        const examiner = await ExaminerRepo.findById(id);

        if (!examiner) {
            return res.status(404).json({
                success: false,
                message: 'Cán bộ chấm thi không tồn tại'
            });
        }

        res.json({
            success: true,
            message: 'Lấy thông tin cán bộ chấm thi thành công',
            data: examiner
        });

    } catch (error) {
        console.error('❌ Error getting examiner by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Tạo cán bộ chấm thi mới
// @route   POST /api/examiners
// @access  Private (Admin)
const createExaminer = async(req, res) => {
    try {
        console.log('🔍 Creating new examiner...');

        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const examinerData = req.body;

        // Kiểm tra user_id có tồn tại không
        const user = await UserRepo.findById(examinerData.user_id);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        // Kiểm tra user có phải là examiner role không (role_id = 2)
        if (user.role_id !== 2) {
            return res.status(400).json({
                success: false,
                message: `User ID ${examinerData.user_id} không phải là cán bộ chấm thi (role_id phải = 2). Vui lòng chọn user có role "Cán bộ chấm thi" hoặc cập nhật role của user trước.`
            });
        }

        // Kiểm tra user đã có examiner record chưa
        const existingExaminer = await ExaminerRepo.findByUserId(examinerData.user_id);
        if (existingExaminer) {
            return res.status(400).json({
                success: false,
                message: `User ID ${examinerData.user_id} đã có thông tin cán bộ chấm thi rồi`
            });
        }

        // Kiểm tra examiner_code đã tồn tại chưa
        if (examinerData.examiner_code) {
            const existingExaminer = await ExaminerRepo.findByCode(examinerData.examiner_code);
            if (existingExaminer) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã cán bộ chấm thi đã tồn tại'
                });
            }
        } else {
            // Tự động tạo mã cán bộ chấm thi
            examinerData.examiner_code = await ExaminerRepo.generateExaminerCode();
        }

        // Tạo cán bộ chấm thi mới
        const newExaminer = await ExaminerRepo.insert(examinerData);

        // Thêm môn chấm nếu có
        if (examinerData.subjects && Array.isArray(examinerData.subjects)) {
            for (const subject of examinerData.subjects) {
                await ExaminerRepo.addSubject(
                    newExaminer.examiner_id, 
                    subject.subject_id, 
                    subject.is_primary || false, 
                    subject.qualification_level || 'BASIC'
                );
            }
        }

        console.log('✅ Examiner created successfully:', newExaminer.examiner_id);

        res.status(201).json({
            success: true,
            message: 'Tạo cán bộ chấm thi thành công',
            data: newExaminer
        });

    } catch (error) {
        console.error('❌ Error creating examiner:', error);

        // Kiểm tra lỗi duplicate key (PostgreSQL)
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Mã cán bộ chấm thi đã tồn tại'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Cập nhật cán bộ chấm thi
// @route   PUT /api/examiners/:id
// @access  Private (Admin)
const updateExaminer = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Updating examiner ID:', id);

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

        // Kiểm tra examiner_code đã tồn tại chưa (nếu có thay đổi)
        if (updateData.examiner_code) {
            const existingExaminer = await ExaminerRepo.findByCode(updateData.examiner_code);
            if (existingExaminer && existingExaminer.examiner_id != id) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã cán bộ chấm thi đã tồn tại'
                });
            }
        }

        // Cập nhật cán bộ chấm thi
        const updatedExaminer = await ExaminerRepo.updateById(id, updateData);

        if (!updatedExaminer) {
            return res.status(404).json({
                success: false,
                message: 'Cán bộ chấm thi không tồn tại'
            });
        }

        // Cập nhật môn chấm nếu có
        if (updateData.subjects && Array.isArray(updateData.subjects)) {
            // Xóa tất cả môn chấm cũ
            await query('DELETE FROM examiner_subjects WHERE examiner_id = :examiner_id', { examiner_id: id });
            
            // Thêm môn chấm mới
            for (const subject of updateData.subjects) {
                await ExaminerRepo.addSubject(
                    id, 
                    subject.subject_id, 
                    subject.is_primary || false, 
                    subject.qualification_level || 'BASIC'
                );
            }
        }

        console.log('✅ Examiner updated successfully:', id);

        res.json({
            success: true,
            message: 'Cập nhật cán bộ chấm thi thành công',
            data: updatedExaminer
        });

    } catch (error) {
        console.error('❌ Error updating examiner:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Mã cán bộ chấm thi đã tồn tại'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Xóa cán bộ chấm thi
// @route   DELETE /api/examiners/:id
// @access  Private (Admin)
const deleteExaminer = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Deleting examiner ID:', id);

        const result = await ExaminerRepo.deleteById(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Cán bộ chấm thi không tồn tại'
            });
        }

        console.log('✅ Examiner deleted successfully:', id);

        res.json({
            success: true,
            message: 'Xóa cán bộ chấm thi thành công'
        });

    } catch (error) {
        console.error('❌ Error deleting examiner:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Thay đổi trạng thái cán bộ chấm thi
// @route   PATCH /api/examiners/:id/status
// @access  Private (Admin)
const toggleExaminerStatus = async(req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        console.log('🔍 Toggling examiner status ID:', id, 'to:', is_active);

        const updatedExaminer = await ExaminerRepo.updateById(id, { is_active });

        if (!updatedExaminer) {
            return res.status(404).json({
                success: false,
                message: 'Cán bộ chấm thi không tồn tại'
            });
        }

        res.json({
            success: true,
            message: `Cán bộ chấm thi đã được ${is_active ? 'kích hoạt' : 'vô hiệu hóa'}`,
            data: updatedExaminer
        });

    } catch (error) {
        console.error('❌ Error toggling examiner status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thay đổi trạng thái cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Thêm môn chấm cho cán bộ
// @route   POST /api/examiners/:id/subjects
// @access  Private (Admin)
const addExaminerSubject = async(req, res) => {
    try {
        const { id } = req.params;
        const { subject_id, is_primary = false, qualification_level = 'BASIC' } = req.body;
        console.log('🔍 Adding subject to examiner ID:', id);

        await ExaminerRepo.addSubject(id, subject_id, is_primary, qualification_level);

        res.json({
            success: true,
            message: 'Thêm môn chấm thành công'
        });

    } catch (error) {
        console.error('❌ Error adding examiner subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm môn chấm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Xóa môn chấm của cán bộ
// @route   DELETE /api/examiners/:id/subjects/:subject_id
// @access  Private (Admin)
const removeExaminerSubject = async(req, res) => {
    try {
        const { id, subject_id } = req.params;
        console.log('🔍 Removing subject from examiner ID:', id);

        await ExaminerRepo.removeSubject(id, subject_id);

        res.json({
            success: true,
            message: 'Xóa môn chấm thành công'
        });

    } catch (error) {
        console.error('❌ Error removing examiner subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa môn chấm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy danh sách môn chấm của cán bộ
// @route   GET /api/examiners/:id/subjects
// @access  Private
const getExaminerSubjects = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Getting subjects for examiner ID:', id);

        const subjects = await ExaminerRepo.getSubjects(id);

        res.json({
            success: true,
            message: 'Lấy danh sách môn chấm thành công',
            data: subjects
        });

    } catch (error) {
        console.error('❌ Error getting examiner subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách môn chấm',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Import danh sách cán bộ chấm thi từ Excel/CSV
// @route   POST /api/examiners/import
// @access  Private (Admin)
const importExaminers = async(req, res) => {
    try {
        console.log('🔍 Importing examiners...');

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
                // Hỗ trợ cả user_id và username (ưu tiên user_id nếu có cả hai)
                let userId = null;
                if (row.user_id || row.USER_ID) {
                    // Nếu có user_id, dùng user_id (ưu tiên cao hơn)
                    userId = Number(row.user_id || row.USER_ID);
                    if (isNaN(userId) || userId < 1) {
                        throw new Error('user_id không hợp lệ');
                    }
                } else if (row.username || row.USERNAME) {
                    // Nếu không có user_id, tìm theo username (khuyến nghị)
                    const username = String(row.username || row.USERNAME).trim();
                    if (!username) {
                        throw new Error('username không được để trống');
                    }
                    const user = await UserRepo.findOneByEmailOrUsername(null, username);
                    if (!user) {
                        throw new Error(`Username "${username}" không tồn tại trong hệ thống. Vui lòng import users trước hoặc kiểm tra lại username.`);
                    }
                    userId = user.user_id;
                } else {
                    throw new Error('Thiếu user_id hoặc username. Phải cung cấp một trong hai. Khuyến nghị: dùng username để dễ liên kết với file users.');
                }

                const payload = {
                    examiner_code: row.examiner_code || row.EXAMINER_CODE 
                        ? String(row.examiner_code || row.EXAMINER_CODE).trim().toUpperCase() 
                        : undefined,
                    user_id: userId,
                    specialization: row.specialization || row.SPECIALIZATION 
                        ? String(row.specialization || row.SPECIALIZATION).trim() 
                        : undefined,
                    experience_years: Number(row.experience_years || row.EXPERIENCE_YEARS || 0),
                    certification_level: (row.certification_level || row.CERTIFICATION_LEVEL || 'JUNIOR').toUpperCase(),
                    is_active: row.is_active === '' || row.is_active === undefined 
                        ? true 
                        : Boolean(row.is_active !== false && row.is_active !== 'false' && row.is_active !== 0)
                };

                // Validate certification_level
                if (!['JUNIOR', 'SENIOR', 'EXPERT'].includes(payload.certification_level)) {
                    throw new Error('certification_level phải là JUNIOR, SENIOR hoặc EXPERT');
                }

                // Validate experience_years
                if (isNaN(payload.experience_years) || payload.experience_years < 0 || payload.experience_years > 50) {
                    throw new Error('experience_years phải là số từ 0-50');
                }

                // Validate examiner_code format if provided
                if (payload.examiner_code && !/^[A-Z0-9_]+$/.test(payload.examiner_code)) {
                    throw new Error('examiner_code chỉ chứa chữ hoa, số và dấu gạch dưới');
                }

                // Validate specialization length if provided
                if (payload.specialization && payload.specialization.length > 100) {
                    throw new Error('specialization không được quá 100 ký tự');
                }

                // KIỂM TRA USER CÓ TỒN TẠI KHÔNG
                const existingUser = await UserRepo.findById(payload.user_id);
                if (!existingUser) {
                    throw new Error(`User ID ${payload.user_id} không tồn tại trong hệ thống`);
                }

                // Kiểm tra user có phải là examiner role không
                if (existingUser.role_id !== 2) {
                    throw new Error(`User ID ${payload.user_id} không phải là cán bộ chấm thi (role_id phải = 2)`);
                }

                // Kiểm tra user đã có examiner record chưa
                const existingExaminer = await ExaminerRepo.findByUserId(payload.user_id);
                if (existingExaminer) {
                    throw new Error(`User ID ${payload.user_id} đã có thông tin cán bộ chấm thi rồi`);
                }

                if (!payload.examiner_code) {
                    payload.examiner_code = await ExaminerRepo.generateExaminerCode();
                }

                // Kiểm tra examiner_code unique
                const existingCode = await ExaminerRepo.findByCode(payload.examiner_code);
                if (existingCode) {
                    throw new Error(`Mã cán bộ ${payload.examiner_code} đã tồn tại`);
                }

                await ExaminerRepo.insert(payload);
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
        console.error('❌ Error importing examiners:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi import cán bộ chấm thi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getExaminers,
    getExaminerById,
    createExaminer,
    updateExaminer,
    deleteExaminer,
    toggleExaminerStatus,
    addExaminerSubject,
    removeExaminerSubject,
    getExaminerSubjects,
    importExaminers
};
