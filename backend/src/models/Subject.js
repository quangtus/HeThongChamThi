const { query } = require('../config/db');
const { normalizeVietnamese, buildAccentInsensitiveSql, ACCENT_MAP_FROM, ACCENT_MAP_TO } = require('../utils/textNormalizer');

// Helper: map DB row to API output
function mapSubject(row) {
    if (!row) return null;
    return {
        subject_id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        description: row.description,
        is_active: row.is_active,
        created_at: row.created_at
    };
}

// Lấy danh sách tất cả môn thi
async function findAll(options = {}) {
    const { is_active, search, limit = 10, skip = 0 } = options;
    const where = [];
    const params = {};

    if (is_active !== undefined) {
        where.push('is_active = :is_active');
        params.is_active = is_active;
    }

    if (search) {
        const normalizedSearch = normalizeVietnamese(search).toLowerCase();
        params.accent_from = ACCENT_MAP_FROM;
        params.accent_to = ACCENT_MAP_TO;

        const asciiName = buildAccentInsensitiveSql('subject_name', 'accent_from', 'accent_to');
        const asciiDescription = buildAccentInsensitiveSql('description', 'accent_from', 'accent_to');

        where.push(`(
            subject_code ILIKE :kw OR 
            lower(subject_name) LIKE :kw OR 
            lower(description) LIKE :kw OR
            ${asciiName} LIKE :kw_ascii OR
            ${asciiDescription} LIKE :kw_ascii
        )`);
        params.kw = `%${search.toLowerCase()}%`;
        params.kw_ascii = `%${normalizedSearch}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
    SELECT subject_id, subject_code, subject_name, description, is_active, created_at
    FROM subjects
    ${whereSql}
    ORDER BY subject_code
    LIMIT :limit OFFSET :offset
  `;
    params.limit = Number(limit);
    params.offset = Number(skip);

    const rows = await query(sql, params);
    return rows.map(mapSubject);
}

// Lấy thông tin môn thi theo ID
async function findById(id) {
    const rows = await query(`
    SELECT subject_id, subject_code, subject_name, description, is_active, created_at
    FROM subjects
    WHERE subject_id = :id
  `, { id: Number(id) });
    return mapSubject(rows[0]);
}

// Lấy thông tin môn thi theo mã môn
async function findByCode(subject_code) {
    const rows = await query(`
    SELECT subject_id, subject_code, subject_name, description, is_active, created_at
    FROM subjects
    WHERE subject_code = :subject_code
  `, { subject_code });
    return mapSubject(rows[0]);
}

// Tạo môn thi mới
async function insert(subjectData) {
    const { subject_code, subject_name, description } = subjectData;

    const rows = await query(`
    INSERT INTO subjects (subject_code, subject_name, description)
    VALUES (:subject_code, :subject_name, :description)
    RETURNING subject_id
  `, { subject_code, subject_name, description });

    const newId = rows[0].subject_id;
    return await findById(newId);
}

// Cập nhật thông tin môn thi
async function updateById(id, updateData) {
    const fields = [];
    const params = { id: Number(id) };
    const allowed = ['subject_code', 'subject_name', 'description', 'is_active'];

    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = :${key}`);
            params[key] = updateData[key];
        }
    }

    if (!fields.length) return await findById(id);

    await query(`UPDATE subjects SET ${fields.join(', ')} WHERE subject_id = :id`, params);
    return await findById(id);
}

// Vô hiệu hóa môn thi (soft delete)
async function softDeleteById(id) {
    await query('UPDATE subjects SET is_active = false WHERE subject_id = :id', { id: Number(id) });
}

// Xóa hoàn toàn môn thi (hard delete)
async function hardDeleteById(id) {
    await query('DELETE FROM subjects WHERE subject_id = :id', { id: Number(id) });
}

// Đếm số lượng môn thi
async function count(options = {}) {
    const { is_active, search } = options;
    const where = [];
    const params = {};

    if (is_active !== undefined) {
        where.push('is_active = :is_active');
        params.is_active = is_active;
    }
    if (search) {
        const normalizedSearch = normalizeVietnamese(search).toLowerCase();
        params.accent_from = ACCENT_MAP_FROM;
        params.accent_to = ACCENT_MAP_TO;

        const asciiName = buildAccentInsensitiveSql('subject_name', 'accent_from', 'accent_to');
        const asciiDescription = buildAccentInsensitiveSql('description', 'accent_from', 'accent_to');

        where.push(`(
            subject_code ILIKE :kw OR 
            lower(subject_name) LIKE :kw OR 
            lower(description) LIKE :kw OR
            ${asciiName} LIKE :kw_ascii OR
            ${asciiDescription} LIKE :kw_ascii
        )`);
        params.kw = `%${search.toLowerCase()}%`;
        params.kw_ascii = `%${normalizedSearch}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*)::int AS total FROM subjects ${whereSql}`, params);
    return rows[0]?.total || 0;
}

module.exports = {
    findAll,
    findById,
    findByCode,
    insert,
    updateById,
    softDeleteById,
    hardDeleteById,
    count,
    mapSubject
};