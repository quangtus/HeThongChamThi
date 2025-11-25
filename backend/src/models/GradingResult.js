const { query } = require('../config/db');

/**
 * MODEL: GRADING RESULT
 * Quản lý kết quả chấm thi tự luận
 */

// Helper: map DB row to API output
function mapResult(row) {
    if (!row) return null;
    return {
        result_id: row.result_id,
        assignment_id: row.assignment_id,
        examiner_id: row.examiner_id,
        examiner_code: row.examiner_code,
        examiner_name: row.examiner_name,
        score: row.score !== null ? parseFloat(row.score) : null,
        max_score: row.max_score !== null ? parseFloat(row.max_score) : null,
        comments: row.comments,
        grading_criteria_used: row.grading_criteria_used,
        grading_time_seconds: row.grading_time_seconds,
        is_final: row.is_final,
        graded_at: row.graded_at,
        // Block info
        block_code: row.block_code,
        paper_code: row.paper_code,
        question_number: row.question_number,
        // Exam info
        exam_code: row.exam_code,
        exam_title: row.exam_title,
        subject_name: row.subject_name
    };
}

// Lấy danh sách kết quả chấm
async function find(filter = {}, options = {}) {
    const { examiner_id, is_final, limit = 20, skip = 0 } = options;
    const where = [];
    const params = {};

    if (filter.result_id) {
        where.push('gr.result_id = :result_id');
        params.result_id = Number(filter.result_id);
    }
    if (filter.assignment_id) {
        where.push('gr.assignment_id = :assignment_id');
        params.assignment_id = Number(filter.assignment_id);
    }
    if (filter.block_code) {
        where.push('ga.block_code = :block_code');
        params.block_code = filter.block_code;
    }
    if (examiner_id) {
        where.push('gr.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }
    if (is_final !== undefined) {
        where.push('gr.is_final = :is_final');
        params.is_final = is_final;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            gr.*,
            ex.examiner_code,
            u.full_name as examiner_name,
            ga.block_code,
            eb.paper_code,
            eb.question_number,
            eq.max_score,
            ee.exam_code,
            ee.exam_title,
            s.subject_name
        FROM grading_results gr
        JOIN grading_assignments ga ON gr.assignment_id = ga.assignment_id
        LEFT JOIN examiners ex ON gr.examiner_id = ex.examiner_id
        LEFT JOIN users u ON ex.user_id = u.user_id
        LEFT JOIN exam_blocks eb ON ga.block_code = eb.block_code
        LEFT JOIN exam_papers ep ON eb.paper_code = ep.paper_code
        LEFT JOIN exam_essay ee ON ep.essay_id = ee.essay_id
        LEFT JOIN subjects s ON ee.subject_id = s.subject_id
        LEFT JOIN essay_questions eq ON ee.essay_id = eq.essay_id AND eb.question_number = eq.question_number
        ${whereSql}
        ORDER BY gr.graded_at DESC
        LIMIT :limit OFFSET :offset
    `;
    params.limit = Number(limit);
    params.offset = Number(skip);

    const rows = await query(sql, params);
    return rows.map(mapResult);
}

// Đếm số kết quả
async function count(filter = {}, options = {}) {
    const { examiner_id, is_final } = options;
    const where = [];
    const params = {};

    if (filter.assignment_id) {
        where.push('gr.assignment_id = :assignment_id');
        params.assignment_id = Number(filter.assignment_id);
    }
    if (examiner_id) {
        where.push('gr.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }
    if (is_final !== undefined) {
        where.push('gr.is_final = :is_final');
        params.is_final = is_final;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`
        SELECT COUNT(*)::int AS total 
        FROM grading_results gr 
        JOIN grading_assignments ga ON gr.assignment_id = ga.assignment_id
        ${whereSql}
    `, params);
    return (rows[0] && rows[0].total) ? rows[0].total : 0;
}

// Lấy chi tiết kết quả
async function findById(id) {
    const results = await find({ result_id: id });
    return results[0] || null;
}

// Lấy kết quả theo assignment
async function findByAssignmentId(assignmentId) {
    const results = await find({ assignment_id: assignmentId });
    return results[0] || null;
}

// Tạo kết quả chấm mới
async function insert(data) {
    const sql = `
        INSERT INTO grading_results 
        (assignment_id, examiner_id, score, comments, grading_criteria_used, grading_time_seconds, is_final)
        VALUES (:assignment_id, :examiner_id, :score, :comments, :grading_criteria_used, :grading_time_seconds, :is_final)
        RETURNING *
    `;
    const params = {
        assignment_id: Number(data.assignment_id),
        examiner_id: Number(data.examiner_id),
        score: data.score !== undefined ? parseFloat(data.score) : null,
        comments: data.comments || null,
        grading_criteria_used: data.grading_criteria_used ? JSON.stringify(data.grading_criteria_used) : null,
        grading_time_seconds: data.grading_time_seconds ? Number(data.grading_time_seconds) : null,
        is_final: data.is_final || false
    };
    const rows = await query(sql, params);
    return findById(rows[0].result_id);
}

// Cập nhật kết quả
async function updateById(id, data) {
    const fields = [];
    const params = { id: Number(id) };

    if (data.score !== undefined) {
        fields.push('score = :score');
        params.score = parseFloat(data.score);
    }
    if (data.comments !== undefined) {
        fields.push('comments = :comments');
        params.comments = data.comments;
    }
    if (data.grading_criteria_used !== undefined) {
        fields.push('grading_criteria_used = :grading_criteria_used');
        params.grading_criteria_used = JSON.stringify(data.grading_criteria_used);
    }
    if (data.is_final !== undefined) {
        fields.push('is_final = :is_final');
        params.is_final = data.is_final;
    }

    if (fields.length === 0) return findById(id);

    const sql = `UPDATE grading_results SET ${fields.join(', ')} WHERE result_id = :id RETURNING *`;
    const rows = await query(sql, params);
    return rows[0] ? findById(id) : null;
}

// Xóa kết quả
async function deleteById(id) {
    const result = await findById(id);
    if (!result) return null;
    await query('DELETE FROM grading_results WHERE result_id = :id', { id: Number(id) });
    return result;
}

// So sánh kết quả chấm của 1 block
async function compareResults(blockCode, options = {}) {
    const { maxDifference = 1.0 } = options;

    const sql = `
        SELECT 
            gr.result_id,
            gr.score,
            gr.examiner_id,
            ex.examiner_code,
            u.full_name as examiner_name,
            ga.round_number,
            eq.max_score
        FROM grading_results gr
        JOIN grading_assignments ga ON gr.assignment_id = ga.assignment_id
        JOIN examiners ex ON gr.examiner_id = ex.examiner_id
        JOIN users u ON ex.user_id = u.user_id
        LEFT JOIN exam_blocks eb ON ga.block_code = eb.block_code
        LEFT JOIN exam_papers ep ON eb.paper_code = ep.paper_code
        LEFT JOIN exam_essay ee ON ep.essay_id = ee.essay_id
        LEFT JOIN essay_questions eq ON ee.essay_id = eq.essay_id AND eb.question_number = eq.question_number
        WHERE ga.block_code = :block_code
        ORDER BY ga.round_number ASC
    `;

    const results = await query(sql, { block_code: blockCode });

    if (results.length < 2) {
        return {
            status: 'PENDING',
            message: 'Chưa đủ kết quả chấm để so sánh',
            results,
            final_score: null
        };
    }

    const scores = results.map(r => parseFloat(r.score));
    const maxScore = (results[0] && results[0].max_score) ? results[0].max_score : 10;
    const scoreDifference = Math.abs(scores[0] - scores[1]);
    const allowedDiff = maxDifference;

    if (scoreDifference <= allowedDiff) {
        // Điểm trùng khớp hoặc chênh lệch cho phép
        const finalScore = (scores[0] + scores[1]) / 2;
        return {
            status: 'MATCHED',
            message: 'Kết quả chấm trùng khớp',
            results,
            score_difference: scoreDifference,
            final_score: Math.round(finalScore * 100) / 100,
            max_score: maxScore
        };
    } else if (results.length >= 3) {
        // Đã có vòng 3
        const allScores = results.map(r => parseFloat(r.score));
        const finalScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        return {
            status: 'RESOLVED_BY_THIRD',
            message: 'Kết quả được quyết định bởi vòng 3',
            results,
            score_difference: scoreDifference,
            final_score: Math.round(finalScore * 100) / 100,
            max_score: maxScore
        };
    } else {
        // Cần chấm vòng 3
        return {
            status: 'NEEDS_THIRD_ROUND',
            message: `Chênh lệch điểm ${scoreDifference.toFixed(2)} > ${allowedDiff}, cần chấm vòng 3`,
            results,
            score_difference: scoreDifference,
            final_score: null,
            max_score: maxScore
        };
    }
}

// Lấy thống kê kết quả chấm
async function getGradingStats(options = {}) {
    const { examiner_id, subject_id, from_date, to_date } = options;
    const where = [];
    const params = {};

    if (examiner_id) {
        where.push('gr.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }
    if (from_date) {
        where.push('gr.graded_at >= :from_date');
        params.from_date = from_date;
    }
    if (to_date) {
        where.push('gr.graded_at <= :to_date');
        params.to_date = to_date;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            COUNT(*)::int as total_graded,
            COUNT(*) FILTER (WHERE gr.is_final = true)::int as final_count,
            AVG(gr.score)::decimal(5,2) as avg_score,
            MIN(gr.score)::decimal(5,2) as min_score,
            MAX(gr.score)::decimal(5,2) as max_score,
            AVG(gr.grading_time_seconds)::int as avg_grading_time
        FROM grading_results gr
        ${whereSql}
    `;

    const rows = await query(sql, params);
    return rows[0];
}

module.exports = {
    find,
    count,
    findById,
    findByAssignmentId,
    insert,
    updateById,
    deleteById,
    compareResults,
    getGradingStats,
    mapResult
};