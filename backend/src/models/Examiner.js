const { query } = require('../config/db');

// Map DB row to API output
function mapExaminer(row) {
    if (!row) return null;

    // subjects từ json_agg đã được pg parse thành array/object
    let subjects = [];
    if (Array.isArray(row.subjects)) {
        subjects = row.subjects;
    } else if (row.subjects && typeof row.subjects === 'object') {
        subjects = row.subjects;
    }

    return {
        examiner_id: row.examiner_id,
        examiner_code: row.examiner_code,
        user_id: row.user_id,
        full_name: row.full_name,
        specialization: row.specialization,
        experience_years: row.experience_years,
        certification_level: row.certification_level,
        is_active: row.is_active,
        created_at: row.created_at,
        username: row.username,
        role_name: row.role_name,
        subjects
    };
}

async function find(filter = {}, options = {}) {
    const { search, is_active, specialization, certification_level, limit = 10, skip = 0 } = options;
    const where = [];
    const params = {};

    if (filter.examiner_id) {
        where.push('e.examiner_id = :examiner_id');
        params.examiner_id = Number(filter.examiner_id);
    }
    if (filter.examiner_code) {
        where.push('e.examiner_code = :examiner_code');
        params.examiner_code = filter.examiner_code;
    }
    if (is_active !== undefined) {
        where.push('e.is_active = :is_active');
        params.is_active = is_active;
    }
    if (specialization) {
        where.push('e.specialization ILIKE :specialization');
        params.specialization = `%${specialization}%`;
    }
    if (certification_level) {
        where.push('e.certification_level = :certification_level');
        params.certification_level = certification_level;
    }
    if (search) {
        where.push('(e.examiner_code ILIKE :kw OR u.full_name ILIKE :kw OR e.specialization ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
        SELECT e.examiner_id, e.examiner_code, e.user_id, e.specialization,
               e.experience_years, e.certification_level, e.is_active, e.created_at,
               u.full_name, u.username, r.role_name,
               COALESCE(
                   (SELECT json_agg(json_build_object(
                       'subject_id', s.subject_id,
                       'subject_name', s.subject_name,
                       'is_primary', es.is_primary,
                       'qualification_level', es.qualification_level
                   ))
                   FROM examiner_subjects es
                   JOIN subjects s ON es.subject_id = s.subject_id
                   WHERE es.examiner_id = e.examiner_id),
                   '[]'::json
               ) as subjects
        FROM examiners e
        LEFT JOIN users u ON e.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        ${whereSql}
        ORDER BY e.created_at DESC
        LIMIT :limit OFFSET :offset
    `;
    params.limit = Number(limit);
    params.offset = Number(skip);
    const rows = await query(sql, params);
    return rows.map(mapExaminer);
}

async function count(filter = {}, options = {}) {
    const { search, is_active, specialization, certification_level } = options;
    const where = [];
    const params = {};

    if (is_active !== undefined) {
        where.push('e.is_active = :is_active');
        params.is_active = is_active;
    }
    if (specialization) {
        where.push('e.specialization ILIKE :specialization');
        params.specialization = `%${specialization}%`;
    }
    if (certification_level) {
        where.push('e.certification_level = :certification_level');
        params.certification_level = certification_level;
    }
    if (search) {
        where.push('(e.examiner_code ILIKE :kw OR u.full_name ILIKE :kw OR e.specialization ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*)::int AS total FROM examiners e LEFT JOIN users u ON e.user_id = u.user_id ${whereSql}`;
    const rows = await query(sql, params);
    return rows[0]?.total || 0;
}

async function findById(id) {
    const sql = `
        SELECT e.examiner_id, e.examiner_code, e.user_id, e.specialization,
               e.experience_years, e.certification_level, e.is_active, e.created_at,
               u.full_name, u.username, r.role_name,
               COALESCE(
                   (SELECT json_agg(json_build_object(
                       'subject_id', s.subject_id,
                       'subject_name', s.subject_name,
                       'is_primary', es.is_primary,
                       'qualification_level', es.qualification_level
                   ))
                   FROM examiner_subjects es
                   JOIN subjects s ON es.subject_id = s.subject_id
                   WHERE es.examiner_id = e.examiner_id),
                   '[]'::json
               ) as subjects
        FROM examiners e
        LEFT JOIN users u ON e.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE e.examiner_id = :id
    `;
    const rows = await query(sql, { id: Number(id) });
    return mapExaminer(rows[0]);
}

async function findByCode(examiner_code) {
    const sql = `
        SELECT e.examiner_id, e.examiner_code, e.user_id, e.specialization,
               e.experience_years, e.certification_level, e.is_active, e.created_at,
               u.full_name, u.username, r.role_name
        FROM examiners e
        LEFT JOIN users u ON e.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE e.examiner_code = :examiner_code
    `;
    const rows = await query(sql, { examiner_code });
    return mapExaminer(rows[0]);
}

async function insert(examinerData) {
    const { examiner_code, user_id, specialization, experience_years, certification_level } = examinerData;

    const sql = `
        INSERT INTO examiners (examiner_code, user_id, specialization, experience_years, certification_level) 
        VALUES (:examiner_code, :user_id, :specialization, :experience_years, :certification_level)
        RETURNING examiner_id
    `;
    const rows = await query(sql, { examiner_code, user_id, specialization, experience_years, certification_level });
    const newId = rows[0].examiner_id;
    return await findById(newId);
}

async function updateById(id, updateData) {
    const fields = [];
    const params = { id: Number(id) };
    const allowed = ['examiner_code', 'specialization', 'experience_years', 'certification_level', 'is_active'];

    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = :${key}`);
            params[key] = updateData[key];
        }
    }

    if (!fields.length) return await findById(id);

    const sql = `UPDATE examiners SET ${fields.join(', ')} WHERE examiner_id = :id`;
    await query(sql, params);
    return await findById(id);
}

async function deleteById(id) {
    const sql = 'DELETE FROM examiners WHERE examiner_id = :id';
    await query(sql, { id: Number(id) });
    return true;
}

async function generateExaminerCode() {
    const prefix = 'CB';
    const year = new Date().getFullYear().toString().slice(-2);

    const sql = `
        SELECT examiner_code FROM examiners 
        WHERE examiner_code LIKE :pattern 
        ORDER BY examiner_code DESC LIMIT 1
    `;
    const rows = await query(sql, { pattern: `${prefix}${year}%` });

    let nextNumber = 1;
    if (rows.length > 0) {
        const lastCode = rows[0].examiner_code;
        const lastNumber = parseInt(lastCode.slice(-4));
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
}

async function addSubject(examiner_id, subject_id, is_primary = false, qualification_level = 'BASIC') {
    const sql = `
        INSERT INTO examiner_subjects (examiner_id, subject_id, is_primary, qualification_level)
        VALUES (:examiner_id, :subject_id, :is_primary, :qualification_level)
        ON CONFLICT (examiner_id, subject_id)
        DO UPDATE SET 
            is_primary = EXCLUDED.is_primary,
            qualification_level = EXCLUDED.qualification_level
    `;
    await query(sql, { examiner_id, subject_id, is_primary, qualification_level });
}

async function removeSubject(examiner_id, subject_id) {
    const sql = 'DELETE FROM examiner_subjects WHERE examiner_id = :examiner_id AND subject_id = :subject_id';
    await query(sql, { examiner_id, subject_id });
}

async function getSubjects(examiner_id) {
    const sql = `
        SELECT es.subject_id, s.subject_name, es.is_primary, es.qualification_level
        FROM examiner_subjects es
        JOIN subjects s ON es.subject_id = s.subject_id
        WHERE es.examiner_id = :examiner_id
        ORDER BY es.is_primary DESC, s.subject_name
    `;
    return await query(sql, { examiner_id });
}

// Tìm cán bộ chấm thi theo user_id
async function findByUserId(user_id) {
    const rows = await query(`
    SELECT e.*, u.username, u.full_name, u.email, u.phone, u.is_active as user_active, r.role_name
    FROM examiners e
    JOIN users u ON e.user_id = u.user_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE e.user_id = :user_id
  `, { user_id });
    return mapExaminer(rows[0]);
}

module.exports = {
    find,
    count,
    findById,
    findByCode,
    findByUserId,
    insert,
    updateById,
    deleteById,
    generateExaminerCode,
    addSubject,
    removeSubject,
    getSubjects
};