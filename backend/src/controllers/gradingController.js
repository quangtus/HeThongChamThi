const GradingAssignment = require('../models/GradingAssignment');
const GradingResult = require('../models/GradingResult');
const Examiner = require('../models/Examiner');

/**
 * GRADING CONTROLLER
 * Quản lý phân công và chấm thi tự luận
 */

// ==================== ASSIGNMENT MANAGEMENT ====================

/**
 * GET /api/grading/assignments
 * Lấy danh sách phân công chấm thi
 */
async function getAssignments(req, res) {
    try {
        const { page = 1, limit = 20, examiner_id, status, round_number, priority } = req.query;
        const skip = (page - 1) * limit;

        const options = {
            examiner_id: examiner_id ? parseInt(examiner_id) : undefined,
            status,
            round_number: round_number ? parseInt(round_number) : undefined,
            priority,
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        const [assignments, total] = await Promise.all([
            GradingAssignment.find({}, options),
            GradingAssignment.count({}, options)
        ]);

        res.json({
            success: true,
            data: assignments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phân công',
            error: error.message
        });
    }
}

/**
 * GET /api/grading/assignments/:id
 * Lấy chi tiết phân công
 */
async function getAssignmentById(req, res) {
    try {
        const { id } = req.params;
        const assignment = await GradingAssignment.findById(id);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phân công'
            });
        }

        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error('Error getting assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin phân công',
            error: error.message
        });
    }
}

/**
 * POST /api/grading/assignments
 * Tạo phân công mới
 */
async function createAssignment(req, res) {
    try {
        const { block_code, examiner_id, round_number, priority, deadline } = req.body;
        const assigned_by = (req.user && req.user.user_id) ? req.user.user_id : 1;

        if (!block_code || !examiner_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp block_code và examiner_id'
            });
        }

        const assignment = await GradingAssignment.insert({
            block_code,
            examiner_id,
            round_number: round_number || 1,
            priority: priority || 'MEDIUM',
            deadline,
            assigned_by
        });

        res.status(201).json({
            success: true,
            message: 'Tạo phân công thành công',
            data: assignment
        });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo phân công',
            error: error.message
        });
    }
}

/**
 * POST /api/grading/assignments/auto-assign
 * Phân công tự động cho các block
 */
async function autoAssign(req, res) {
    try {
        const { block_codes, priority, deadline, examiners_per_block } = req.body;
        const assigned_by = (req.user && req.user.user_id) ? req.user.user_id : 1;

        if (!block_codes || !Array.isArray(block_codes) || block_codes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp danh sách block_codes'
            });
        }

        const result = await GradingAssignment.autoAssign(block_codes, assigned_by, {
            priority,
            deadline,
            examinersPerBlock: examiners_per_block || 2
        });

        res.json({
            success: result.success,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('Error auto-assigning:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi phân công tự động',
            error: error.message
        });
    }
}

/**
 * PUT /api/grading/assignments/:id
 * Cập nhật phân công
 */
async function updateAssignment(req, res) {
    try {
        const { id } = req.params;
        const { status, priority, deadline } = req.body;

        const assignment = await GradingAssignment.updateById(id, {
            status,
            priority,
            deadline
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phân công'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật phân công thành công',
            data: assignment
        });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật phân công',
            error: error.message
        });
    }
}

/**
 * DELETE /api/grading/assignments/:id
 * Xóa phân công
 */
async function deleteAssignment(req, res) {
    try {
        const { id } = req.params;
        const assignment = await GradingAssignment.deleteById(id);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phân công'
            });
        }

        res.json({
            success: true,
            message: 'Xóa phân công thành công',
            data: assignment
        });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa phân công',
            error: error.message
        });
    }
}

/**
 * GET /api/grading/pending-blocks
 * Lấy danh sách block chờ phân công
 */
async function getPendingBlocks(req, res) {
    try {
        const { essay_id, subject_id, limit } = req.query;

        const blocks = await GradingAssignment.getPendingBlocks({
            essay_id: essay_id ? parseInt(essay_id) : undefined,
            subject_id: subject_id ? parseInt(subject_id) : undefined,
            limit: limit ? parseInt(limit) : 50
        });

        res.json({
            success: true,
            data: blocks,
            total: blocks.length
        });
    } catch (error) {
        console.error('Error getting pending blocks:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách block chờ',
            error: error.message
        });
    }
}

/**
 * GET /api/grading/my-assignments
 * Lấy danh sách phân công của cán bộ đang đăng nhập
 */
async function getMyAssignments(req, res) {
    try {
        const userId = req.user ? req.user.user_id : null;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập'
            });
        }

        // Tìm examiner theo user_id
        const examiner = await Examiner.findByUserId(userId);
        if (!examiner) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không phải cán bộ chấm thi'
            });
        }

        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        const options = {
            examiner_id: examiner.examiner_id,
            status,
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        const [assignments, total, stats] = await Promise.all([
            GradingAssignment.find({}, options),
            GradingAssignment.count({}, options),
            GradingAssignment.getAssignmentStats({ examiner_id: examiner.examiner_id })
        ]);

        res.json({
            success: true,
            data: assignments,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting my assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phân công',
            error: error.message
        });
    }
}

// ==================== GRADING RESULTS ====================

/**
 * GET /api/grading/results
 * Lấy danh sách kết quả chấm
 */
async function getResults(req, res) {
    try {
        const { page = 1, limit = 20, examiner_id, is_final } = req.query;
        const skip = (page - 1) * limit;

        const options = {
            examiner_id: examiner_id ? parseInt(examiner_id) : undefined,
            is_final: is_final !== undefined ? is_final === 'true' : undefined,
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        const [results, total] = await Promise.all([
            GradingResult.find({}, options),
            GradingResult.count({}, options)
        ]);

        res.json({
            success: true,
            data: results,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách kết quả',
            error: error.message
        });
    }
}

/**
 * POST /api/grading/results
 * Nộp kết quả chấm
 */
async function submitResult(req, res) {
    try {
        const { assignment_id, score, comments, grading_criteria_used, grading_time_seconds } = req.body;

        if (!assignment_id || score === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp assignment_id và score'
            });
        }

        // Lấy thông tin assignment
        const assignment = await GradingAssignment.findById(assignment_id);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phân công'
            });
        }

        // Kiểm tra xem đã có kết quả chưa
        const existingResult = await GradingResult.findByAssignmentId(assignment_id);
        if (existingResult) {
            return res.status(400).json({
                success: false,
                message: 'Phân công này đã được chấm rồi'
            });
        }

        // Validate score
        if (score < 0 || (assignment.max_score && score > parseFloat(assignment.max_score))) {
            return res.status(400).json({
                success: false,
                message: `Điểm phải từ 0 đến ${assignment.max_score || 10}`
            });
        }

        // Tạo kết quả
        const result = await GradingResult.insert({
            assignment_id,
            examiner_id: assignment.examiner_id,
            score,
            comments,
            grading_criteria_used,
            grading_time_seconds
        });

        // Cập nhật trạng thái assignment
        await GradingAssignment.updateById(assignment_id, { status: 'COMPLETED' });

        // So sánh kết quả với các vòng chấm khác
        const comparison = await GradingResult.compareResults(assignment.block_code);

        res.status(201).json({
            success: true,
            message: 'Nộp kết quả chấm thành công',
            data: {
                result,
                comparison
            }
        });
    } catch (error) {
        console.error('Error submitting result:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi nộp kết quả chấm',
            error: error.message
        });
    }
}

/**
 * PUT /api/grading/results/:id
 * Cập nhật kết quả chấm
 */
async function updateResult(req, res) {
    try {
        const { id } = req.params;
        const { score, comments, grading_criteria_used, is_final } = req.body;

        const result = await GradingResult.updateById(id, {
            score,
            comments,
            grading_criteria_used,
            is_final
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kết quả chấm'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật kết quả thành công',
            data: result
        });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật kết quả',
            error: error.message
        });
    }
}

/**
 * GET /api/grading/compare/:blockCode
 * So sánh kết quả chấm của 1 block
 */
async function compareResults(req, res) {
    try {
        const { blockCode } = req.params;
        const { max_difference } = req.query;

        const comparison = await GradingResult.compareResults(blockCode, {
            maxDifference: max_difference ? parseFloat(max_difference) : 1.0
        });

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error comparing results:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi so sánh kết quả',
            error: error.message
        });
    }
}

/**
 * POST /api/grading/assign-third-round/:blockCode
 * Phân công chấm vòng 3
 */
async function assignThirdRound(req, res) {
    try {
        const { blockCode } = req.params;
        const { examiner_id, priority, deadline } = req.body;
        const assigned_by = (req.user && req.user.user_id) ? req.user.user_id : 1;

        // Kiểm tra xem có cần vòng 3 không
        const comparison = await GradingResult.compareResults(blockCode);
        if (comparison.status !== 'NEEDS_THIRD_ROUND') {
            return res.status(400).json({
                success: false,
                message: 'Block này không cần chấm vòng 3',
                current_status: comparison.status
            });
        }

        // Nếu không chỉ định examiner, chọn tự động
        let selectedExaminerId = examiner_id;
        if (!selectedExaminerId) {
            const result = await GradingAssignment.autoAssign([blockCode], assigned_by, {
                priority: priority || 'HIGH',
                deadline,
                examinersPerBlock: 3
            });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            return res.json({
                success: true,
                message: 'Đã phân công chấm vòng 3',
                data: result.data
            });
        }

        // Tạo phân công vòng 3
        const assignment = await GradingAssignment.insert({
            block_code: blockCode,
            examiner_id: selectedExaminerId,
            round_number: 3,
            priority: priority || 'HIGH',
            deadline,
            assigned_by
        });

        res.json({
            success: true,
            message: 'Đã phân công chấm vòng 3',
            data: assignment
        });
    } catch (error) {
        console.error('Error assigning third round:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi phân công vòng 3',
            error: error.message
        });
    }
}

/**
 * POST /api/grading/approve/:blockCode
 * Phê duyệt điểm cuối cùng
 */
async function approveScore(req, res) {
    try {
        const { blockCode } = req.params;
        const { final_score, decision_reason } = req.body;

        const comparison = await GradingResult.compareResults(blockCode);

        let scoreToApprove = final_score;
        if (!scoreToApprove && comparison.final_score !== null) {
            scoreToApprove = comparison.final_score;
        }

        if (scoreToApprove === null || scoreToApprove === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xác định điểm cuối cùng',
                comparison
            });
        }

        // TODO: Lưu điểm cuối vào final_scores khi có đủ thông tin candidate

        res.json({
            success: true,
            message: 'Phê duyệt điểm thành công',
            data: {
                block_code: blockCode,
                final_score: scoreToApprove,
                decision_reason,
                comparison
            }
        });
    } catch (error) {
        console.error('Error approving score:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi phê duyệt điểm',
            error: error.message
        });
    }
}

/**
 * GET /api/grading/stats
 * Lấy thống kê phân công
 */
async function getGradingStats(req, res) {
    try {
        const { examiner_id } = req.query;

        const [assignmentStats, gradingStats] = await Promise.all([
            GradingAssignment.getAssignmentStats({
                examiner_id: examiner_id ? parseInt(examiner_id) : undefined
            }),
            GradingResult.getGradingStats({
                examiner_id: examiner_id ? parseInt(examiner_id) : undefined
            })
        ]);

        res.json({
            success: true,
            data: {
                assignments: assignmentStats,
                results: gradingStats
            }
        });
    } catch (error) {
        console.error('Error getting grading stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê',
            error: error.message
        });
    }
}

module.exports = {
    // Assignments
    getAssignments,
    getAssignmentById,
    createAssignment,
    autoAssign,
    updateAssignment,
    deleteAssignment,
    getPendingBlocks,
    getMyAssignments,
    // Results
    getResults,
    submitResult,
    updateResult,
    compareResults,
    assignThirdRound,
    approveScore,
    getGradingStats
};