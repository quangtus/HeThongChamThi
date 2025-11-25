const { query } = require('../config/db');

// Helper: map DB row to API output
function mapExamEssay(row) {
    if (!row) return null;
    return {
        essay_id: row.essay_id,
        exam_code: row.exam_code,
        exam_title: row.exam_title,
        subject_id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        total_questions: row.total_questions,
        total_score: parseFloat(row.total_score),
        time_limit: row.time_limit,
        instructions: row.instructions,
        answer_sheet_template: row.answer_sheet_template,
        is_active: row.is_active,
        created_by: row.created_by,
        creator_name: row.creator_name,
        created_at: row.created_at,
        questions: row.questions || []
    };
}

function mapEssayQuestion(row) {
    if (!row) return null;
    return {
        question_id: row.question_id,
        essay_id: row.essay_id,
        question_number: row.question_number,
        question_text: row.question_text,
        max_score: parseFloat(row.max_score),
        sample_answer: row.sample_answer,
        grading_criteria: row.grading_criteria,
        estimated_time: row.estimated_time,
        created_at: row.created_at
    };
}

// Lấy danh sách đề thi tự luận
async function find(filter = {}, options = {}) {
    const { search, is_active, subject_id, limit = 10, skip = 0 } = options;
    const where = [];
    const params = {};

    if (filter.essay_id) {
        where.push('e.essay_id = :essay_id');
        params.essay_id = Number(filter.essay_id);
    }
    if (filter.exam_code) {
        where.push('e.exam_code = :exam_code');
        params.exam_code = filter.exam_code;
    }
    if (subject_id) {
        where.push('e.subject_id = :subject_id');
        params.subject_id = subject_id;
    }
    if (is_active !== undefined) {
        where.push('e.is_active = :is_active');
        params.is_active = is_active;
    }
    if (search) {
        where.push('(e.exam_code ILIKE :kw OR e.exam_title ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
    SELECT e.*, s.subject_code, s.subject_name, u.full_name as creator_name
    FROM exam_essay e
    LEFT JOIN subjects s ON e.subject_id = s.subject_id
    LEFT JOIN users u ON e.created_by = u.user_id
    ${whereSql}
    ORDER BY e.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
    params.limit = Number(limit);
    params.offset = Number(skip);

    const rows = await query(sql, params);
    return rows.map(mapExamEssay);
}

// Đếm số lượng đề thi
async function count(filter = {}, options = {}) {
    const { search, is_active, subject_id } = options;
    const where = [];
    const params = {};

    if (subject_id) {
        where.push('e.subject_id = :subject_id');
        params.subject_id = subject_id;
    }
    if (is_active !== undefined) {
        where.push('e.is_active = :is_active');
        params.is_active = is_active;
    }
    if (search) {
        where.push('(e.exam_code ILIKE :kw OR e.exam_title ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*)::int AS total FROM exam_essay e ${whereSql}`, params);
    return rows[0]?.total || 0;
}

// Lấy chi tiết đề thi kèm danh sách câu hỏi
async function findById(id) {
    const sql = `
    SELECT e.*, s.subject_code, s.subject_name, u.full_name as creator_name
    FROM exam_essay e
    LEFT JOIN subjects s ON e.subject_id = s.subject_id
    LEFT JOIN users u ON e.created_by = u.user_id
    WHERE e.essay_id = :id
  `;
    const rows = await query(sql, { id: Number(id) });

    if (!rows[0]) return null;

    const exam = mapExamEssay(rows[0]);

    // Lấy danh sách câu hỏi
    exam.questions = await getQuestions(id);

    return exam;
}

// Lấy đề thi theo mã đề
async function findByCode(exam_code) {
    const sql = `
    SELECT e.*, s.subject_code, s.subject_name, u.full_name as creator_name
    FROM exam_essay e
    LEFT JOIN subjects s ON e.subject_id = s.subject_id
    LEFT JOIN users u ON e.created_by = u.user_id
    WHERE e.exam_code = :exam_code
  `;
    const rows = await query(sql, { exam_code });

    if (!rows[0]) return null;

    const exam = mapExamEssay(rows[0]);
    exam.questions = await getQuestions(exam.essay_id);

    return exam;
}

// Tạo đề thi mới
async function insert(examData) {
    const {
        exam_code,
        exam_title,
        subject_id,
        total_questions,
        total_score,
        time_limit,
        instructions,
        answer_sheet_template,
        created_by
    } = examData;

    const rows = await query(`
    INSERT INTO exam_essay 
    (exam_code, exam_title, subject_id, total_questions, total_score, time_limit, 
     instructions, answer_sheet_template, created_by)
    VALUES 
    (:exam_code, :exam_title, :subject_id, :total_questions, :total_score, :time_limit,
     :instructions, :answer_sheet_template, :created_by)
    RETURNING essay_id
  `, {
        exam_code,
        exam_title,
        subject_id,
        total_questions,
        total_score,
        time_limit,
        instructions,
        answer_sheet_template,
        created_by
    });

    const newId = rows[0].essay_id;
    return await findById(newId);
}

// Cập nhật đề thi
async function updateById(id, updateData) {
    const fields = [];
    const params = { id: Number(id) };
    const allowed = ['exam_code', 'exam_title', 'subject_id', 'total_questions', 'total_score',
        'time_limit', 'instructions', 'answer_sheet_template', 'is_active'
    ];

    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = :${key}`);
            params[key] = updateData[key];
        }
    }

    if (!fields.length) return await findById(id);

    await query(`UPDATE exam_essay SET ${fields.join(', ')} WHERE essay_id = :id`, params);
    return await findById(id);
}

// Xóa đề thi (soft delete)
async function deleteById(id) {
    await query('UPDATE exam_essay SET is_active = false WHERE essay_id = :id', { id: Number(id) });
}

// Xóa đề thi (hard delete) - chỉ dùng khi không còn câu hỏi liên quan
async function hardDeleteById(id) {
    await query('DELETE FROM exam_essay WHERE essay_id = :id', { id: Number(id) });
}

// Lấy danh sách câu hỏi của đề thi
async function getQuestions(essay_id) {
    const rows = await query(`
    SELECT * FROM essay_questions
    WHERE essay_id = :essay_id
    ORDER BY question_number
  `, { essay_id: Number(essay_id) });
    return rows.map(mapEssayQuestion);
}

// Thêm câu hỏi vào đề thi
async function addQuestion(questionData) {
    const {
        essay_id,
        question_number,
        question_text,
        max_score,
        sample_answer,
        grading_criteria,
        estimated_time
    } = questionData;

    const rows = await query(`
    INSERT INTO essay_questions
    (essay_id, question_number, question_text, max_score, sample_answer, 
     grading_criteria, estimated_time)
    VALUES
    (:essay_id, :question_number, :question_text, :max_score, :sample_answer,
     :grading_criteria, :estimated_time)
    RETURNING question_id
  `, {
        essay_id,
        question_number,
        question_text,
        max_score,
        sample_answer,
        grading_criteria: JSON.stringify(grading_criteria || {}),
        estimated_time
    });

    return rows[0].question_id;
}

// Cập nhật câu hỏi
async function updateQuestion(question_id, updateData) {
    const fields = [];
    const params = { question_id: Number(question_id) };
    const allowed = ['question_number', 'question_text', 'max_score', 'sample_answer',
        'grading_criteria', 'estimated_time'
    ];

    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            if (key === 'grading_criteria') {
                fields.push(`${key} = :${key}`);
                params[key] = JSON.stringify(updateData[key]);
            } else {
                fields.push(`${key} = :${key}`);
                params[key] = updateData[key];
            }
        }
    }

    if (!fields.length) return;

    await query(`UPDATE essay_questions SET ${fields.join(', ')} WHERE question_id = :question_id`, params);
}

// Xóa câu hỏi
async function deleteQuestion(question_id) {
    await query('DELETE FROM essay_questions WHERE question_id = :question_id', {
        question_id: Number(question_id)
    });
}

module.exports = {
    find,
    count,
    findById,
    findByCode,
    insert,
    updateById,
    deleteById,
    hardDeleteById,
    getQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    mapExamEssay,
    mapEssayQuestion
};