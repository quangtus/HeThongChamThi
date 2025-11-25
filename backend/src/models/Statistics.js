const { query } = require('../config/db');

/**
 * MODEL: STATISTICS
 * Báo cáo và thống kê hệ thống
 */

// Dashboard tổng quan
async function getDashboardStats() {
    const stats = {};

    // Thống kê người dùng
    const userStats = await query(`
        SELECT 
            COUNT(*)::int as total_users,
            COUNT(*) FILTER (WHERE is_active = true)::int as active_users,
            COUNT(*) FILTER (WHERE role_id = 1)::int as admin_count,
            COUNT(*) FILTER (WHERE role_id = 2)::int as examiner_count,
            COUNT(*) FILTER (WHERE role_id = 3)::int as candidate_count
        FROM users
    `);
    stats.users = userStats[0];

    // Thống kê thí sinh
    const candidateStats = await query(`
        SELECT 
            COUNT(*)::int as total_candidates,
            COUNT(*) FILTER (WHERE is_active = true)::int as active_candidates
        FROM candidates
    `);
    stats.candidates = candidateStats[0];

    // Thống kê đăng ký thi
    const registrationStats = await query(`
        SELECT 
            COUNT(*)::int as total_registrations,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending,
            COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved,
            COUNT(*) FILTER (WHERE status = 'REJECTED')::int as rejected
        FROM candidate_exam_registrations
    `);
    stats.registrations = registrationStats[0];

    // Thống kê đề thi
    const examStats = await query(`
        SELECT 
            (SELECT COUNT(*)::int FROM exam_essay) as essay_exams,
            (SELECT COUNT(*)::int FROM exam_mcq) as mcq_exams,
            (SELECT COUNT(*)::int FROM subjects WHERE is_active = true) as active_subjects
    `);
    stats.exams = examStats[0];

    // Thống kê chấm thi
    const gradingStats = await query(`
        SELECT 
            (SELECT COUNT(*)::int FROM grading_assignments) as total_assignments,
            (SELECT COUNT(*)::int FROM grading_assignments WHERE status = 'ASSIGNED') as pending_assignments,
            (SELECT COUNT(*)::int FROM grading_assignments WHERE status = 'IN_PROGRESS') as in_progress,
            (SELECT COUNT(*)::int FROM grading_assignments WHERE status = 'COMPLETED') as completed,
            (SELECT COUNT(*)::int FROM grading_results) as total_results
    `);
    stats.grading = gradingStats[0];

    // Thống kê điểm cuối
    const scoreStats = await query(`
        SELECT 
            COUNT(*)::int as total_scores,
            COUNT(*) FILTER (WHERE status = 'DRAFT')::int as draft_scores,
            COUNT(*) FILTER (WHERE status = 'FINAL')::int as final_scores,
            COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int as published_scores,
            AVG(total_score)::decimal(5,2) as avg_score
        FROM final_scores
    `);
    stats.scores = scoreStats[0];

    return stats;
}

// Thống kê theo môn thi
async function getSubjectStats() {
    const sql = `
        SELECT 
            s.subject_id,
            s.subject_code,
            s.subject_name,
            COUNT(DISTINCT cer.candidate_id)::int as registered_candidates,
            COUNT(DISTINCT ee.essay_id)::int as essay_exam_count,
            COUNT(DISTINCT em.mcq_id)::int as mcq_exam_count,
            COALESCE(AVG(fs.total_score), 0)::decimal(5,2) as avg_score
        FROM subjects s
        LEFT JOIN candidate_exam_registrations cer ON s.subject_id = cer.subject_id
        LEFT JOIN exam_essay ee ON s.subject_id = ee.subject_id
        LEFT JOIN exam_mcq em ON s.subject_id = em.subject_id
        LEFT JOIN final_scores fs ON s.subject_id = fs.subject_id
        WHERE s.is_active = true
        GROUP BY s.subject_id, s.subject_code, s.subject_name
        ORDER BY s.subject_name
    `;
    return await query(sql);
}

// Thống kê hiệu suất cán bộ chấm thi
async function getExaminerPerformance(options = {}) {
    const { from_date, to_date, subject_id } = options;
    const where = ['e.is_active = true'];
    const params = {};

    if (from_date) {
        where.push('gr.graded_at >= :from_date');
        params.from_date = from_date;
    }
    if (to_date) {
        where.push('gr.graded_at <= :to_date');
        params.to_date = to_date;
    }

    const whereSql = where.join(' AND ');

    const sql = `
        SELECT 
            e.examiner_id,
            e.examiner_code,
            u.full_name as examiner_name,
            e.specialization,
            e.certification_level,
            COUNT(DISTINCT ga.assignment_id)::int as total_assignments,
            COUNT(DISTINCT gr.result_id)::int as total_graded,
            COUNT(DISTINCT ga.assignment_id) FILTER (WHERE ga.status = 'COMPLETED')::int as completed_assignments,
            AVG(gr.grading_time_seconds)::int as avg_grading_time_seconds,
            AVG(gr.score)::decimal(5,2) as avg_score_given
        FROM examiners e
        JOIN users u ON e.user_id = u.user_id
        LEFT JOIN grading_assignments ga ON e.examiner_id = ga.examiner_id
        LEFT JOIN grading_results gr ON ga.assignment_id = gr.assignment_id
        WHERE ${whereSql}
        GROUP BY e.examiner_id, e.examiner_code, u.full_name, e.specialization, e.certification_level
        ORDER BY total_graded DESC
    `;

    return await query(sql, params);
}

// Thống kê tiến độ chấm thi
async function getGradingProgress(options = {}) {
    const { essay_id, subject_id } = options;
    const where = [];
    const params = {};

    if (essay_id) {
        where.push('ep.essay_id = :essay_id');
        params.essay_id = Number(essay_id);
    }
    if (subject_id) {
        where.push('ee.subject_id = :subject_id');
        params.subject_id = Number(subject_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            ee.essay_id,
            ee.exam_code,
            ee.exam_title,
            s.subject_name,
            COUNT(DISTINCT eb.block_code)::int as total_blocks,
            COUNT(DISTINCT eb.block_code) FILTER (WHERE eb.block_status = 'PENDING')::int as pending_blocks,
            COUNT(DISTINCT eb.block_code) FILTER (WHERE eb.block_status = 'ASSIGNED')::int as assigned_blocks,
            COUNT(DISTINCT eb.block_code) FILTER (WHERE eb.block_status = 'GRADED')::int as graded_blocks,
            COUNT(DISTINCT eb.block_code) FILTER (WHERE eb.block_status = 'COMPLETED')::int as completed_blocks,
            COUNT(DISTINCT ep.paper_code)::int as total_papers,
            ROUND(
                COUNT(DISTINCT eb.block_code) FILTER (WHERE eb.block_status IN ('GRADED', 'COMPLETED'))::decimal / 
                NULLIF(COUNT(DISTINCT eb.block_code), 0) * 100, 
                2
            ) as progress_percent
        FROM exam_essay ee
        JOIN subjects s ON ee.subject_id = s.subject_id
        LEFT JOIN exam_papers ep ON ee.essay_id = ep.essay_id
        LEFT JOIN exam_blocks eb ON ep.paper_code = eb.paper_code
        ${whereSql}
        GROUP BY ee.essay_id, ee.exam_code, ee.exam_title, s.subject_name
        ORDER BY ee.created_at DESC
    `;

    return await query(sql, params);
}

// Phân bố điểm theo môn
async function getScoreDistribution(options = {}) {
    const { subject_id, essay_id, mcq_id } = options;
    const where = [];
    const params = {};

    if (subject_id) {
        where.push('fs.subject_id = :subject_id');
        params.subject_id = Number(subject_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            s.subject_name,
            COUNT(*) FILTER (WHERE fs.grade = 'A')::int as grade_a,
            COUNT(*) FILTER (WHERE fs.grade = 'B')::int as grade_b,
            COUNT(*) FILTER (WHERE fs.grade = 'C')::int as grade_c,
            COUNT(*) FILTER (WHERE fs.grade = 'D')::int as grade_d,
            COUNT(*) FILTER (WHERE fs.grade = 'F')::int as grade_f,
            COUNT(*)::int as total,
            AVG(fs.total_score)::decimal(5,2) as avg_score,
            MIN(fs.total_score)::decimal(5,2) as min_score,
            MAX(fs.total_score)::decimal(5,2) as max_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fs.total_score)::decimal(5,2) as median_score
        FROM final_scores fs
        JOIN subjects s ON fs.subject_id = s.subject_id
        ${whereSql}
        GROUP BY s.subject_id, s.subject_name
        ORDER BY s.subject_name
    `;

    return await query(sql, params);
}

// Thống kê so sánh kết quả chấm (chênh lệch điểm)
async function getGradingComparison(options = {}) {
    const { subject_id, essay_id, threshold = 1.0 } = options;

    const sql = `
        WITH block_scores AS (
            SELECT 
                ga.block_code,
                ee.exam_code,
                ee.exam_title,
                s.subject_name,
                ARRAY_AGG(gr.score ORDER BY ga.round_number) as scores,
                COUNT(gr.result_id)::int as grader_count,
                MAX(gr.score) - MIN(gr.score) as score_diff
            FROM grading_assignments ga
            JOIN grading_results gr ON ga.assignment_id = gr.assignment_id
            LEFT JOIN exam_blocks eb ON ga.block_code = eb.block_code
            LEFT JOIN exam_papers ep ON eb.paper_code = ep.paper_code
            LEFT JOIN exam_essay ee ON ep.essay_id = ee.essay_id
            LEFT JOIN subjects s ON ee.subject_id = s.subject_id
            GROUP BY ga.block_code, ee.exam_code, ee.exam_title, s.subject_name
            HAVING COUNT(gr.result_id) >= 2
        )
        SELECT 
            COUNT(*) FILTER (WHERE score_diff <= :threshold)::int as matched_count,
            COUNT(*) FILTER (WHERE score_diff > :threshold)::int as mismatched_count,
            COUNT(*)::int as total_compared,
            ROUND(
                COUNT(*) FILTER (WHERE score_diff <= :threshold)::decimal / 
                NULLIF(COUNT(*), 0) * 100, 
                2
            ) as match_rate,
            AVG(score_diff)::decimal(5,2) as avg_difference
        FROM block_scores
    `;

    const rows = await query(sql, { threshold: Number(threshold) });
    return rows[0];
}

// Báo cáo chi tiết chênh lệch điểm
async function getMismatchedGradings(options = {}) {
    const { subject_id, threshold = 1.0, limit = 50 } = options;
    const where = [];
    const params = { threshold: Number(threshold), limit: Number(limit) };

    if (subject_id) {
        where.push('s.subject_id = :subject_id');
        params.subject_id = Number(subject_id);
    }

    const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';

    const sql = `
        WITH block_scores AS (
            SELECT 
                ga.block_code,
                eb.paper_code,
                eb.question_number,
                ee.exam_code,
                ee.exam_title,
                s.subject_id,
                s.subject_name,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'round', ga.round_number,
                        'examiner_id', ex.examiner_id,
                        'examiner_name', u.full_name,
                        'score', gr.score
                    ) ORDER BY ga.round_number
                ) as gradings,
                COUNT(gr.result_id)::int as grader_count,
                MAX(gr.score) - MIN(gr.score) as score_diff
            FROM grading_assignments ga
            JOIN grading_results gr ON ga.assignment_id = gr.assignment_id
            JOIN examiners ex ON ga.examiner_id = ex.examiner_id
            JOIN users u ON ex.user_id = u.user_id
            LEFT JOIN exam_blocks eb ON ga.block_code = eb.block_code
            LEFT JOIN exam_papers ep ON eb.paper_code = ep.paper_code
            LEFT JOIN exam_essay ee ON ep.essay_id = ee.essay_id
            LEFT JOIN subjects s ON ee.subject_id = s.subject_id
            GROUP BY ga.block_code, eb.paper_code, eb.question_number, ee.exam_code, ee.exam_title, s.subject_id, s.subject_name
            HAVING COUNT(gr.result_id) >= 2
        )
        SELECT *
        FROM block_scores
        WHERE score_diff > :threshold ${whereSql}
        ORDER BY score_diff DESC
        LIMIT :limit
    `;

    return await query(sql, params);
}

// Thống kê theo thời gian
async function getTimeBasedStats(options = {}) {
    const { period = 'day', from_date, to_date, limit = 30 } = options;

    let dateTrunc;
    switch (period) {
        case 'week':
            dateTrunc = 'week';
            break;
        case 'month':
            dateTrunc = 'month';
            break;
        default:
            dateTrunc = 'day';
    }

    const where = [];
    const params = { limit: Number(limit) };

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
            DATE_TRUNC('${dateTrunc}', gr.graded_at) as period_start,
            COUNT(*)::int as graded_count,
            COUNT(DISTINCT gr.examiner_id)::int as active_examiners,
            AVG(gr.score)::decimal(5,2) as avg_score,
            AVG(gr.grading_time_seconds)::int as avg_grading_time
        FROM grading_results gr
        ${whereSql}
        GROUP BY DATE_TRUNC('${dateTrunc}', gr.graded_at)
        ORDER BY period_start DESC
        LIMIT :limit
    `;

    return await query(sql, params);
}

// Xuất báo cáo điểm
async function exportScoreReport(options = {}) {
    const { subject_id, status, format = 'json' } = options;
    const where = [];
    const params = {};

    if (subject_id) {
        where.push('fs.subject_id = :subject_id');
        params.subject_id = Number(subject_id);
    }
    if (status) {
        where.push('fs.status = :status');
        params.status = status;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT 
            c.candidate_code,
            u.full_name as candidate_name,
            s.subject_code,
            s.subject_name,
            fs.essay_score,
            fs.mcq_score,
            fs.total_score,
            fs.grade,
            fs.status,
            fs.published_at
        FROM final_scores fs
        JOIN candidates c ON fs.candidate_id = c.candidate_id
        JOIN users u ON c.user_id = u.user_id
        JOIN subjects s ON fs.subject_id = s.subject_id
        ${whereSql}
        ORDER BY s.subject_name, c.candidate_code
    `;

    return await query(sql, params);
}

module.exports = {
    getDashboardStats,
    getSubjectStats,
    getExaminerPerformance,
    getGradingProgress,
    getScoreDistribution,
    getGradingComparison,
    getMismatchedGradings,
    getTimeBasedStats,
    exportScoreReport
};