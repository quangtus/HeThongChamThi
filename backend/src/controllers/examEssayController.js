const ExamEssay = require('../models/ExamEssay');

function parseIfJson(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return value; }
}

/**
 * EXAM ESSAY CONTROLLER
 * Quản lý đề thi tự luận và câu hỏi essay
 */

// ==================== EXAM ESSAYS ====================

/**
 * GET /api/exam-essays
 * Lấy danh sách đề thi tự luận với phân trang và tìm kiếm
 */
async function getExamEssays(req, res) {
    try {
        const { page = 1, limit = 10, search, subject_id, is_active } = req.query;
        const skip = (page - 1) * limit;

        const options = {
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        if (search) options.search = search;
        if (subject_id) options.subject_id = parseInt(subject_id);
        if (is_active !== undefined) options.is_active = is_active === 'true';

        const [exams, total] = await Promise.all([
            ExamEssay.find({}, options),
            ExamEssay.count({}, options)
        ]);

        res.json({
            success: true,
            data: exams,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting exam essays:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đề thi tự luận',
            error: error.message
        });
    }
}

/**
 * GET /api/exam-essays/:id
 * Lấy chi tiết đề thi tự luận (bao gồm câu hỏi)
 */
async function getExamEssayById(req, res) {
    try {
        const { id } = req.params;
        const exam = await ExamEssay.findById(id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đề thi tự luận'
            });
        }

        res.json({
            success: true,
            data: exam
        });
    } catch (error) {
        console.error('Error getting exam essay:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đề thi tự luận',
            error: error.message
        });
    }
}

/**
 * POST /api/exam-essays
 * Tạo đề thi tự luận mới
 */
async function createExamEssay(req, res) {
    try {
        const { exam_code, subject_id, duration, total_score, exam_date, description, created_by } = req.body;

        // Validation đầu vào cơ bản
        if (!exam_code || !subject_id || !duration || !total_score) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: exam_code, subject_id, duration, total_score'
            });
        }

        // Kiểm tra exam_code trùng
        const existing = await ExamEssay.findByCode(exam_code);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Mã đề thi ${exam_code} đã tồn tại`
            });
        }

        // Map sang schema thực tế trong DB (exam_essay)
        // Schema yêu cầu: exam_title, total_questions, time_limit, instructions, answer_sheet_template, created_by (NOT NULL)
        const creatorId = (req.user && req.user.user_id) || created_by || 1; // fallback admin id 1 cho môi trường dev

        const examData = {
            exam_code,
            exam_title: `Đề thi ${exam_code}`,
            subject_id: parseInt(subject_id),
            total_questions: 0,
            total_score: parseFloat(total_score),
            time_limit: parseInt(duration),
            instructions: description || null,
            answer_sheet_template: null,
            created_by: parseInt(creatorId)
        };

        const newExam = await ExamEssay.insert(examData);

        res.status(201).json({
            success: true,
            message: 'Tạo đề thi tự luận thành công',
            data: newExam
        });
    } catch (error) {
        console.error('Error creating exam essay:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đề thi tự luận',
            error: error.message
        });
    }
}

/**
 * PUT /api/exam-essays/:id
 * Cập nhật đề thi tự luận
 */
async function updateExamEssay(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra exam tồn tại
        const existing = await ExamEssay.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đề thi tự luận'
            });
        }

        // Nếu thay đổi exam_code, kiểm tra trùng
        if (updateData.exam_code && updateData.exam_code !== existing.exam_code) {
            const duplicate = await ExamEssay.findByCode(updateData.exam_code);
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: `Mã đề thi ${updateData.exam_code} đã tồn tại`
                });
            }
        }

        const updatedExam = await ExamEssay.updateById(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật đề thi tự luận thành công',
            data: updatedExam
        });
    } catch (error) {
        console.error('Error updating exam essay:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đề thi tự luận',
            error: error.message
        });
    }
}

/**
 * DELETE /api/exam-essays/:id
 * Xóa đề thi tự luận (soft delete)
 */
async function deleteExamEssay(req, res) {
    try {
        const { id } = req.params;

        const existing = await ExamEssay.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đề thi tự luận'
            });
        }

        // Nếu không còn câu hỏi -> hard delete; nếu còn -> soft delete
        const questions = await ExamEssay.getQuestions(id);
        if (!questions || questions.length === 0) {
            await ExamEssay.hardDeleteById(id);
            return res.json({
                success: true,
                message: 'Xóa đề thi tự luận thành công'
            });
        }

        await ExamEssay.deleteById(id); // soft delete -> is_active = false

        res.json({
            success: true,
            message: 'Đề thi còn câu hỏi nên đã chuyển sang trạng thái vô hiệu'
        });
    } catch (error) {
        console.error('Error deleting exam essay:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa đề thi tự luận',
            error: error.message
        });
    }
}

// ==================== ESSAY QUESTIONS ====================

/**
 * GET /api/exam-essays/:essayId/questions
 * Lấy danh sách câu hỏi của đề thi tự luận
 */
async function getQuestions(req, res) {
    try {
        const { essayId } = req.params;

        const questions = await ExamEssay.getQuestions(essayId);

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error('Error getting essay questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách câu hỏi',
            error: error.message
        });
    }
}

/**
 * POST /api/exam-essays/:essayId/questions
 * Thêm câu hỏi mới cho đề thi tự luận
 */
async function addQuestion(req, res) {
    try {
        const { essayId } = req.params;
        const { question_number, question_text, max_score, grading_criteria, sample_answer, estimated_time } = req.body;

        // Validation
        if (!question_number || !question_text || !max_score) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ: question_number, question_text, max_score'
            });
        }

        // Kiểm tra exam tồn tại
        const exam = await ExamEssay.findById(essayId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đề thi tự luận'
            });
        }

        const requestedScore = parseFloat(max_score);

        const currentTotalScore = await ExamEssay.getQuestionsScoreSum(essayId);
        const examTotalScore = parseFloat(exam.total_score);
        if (currentTotalScore + requestedScore - examTotalScore > 1e-6) {
            return res.status(400).json({
                success: false,
                message: `Tổng điểm câu hỏi (${(currentTotalScore + requestedScore).toFixed(2)}) vượt tổng điểm đề thi (${examTotalScore.toFixed(2)}).`
            });
        }

        const questionData = {
            essay_id: parseInt(essayId),
            question_number: parseInt(question_number),
            question_text,
            max_score: requestedScore,
            grading_criteria: parseIfJson(grading_criteria),
            sample_answer: sample_answer || null,
            estimated_time: estimated_time ? parseInt(estimated_time) : null
        };

        const newQuestion = await ExamEssay.addQuestion(questionData);

        res.status(201).json({
            success: true,
            message: 'Thêm câu hỏi thành công',
            data: newQuestion
        });
    } catch (error) {
        console.error('Error adding essay question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm câu hỏi',
            error: error.message
        });
    }
}

/**
 * PUT /api/exam-essays/questions/:questionId
 * Cập nhật câu hỏi
 */
async function updateQuestion(req, res) {
    try {
        const { questionId } = req.params;
        const { grading_criteria } = req.body;
        const question = await ExamEssay.getQuestionById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy câu hỏi'
            });
        }

        const updateData = {
            ...req.body,
            grading_criteria: grading_criteria !== undefined ? parseIfJson(grading_criteria) : undefined
        };

        if (updateData.max_score !== undefined) {
            const exam = await ExamEssay.findById(question.essay_id);
            if (!exam) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đề thi tự luận liên quan'
                });
            }
            const othersScore = await ExamEssay.getQuestionsScoreSum(question.essay_id, questionId);
            const requestedScore = parseFloat(updateData.max_score);
            const examTotalScore = parseFloat(exam.total_score);
            if (othersScore + requestedScore - examTotalScore > 1e-6) {
                return res.status(400).json({
                    success: false,
                    message: `Tổng điểm câu hỏi (${(othersScore + requestedScore).toFixed(2)}) vượt tổng điểm đề thi (${examTotalScore.toFixed(2)}).`
                });
            }
        }

        await ExamEssay.updateQuestion(questionId, updateData);

        res.json({
            success: true,
            message: 'Cập nhật câu hỏi thành công',
            data: await ExamEssay.getQuestionById(questionId)
        });
    } catch (error) {
        console.error('Error updating essay question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật câu hỏi',
            error: error.message
        });
    }
}

/**
 * DELETE /api/exam-essays/questions/:questionId
 * Xóa câu hỏi
 */
async function deleteQuestion(req, res) {
    try {
        const { questionId } = req.params;

        await ExamEssay.deleteQuestion(questionId);

        res.json({
            success: true,
            message: 'Xóa câu hỏi thành công'
        });
    } catch (error) {
        console.error('Error deleting essay question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa câu hỏi',
            error: error.message
        });
    }
}

module.exports = {
    // Exam Essays
    getExamEssays,
    getExamEssayById,
    createExamEssay,
    updateExamEssay,
    deleteExamEssay,

    // Essay Questions
    getQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion
};