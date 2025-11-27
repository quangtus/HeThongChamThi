const Subject = require('../models/Subject');
const { query } = require('../config/db');

/**
 * SUBJECT CONTROLLER
 * Quản lý môn thi
 */

/**
 * GET /api/subjects
 * Lấy danh sách môn thi với phân trang và tìm kiếm
 */
async function getSubjects(req, res) {
    try {
        const { page = 1, limit = 10, search, is_active } = req.query;
        const skip = (page - 1) * limit;

        const options = {
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        if (search) options.search = search;
        if (is_active !== undefined) options.is_active = is_active === 'true';

        const [subjects, total] = await Promise.all([
            Subject.findAll(options),
            Subject.count(options)
        ]);

        res.json({
            success: true,
            data: subjects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách môn thi',
            error: error.message
        });
    }
}

/**
 * GET /api/subjects/:id
 * Lấy chi tiết môn thi
 */
async function getSubjectById(req, res) {
    try {
        const { id } = req.params;
        const subject = await Subject.findById(id);

        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy môn thi'
            });
        }

        res.json({
            success: true,
            data: subject
        });
    } catch (error) {
        console.error('Error getting subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin môn thi',
            error: error.message
        });
    }
}

/**
 * POST /api/subjects
 * Tạo môn thi mới
 */
async function createSubject(req, res) {
    try {
        const { subject_code, subject_name, description } = req.body;

        // Validation
        if (!subject_code || !subject_name) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp subject_code và subject_name'
            });
        }

        // Kiểm tra mã môn thi trùng
        const existing = await Subject.findByCode(subject_code);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Mã môn thi ${subject_code} đã tồn tại`
            });
        }

        const subjectData = {
            subject_code,
            subject_name,
            description: description || null
        };

        const newSubject = await Subject.insert(subjectData);

        res.status(201).json({
            success: true,
            message: 'Tạo môn thi thành công',
            data: newSubject
        });
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo môn thi',
            error: error.message
        });
    }
}

/**
 * PUT /api/subjects/:id
 * Cập nhật môn thi
 */
async function updateSubject(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existing = await Subject.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy môn thi'
            });
        }

        // Nếu thay đổi subject_code, kiểm tra trùng
        if (updateData.subject_code && updateData.subject_code !== existing.subject_code) {
            const duplicate = await Subject.findByCode(updateData.subject_code);
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: `Mã môn thi ${updateData.subject_code} đã tồn tại`
                });
            }
        }

        const updatedSubject = await Subject.updateById(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật môn thi thành công',
            data: updatedSubject
        });
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật môn thi',
            error: error.message
        });
    }
}

/**
 * DELETE /api/subjects/:id
 * Xóa môn thi (soft delete)
 */
async function deleteSubject(req, res) {
    try {
        const { id } = req.params;
        const numericId = Number(id);

        const existing = await Subject.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy môn thi'
            });
        }

        const [
            essayCountRows,
            mcqCountRows,
            registrationCountRows,
            examinerSubjectRows
        ] = await Promise.all([
            query('SELECT COUNT(*)::int AS total FROM exam_essay WHERE subject_id = :id AND is_active = true', { id: numericId }),
            query('SELECT COUNT(*)::int AS total FROM exam_mcq WHERE subject_id = :id AND is_active = true', { id: numericId }),
            query('SELECT COUNT(*)::int AS total FROM candidate_exam_registrations WHERE subject_id = :id', { id: numericId }),
            query('SELECT COUNT(*)::int AS total FROM examiner_subjects WHERE subject_id = :id', { id: numericId })
        ]);

        const essayCount = essayCountRows[0]?.total || 0;
        const mcqCount = mcqCountRows[0]?.total || 0;
        const registrationCount = registrationCountRows[0]?.total || 0;
        const examinerSubjectCount = examinerSubjectRows[0]?.total || 0;

        const blockingDependencies = [];
        if (essayCount > 0) blockingDependencies.push(`${essayCount} đề thi tự luận`);
        if (mcqCount > 0) blockingDependencies.push(`${mcqCount} đề thi trắc nghiệm`);
        if (registrationCount > 0) blockingDependencies.push(`${registrationCount} đăng ký thi`);
        if (examinerSubjectCount > 0) blockingDependencies.push(`${examinerSubjectCount} phân công môn cho cán bộ chấm thi`);

        if (blockingDependencies.length > 0) {
            // Không thể xóa vĩnh viễn, cho phép chuyển sang ngừng hoạt động để tránh sử dụng
            await Subject.softDeleteById(id);
            return res.status(200).json({
                success: true,
                message: `Không thể xóa vì môn thi đang được dùng trong ${blockingDependencies.join(', ')} nên đã chuyển sang trạng thái ngừng hoạt động.`,
                data: {
                    mode: 'soft',
                    dependencies: {
                        essay: essayCount,
                        mcq: mcqCount,
                        registrations: registrationCount,
                        examinerSubjects: examinerSubjectCount
                    }
                }
            });
        }

        await Subject.hardDeleteById(id);

        res.json({
            success: true,
            message: 'Đã xóa môn thi khỏi hệ thống',
            data: {
                mode: 'hard'
            }
        });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa môn thi',
            error: error.message
        });
    }
}

module.exports = {
    getSubjects,
    getSubjectById,
    createSubject,
    updateSubject,
    deleteSubject
};