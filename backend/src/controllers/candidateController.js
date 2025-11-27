const CandidateRepo = require('../models/Candidate');
const UserRepo = require('../models/User');
const { query } = require('../config/db');
const { validationResult } = require('express-validator');
const { handleCRUDError } = require('../utils/errorHandler');

// @desc    Lấy danh sách tất cả thí sinh
// @route   GET /api/candidates
// @access  Private (Admin)
const getCandidates = async(req, res) => {
    try {
        console.log('🔍 Getting candidates list...');

        const { search, is_active, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const candidates = await CandidateRepo.find({}, { 
            search, 
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            limit: parseInt(limit), 
            skip: parseInt(skip) 
        });

        const total = await CandidateRepo.count({}, { 
            search, 
            is_active: is_active !== undefined ? is_active === 'true' : undefined
        });

        console.log('✅ Found candidates:', candidates.length);

        res.json({
            success: true,
            message: 'Lấy danh sách thí sinh thành công',
            data: candidates,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error getting candidates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin thí sinh theo ID
// @route   GET /api/candidates/:id
// @access  Private
const getCandidateById = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Getting candidate by ID:', id);

        const candidate = await CandidateRepo.findById(id);

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Thí sinh không tồn tại'
            });
        }

        res.json({
            success: true,
            message: 'Lấy thông tin thí sinh thành công',
            data: candidate
        });

    } catch (error) {
        console.error('❌ Error getting candidate by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Tạo thí sinh mới
// @route   POST /api/candidates
// @access  Private (Admin)
const createCandidate = async(req, res) => {
    try {
        console.log('🔍 Creating new candidate...');

        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const candidateData = req.body;

        // Kiểm tra user_id có tồn tại không
        const user = await UserRepo.findById(candidateData.user_id);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        // Kiểm tra user có phải là candidate role không (role_id = 3)
        if (user.role_id !== 3) {
            return res.status(400).json({
                success: false,
                message: `User ID ${candidateData.user_id} không phải là thí sinh (role_id phải = 3). Vui lòng chọn user có role "Thí sinh" hoặc cập nhật role của user trước.`
            });
        }

        // Kiểm tra user đã có candidate record chưa
        const existingCandidate = await CandidateRepo.findByUserId(candidateData.user_id);
        if (existingCandidate) {
            return res.status(400).json({
                success: false,
                message: `User ID ${candidateData.user_id} đã có thông tin thí sinh rồi`
            });
        }

        // Kiểm tra candidate_code đã tồn tại chưa
        if (candidateData.candidate_code) {
            const existingCandidate = await CandidateRepo.findByCode(candidateData.candidate_code);
            if (existingCandidate) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã thí sinh đã tồn tại'
                });
            }
        } else {
            // Tự động tạo mã thí sinh
            candidateData.candidate_code = await CandidateRepo.generateCandidateCode();
        }

        // Kiểm tra identity_card đã tồn tại chưa
        if (candidateData.identity_card) {
            const existingIdentity = await CandidateRepo.findByIdentityCard(candidateData.identity_card);
            if (existingIdentity) {
                return res.status(400).json({
                    success: false,
                    message: 'Số CMND/CCCD đã tồn tại'
                });
            }
        }

        // Tạo thí sinh mới
        const newCandidate = await CandidateRepo.insert(candidateData);

        console.log('✅ Candidate created successfully:', newCandidate.candidate_id);

        res.status(201).json({
            success: true,
            message: 'Tạo thí sinh thành công',
            data: newCandidate
        });

    } catch (error) {
        console.error('❌ Error creating candidate:', error);
        
        const errorResponse = handleCRUDError(error, 'create', 'candidate');
        const statusCode = errorResponse.errorCode === '23505' || errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Cập nhật thí sinh
// @route   PUT /api/candidates/:id
// @access  Private (Admin)
const updateCandidate = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Updating candidate ID:', id);

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

        // Kiểm tra candidate_code đã tồn tại chưa (nếu có thay đổi)
        if (updateData.candidate_code) {
            const existingCandidate = await CandidateRepo.findByCode(updateData.candidate_code);
            if (existingCandidate && existingCandidate.candidate_id != id) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã thí sinh đã tồn tại'
                });
            }
        }

        // Kiểm tra identity_card đã tồn tại chưa (nếu có thay đổi)
        if (updateData.identity_card) {
            const existingIdentity = await CandidateRepo.findByIdentityCard(updateData.identity_card, id);
            if (existingIdentity) {
                return res.status(400).json({
                    success: false,
                    message: 'Số CMND/CCCD đã tồn tại'
                });
            }
        }

        // Cập nhật thí sinh
        const updatedCandidate = await CandidateRepo.updateById(id, updateData);

        if (!updatedCandidate) {
            return res.status(404).json({
                success: false,
                message: 'Thí sinh không tồn tại'
            });
        }

        console.log('✅ Candidate updated successfully:', id);

        res.json({
            success: true,
            message: 'Cập nhật thí sinh thành công',
            data: updatedCandidate
        });

    } catch (error) {
        console.error('❌ Error updating candidate:', error);
        
        const errorResponse = handleCRUDError(error, 'update', 'candidate');
        const statusCode = errorResponse.errorCode === '23505' || errorResponse.errorCode === '23503' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
};

// @desc    Xóa thí sinh
// @route   DELETE /api/candidates/:id
// @access  Private (Admin)
const deleteCandidate = async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Deleting candidate ID:', id);

        const result = await CandidateRepo.deleteById(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Thí sinh không tồn tại'
            });
        }

        console.log('✅ Candidate deleted successfully:', id);

        res.json({
            success: true,
            message: 'Xóa thí sinh thành công'
        });

    } catch (error) {
        console.error('❌ Error deleting candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Thay đổi trạng thái thí sinh
// @route   PATCH /api/candidates/:id/status
// @access  Private (Admin)
const toggleCandidateStatus = async(req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        console.log('🔍 Toggling candidate status ID:', id, 'to:', is_active);

        const updatedCandidate = await CandidateRepo.updateById(id, { is_active });

        if (!updatedCandidate) {
            return res.status(404).json({
                success: false,
                message: 'Thí sinh không tồn tại'
            });
        }

        res.json({
            success: true,
            message: `Thí sinh đã được ${is_active ? 'kích hoạt' : 'vô hiệu hóa'}`,
            data: updatedCandidate
        });

    } catch (error) {
        console.error('❌ Error toggling candidate status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thay đổi trạng thái thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Import danh sách thí sinh từ Excel/CSV
// @route   POST /api/candidates/import
// @access  Private (Admin)
const importCandidates = async(req, res) => {
    try {
        console.log('🔍 Importing candidates...');

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
                // Helper function to convert Excel date serial to MySQL date format
                const convertExcelDate = (excelDate) => {
                    if (!excelDate) return null;
                    
                    // If it's already a string in YYYY-MM-DD format, return as is
                    if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
                        return excelDate;
                    }
                    
                    // If it's a number (Excel serial date), convert it
                    if (typeof excelDate === 'number') {
                        // Excel serial date starts from 1900-01-01, but Excel incorrectly treats 1900 as leap year
                        // So we need to adjust by subtracting 2 days
                        const excelEpoch = new Date(1900, 0, 1);
                        const adjustedDate = new Date(excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
                        return adjustedDate.toISOString().split('T')[0];
                    }
                    
                    // If it's a Date object, convert to YYYY-MM-DD
                    if (excelDate instanceof Date) {
                        return excelDate.toISOString().split('T')[0];
                    }
                    
                    return null;
                };

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
                    candidate_code: row.candidate_code || row.CANDIDATE_CODE 
                        ? String(row.candidate_code || row.CANDIDATE_CODE).trim().toUpperCase() 
                        : undefined,
                    user_id: userId,
                    date_of_birth: convertExcelDate(row.date_of_birth || row.DATE_OF_BIRTH),
                    identity_card: row.identity_card || row.IDENTITY_CARD 
                        ? String(row.identity_card || row.IDENTITY_CARD).trim() 
                        : undefined,
                    address: row.address || row.ADDRESS 
                        ? String(row.address || row.ADDRESS).trim() 
                        : undefined,
                    is_active: row.is_active === '' || row.is_active === undefined 
                        ? true 
                        : Boolean(row.is_active !== false && row.is_active !== 'false' && row.is_active !== 0)
                };
                if (!payload.date_of_birth) {
                    throw new Error('date_of_birth không hợp lệ hoặc thiếu');
                }

                // Validate date format
                if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date_of_birth)) {
                    throw new Error('date_of_birth phải có định dạng YYYY-MM-DD');
                }

                // Validate candidate_code format if provided
                if (payload.candidate_code && !/^[A-Z0-9_]+$/.test(payload.candidate_code)) {
                    throw new Error('candidate_code chỉ chứa chữ hoa, số và dấu gạch dưới');
                }

                // Validate identity_card format if provided
                if (payload.identity_card && (payload.identity_card.length < 9 || payload.identity_card.length > 20)) {
                    throw new Error('identity_card phải có từ 9-20 ký tự');
                }

                // KIỂM TRA USER CÓ TỒN TẠI KHÔNG
                const existingUser = await UserRepo.findById(payload.user_id);
                if (!existingUser) {
                    throw new Error(`User ID ${payload.user_id} không tồn tại trong hệ thống`);
                }

                // Kiểm tra user có phải là candidate role không
                if (existingUser.role_id !== 3) {
                    throw new Error(`User ID ${payload.user_id} không phải là thí sinh (role_id phải = 3)`);
                }

                // Kiểm tra user đã có candidate record chưa
                const existingCandidate = await CandidateRepo.findByUserId(payload.user_id);
                if (existingCandidate) {
                    throw new Error(`User ID ${payload.user_id} đã có thông tin thí sinh rồi`);
                }

                // Auto-generate code if empty
                if (!payload.candidate_code) {
                    payload.candidate_code = await CandidateRepo.generateCandidateCode();
                }

                // Kiểm tra candidate_code unique
                const existingCode = await CandidateRepo.findByCode(payload.candidate_code);
                if (existingCode) {
                    throw new Error(`Mã thí sinh ${payload.candidate_code} đã tồn tại`);
                }

                // Kiểm tra identity_card unique
                if (payload.identity_card) {
                    const existingIdentity = await CandidateRepo.findByIdentityCard(payload.identity_card);
                    if (existingIdentity) {
                        throw new Error(`Số CMND/CCCD ${payload.identity_card} đã tồn tại`);
                    }
                }

                await CandidateRepo.insert(payload);
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
        console.error('❌ Error importing candidates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi import thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Export danh sách thí sinh ra Excel
// @route   GET /api/candidates/export
// @access  Private (Admin)
const exportCandidates = async(req, res) => {
    try {
        console.log('🔍 Exporting candidates...');

        // TODO: Implement Excel export functionality
        // This would require xlsx library for generating Excel files

        res.json({
            success: true,
            message: 'Chức năng export sẽ được triển khai trong phiên bản tiếp theo',
            data: []
        });

    } catch (error) {
        console.error('❌ Error exporting candidates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi export thí sinh',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getCandidates,
    getCandidateById,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    toggleCandidateStatus,
    importCandidates,
    exportCandidates
};
