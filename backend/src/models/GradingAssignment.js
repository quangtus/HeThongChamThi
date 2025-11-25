const { query } = require('../config/db');

/**
 * MODEL: GRADING ASSIGNMENT
 * Quản lý phân công chấm thi tự luận
 */

// Helper: map DB row to API output
function mapAssignment(row) {
    if (!row) return null;
    return {
        assignment_id: row.assignment_id,
        block_code: row.block_code,
        examiner_id: row.examiner_id,
        examiner_code: row.examiner_code,
        examiner_name: row.examiner_name,
        round_number: row.round_number,
        priority: row.priority,
        deadline: row.deadline,
        status: row.status,
        assigned_at: row.assigned_at,
        assigned_by: row.assigned_by,
        assigner_name: row.assigner_name,
        // Block info
        paper_code: row.paper_code,
        question_number: row.question_number,
        block_image_path: row.block_image_path,
        block_status: row.block_status,
        // Exam info
        essay_id: row.essay_id,
        exam_code: row.exam_code,
        exam_title: row.exam_title,
        subject_name: row.subject_name,
        max_score: row.max_score,
        sample_answer: row.sample_answer,
        grading_criteria: row.grading_criteria
    };
}

// Lấy danh sách phân công
async function find(filter = {}, options = {}) {
    const { examiner_id, status, round_number, priority, limit = 20, skip = 0 } = options;
    const where = [];
    const params = {};

    if (filter.assignment_id) {
        where.push('ga.assignment_id = :assignment_id');
        params.assignment_id = Number(filter.assignment_id);
    }
    if (filter.block_code) {
        where.push('ga.block_code = :block_code');
        params.block_code = filter.block_code;
    }
    if (examiner_id) {
        where.push('ga.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }
    if (status) {
        where.push('ga.status = :status');
        params.status = status;
    }
    if (round_number) {
        where.push('ga.round_number = :round_number');
        params.round_number = Number(round_number);
    }
    if (priority) {
        where.push('ga.priority = :priority');
        params.priority = priority;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            ga.*,
            ex.examiner_code,
            u.full_name as examiner_name,
            u2.full_name as assigner_name,
            eb.paper_code,
            eb.question_number,
            eb.block_image_path,
            eb.block_status,
            ep.essay_id,
            ee.exam_code,
            ee.exam_title,
            s.subject_name,
            eq.max_score,
            eq.sample_answer,
            eq.grading_criteria
        FROM grading_assignments ga
        LEFT JOIN examiners ex ON ga.examiner_id = ex.examiner_id
        LEFT JOIN users u ON ex.user_id = u.user_id
        LEFT JOIN users u2 ON ga.assigned_by = u2.user_id
        LEFT JOIN exam_blocks eb ON ga.block_code = eb.block_code
        LEFT JOIN exam_papers ep ON eb.paper_code = ep.paper_code
        LEFT JOIN exam_essay ee ON ep.essay_id = ee.essay_id
        LEFT JOIN subjects s ON ee.subject_id = s.subject_id
        LEFT JOIN essay_questions eq ON ee.essay_id = eq.essay_id AND eb.question_number = eq.question_number
        ${whereSql}
        ORDER BY 
            CASE ga.priority 
                WHEN 'HIGH' THEN 1 
                WHEN 'MEDIUM' THEN 2 
                ELSE 3 
            END,
            ga.deadline ASC NULLS LAST,
            ga.assigned_at DESC
        LIMIT :limit OFFSET :offset
    `;
    params.limit = Number(limit);
    params.offset = Number(skip);

    const rows = await query(sql, params);
    return rows.map(mapAssignment);
}

// Đếm số phân công
async function count(filter = {}, options = {}) {
    const { examiner_id, status, round_number } = options;
    const where = [];
    const params = {};

    if (examiner_id) {
        where.push('ga.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }
    if (status) {
        where.push('ga.status = :status');
        params.status = status;
    }
    if (round_number) {
        where.push('ga.round_number = :round_number');
        params.round_number = Number(round_number);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*)::int AS total FROM grading_assignments ga ${whereSql}`, params);
    return (rows[0] && rows[0].total) ? rows[0].total : 0;
}

// Lấy chi tiết phân công
async function findById(id) {
    const assignments = await find({ assignment_id: id });
    return assignments[0] || null;
}

// Tạo phân công mới
async function insert(data) {
    const sql = `
        INSERT INTO grading_assignments 
        (block_code, examiner_id, round_number, priority, deadline, status, assigned_by)
        VALUES (:block_code, :examiner_id, :round_number, :priority, :deadline, :status, :assigned_by)
        RETURNING *
    `;
    const params = {
        block_code: data.block_code,
        examiner_id: Number(data.examiner_id),
        round_number: Number(data.round_number) || 1,
        priority: data.priority || 'MEDIUM',
        deadline: data.deadline || null,
        status: data.status || 'ASSIGNED',
        assigned_by: Number(data.assigned_by)
    };
    const rows = await query(sql, params);
    return findById(rows[0].assignment_id);
}

// Cập nhật phân công
async function updateById(id, data) {
    const fields = [];
    const params = { id: Number(id) };

    if (data.status !== undefined) {
        fields.push('status = :status');
        params.status = data.status;
    }
    if (data.priority !== undefined) {
        fields.push('priority = :priority');
        params.priority = data.priority;
    }
    if (data.deadline !== undefined) {
        fields.push('deadline = :deadline');
        params.deadline = data.deadline;
    }

    if (fields.length === 0) return findById(id);

    const sql = `UPDATE grading_assignments SET ${fields.join(', ')} WHERE assignment_id = :id RETURNING *`;
    const rows = await query(sql, params);
    return rows[0] ? findById(id) : null;
}

// Xóa phân công
async function deleteById(id) {
    const assignment = await findById(id);
    if (!assignment) return null;
    await query('DELETE FROM grading_assignments WHERE assignment_id = :id', { id: Number(id) });
    return assignment;
}

// Phân công tự động cho block
async function autoAssign(blockCodes, assignedBy, options = {}) {
    const { priority = 'MEDIUM', deadline = null, examinersPerBlock = 2 } = options;
    const results = { success: [], failed: [] };

    // Lấy danh sách cán bộ chấm thi active
    const examiners = await query(`
        SELECT e.examiner_id, e.examiner_code, u.full_name,
               COUNT(ga.assignment_id) as current_workload
        FROM examiners e
        JOIN users u ON e.user_id = u.user_id
        LEFT JOIN grading_assignments ga ON e.examiner_id = ga.examiner_id 
            AND ga.status IN ('ASSIGNED', 'IN_PROGRESS')
        WHERE e.is_active = true AND u.is_active = true
        GROUP BY e.examiner_id, e.examiner_code, u.full_name
        ORDER BY current_workload ASC
    `);

    if (examiners.length < examinersPerBlock) {
        return {
            success: false,
            message: `Không đủ cán bộ chấm thi. Cần ${examinersPerBlock}, có ${examiners.length}`,
            data: results
        };
    }

    for (const blockCode of blockCodes) {
        try {
            // Kiểm tra block đã được phân công chưa
            const existingAssignments = await query(
                'SELECT COUNT(*)::int as cnt FROM grading_assignments WHERE block_code = :code', { code: blockCode }
            );

            if (existingAssignments[0].cnt >= examinersPerBlock) {
                results.failed.push({ block_code: blockCode, reason: 'Đã được phân công đủ' });
                continue;
            }

            // Lấy các examiner đã được phân công cho block này
            const assignedExaminers = await query(
                'SELECT examiner_id FROM grading_assignments WHERE block_code = :code', { code: blockCode }
            );
            const assignedIds = assignedExaminers.map(a => a.examiner_id);

            // Chọn examiner chưa được phân công và có workload thấp nhất
            const availableExaminers = examiners.filter(e => !assignedIds.includes(e.examiner_id));
            const neededCount = examinersPerBlock - existingAssignments[0].cnt;

            for (let i = 0; i < Math.min(neededCount, availableExaminers.length); i++) {
                const examiner = availableExaminers[i];
                const roundNumber = existingAssignments[0].cnt + i + 1;

                await insert({
                    block_code: blockCode,
                    examiner_id: examiner.examiner_id,
                    round_number: roundNumber,
                    priority,
                    deadline,
                    assigned_by: assignedBy
                });

                results.success.push({
                    block_code: blockCode,
                    examiner_id: examiner.examiner_id,
                    examiner_name: examiner.full_name,
                    round_number: roundNumber
                });
            }
        } catch (error) {
            results.failed.push({ block_code: blockCode, reason: error.message });
        }
    }

    return {
        success: results.failed.length === 0,
        message: `Phân công ${results.success.length} thành công, ${results.failed.length} thất bại`,
        data: results
    };
}

// Lấy blocks chờ phân công
async function getPendingBlocks(options = {}) {
    const { subject_id, essay_id, limit = 50 } = options;
    const where = ['eb.block_status = \'PENDING\''];
    const params = { limit: Number(limit) };

    if (essay_id) {
        where.push('ep.essay_id = :essay_id');
        params.essay_id = Number(essay_id);
    }
    if (subject_id) {
        where.push('ee.subject_id = :subject_id');
        params.subject_id = Number(subject_id);
    }

    const sql = `
        SELECT 
            eb.block_code,
            eb.paper_code,
            eb.question_number,
            eb.block_image_path,
            ep.essay_id,
            ee.exam_code,
            ee.exam_title,
            s.subject_name,
            eq.max_score,
            COALESCE(
                (SELECT COUNT(*)::int FROM grading_assignments ga WHERE ga.block_code = eb.block_code),
                0
            ) as assigned_count
        FROM exam_blocks eb
        JOIN exam_papers ep ON eb.paper_code = ep.paper_code
        JOIN exam_essay ee ON ep.essay_id = ee.essay_id
        JOIN subjects s ON ee.subject_id = s.subject_id
        LEFT JOIN essay_questions eq ON ee.essay_id = eq.essay_id AND eb.question_number = eq.question_number
        WHERE ${where.join(' AND ')}
        ORDER BY ep.created_at ASC
        LIMIT :limit
    `;

    return await query(sql, params);
}

// Lấy thống kê phân công
async function getAssignmentStats(options = {}) {
    const { examiner_id, subject_id } = options;
    const where = [];
    const params = {};

    if (examiner_id) {
        where.push('ga.examiner_id = :examiner_id');
        params.examiner_id = Number(examiner_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE ga.status = 'ASSIGNED')::int as assigned,
            COUNT(*) FILTER (WHERE ga.status = 'IN_PROGRESS')::int as in_progress,
            COUNT(*) FILTER (WHERE ga.status = 'COMPLETED')::int as completed,
            COUNT(*) FILTER (WHERE ga.status = 'OVERDUE')::int as overdue
        FROM grading_assignments ga
        ${whereSql}
    `;

    const rows = await query(sql, params);
    return rows[0];
}

module.exports = {
    find,
    count,
    findById,
    insert,
    updateById,
    deleteById,
    autoAssign,
    getPendingBlocks,
    getAssignmentStats,
    mapAssignment
};