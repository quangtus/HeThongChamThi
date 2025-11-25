const { query } = require('../config/db');

// Helper: map DB row to API output
function mapCandidate(row) {
    if (!row) return null;
    return {
        candidate_id: row.candidate_id,
        candidate_code: row.candidate_code,
        user_id: row.user_id,
        full_name: row.full_name, // Lấy từ users
        date_of_birth: row.date_of_birth,
        identity_card: row.identity_card,
        phone: row.phone, // Lấy từ users
        email: row.email, // Lấy từ users
        address: row.address,
        is_active: row.is_active,
        created_at: row.created_at,
        // Thông tin user liên kết
        username: row.username,
        role_name: row.role_name
    };
}

// Đã có schema trên Supabase; bỏ tự tạo bảng MySQL

async function find(filter = {}, options = {}) {
    const { search, is_active, limit = 10, skip = 0 } = options;
    const where = [];
    const params = {};

    if (filter.candidate_id) {
        where.push('c.candidate_id = :candidate_id');
        params.candidate_id = Number(filter.candidate_id);
    }
    if (filter.candidate_code) {
        where.push('c.candidate_code = :candidate_code');
        params.candidate_code = filter.candidate_code;
    }
    if (filter.identity_card) {
        where.push('c.identity_card = :identity_card');
        params.identity_card = filter.identity_card;
    }
    if (is_active !== undefined) {
        where.push('c.is_active = :is_active');
        params.is_active = is_active;
    }
    if (search) {
        where.push('(c.candidate_code ILIKE :kw OR u.full_name ILIKE :kw OR c.identity_card ILIKE :kw OR u.email ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
    SELECT c.candidate_id, c.candidate_code, c.user_id, c.date_of_birth,
           c.identity_card, c.address, c.is_active, c.created_at,
           u.full_name, u.phone, u.email, u.username, r.role_name
    FROM candidates c
    LEFT JOIN users u ON c.user_id = u.user_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
    params.limit = Number(limit);
    params.offset = Number(skip);
    const rows = await query(sql, params);
    return rows.map(mapCandidate);
}

async function count(filter = {}, options = {}) {
    const { search, is_active } = options;
    const where = [];
    const params = {};

    if (is_active !== undefined) {
        where.push('c.is_active = :is_active');
        params.is_active = is_active;
    }
    if (search) {
        where.push('(c.candidate_code ILIKE :kw OR u.full_name ILIKE :kw OR c.identity_card ILIKE :kw OR u.email ILIKE :kw)');
        params.kw = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*)::int AS total FROM candidates c ${whereSql}`, params);
    return rows[0]?.total || 0;
}

async function findById(id) {
    const rows = await query(`
    SELECT c.candidate_id, c.candidate_code, c.user_id, c.date_of_birth,
           c.identity_card, c.address, c.is_active, c.created_at,
           u.full_name, u.phone, u.email, u.username, r.role_name
    FROM candidates c
    LEFT JOIN users u ON c.user_id = u.user_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE c.candidate_id = :id
  `, { id: Number(id) });
    return mapCandidate(rows[0]);
}

async function findByCode(candidate_code) {
    const rows = await query(`
    SELECT c.candidate_id, c.candidate_code, c.user_id, c.date_of_birth,
           c.identity_card, c.address, c.is_active, c.created_at,
           u.full_name, u.phone, u.email, u.username, r.role_name
    FROM candidates c
    LEFT JOIN users u ON c.user_id = u.user_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE c.candidate_code = :candidate_code
  `, { candidate_code });
    return mapCandidate(rows[0]);
}

async function findByIdentityCard(identity_card, excludeId) {
    const params = { identity_card };
    let where = 'c.identity_card = :identity_card';
    if (excludeId) {
        where += ' AND c.candidate_id <> :excludeId';
        params.excludeId = Number(excludeId);
    }
    const rows = await query(`
    SELECT c.candidate_id, c.candidate_code FROM candidates c WHERE ${where} LIMIT 1
  `, params);
    return rows[0] || null;
}

async function insert(candidateData) {
    const {
        candidate_code,
        user_id,
        date_of_birth,
        identity_card,
        address
    } = candidateData;

    const rows = await query(`
    INSERT INTO candidates (candidate_code, user_id, date_of_birth, identity_card, address) 
    VALUES (:candidate_code, :user_id, :date_of_birth, :identity_card, :address)
    RETURNING candidate_id
  `, {
        candidate_code,
        user_id,
        date_of_birth,
        identity_card,
        address
    });

    const newId = rows[0].candidate_id;
    return await findById(newId);
}

async function updateById(id, updateData) {
    const fields = [];
    const params = { id: Number(id) };
    const allowed = ['candidate_code', 'date_of_birth', 'identity_card', 'address', 'is_active'];

    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = :${key}`);
            params[key] = updateData[key];
        }
    }

    if (!fields.length) return await findById(id);
    await query(`UPDATE candidates SET ${fields.join(', ')} WHERE candidate_id = :id`, params);
    return await findById(id);
}

async function deleteById(id) {
    const rows = await query('DELETE FROM candidates WHERE candidate_id = :id RETURNING candidate_id', { id: Number(id) });
    return rows.length > 0;
}

// Generate unique candidate code
async function generateCandidateCode() {
    const prefix = 'TS';
    const year = new Date().getFullYear().toString().slice(-2);

    // Tìm số thứ tự cao nhất trong năm
    const rows = await query(`
    SELECT candidate_code FROM candidates 
    WHERE candidate_code LIKE :pattern 
    ORDER BY candidate_code DESC LIMIT 1
  `, { pattern: `${prefix}${year}%` });

    let nextNumber = 1;
    if (rows.length > 0) {
        const lastCode = rows[0].candidate_code;
        const lastNumber = parseInt(lastCode.slice(-4));
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
}

// Tìm thí sinh theo user_id
async function findByUserId(user_id) {
    const rows = await query(`
    SELECT c.*, u.username, u.full_name, u.email, u.phone, u.is_active as user_active, r.role_name
    FROM candidates c
    JOIN users u ON c.user_id = u.user_id
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE c.user_id = :user_id
  `, { user_id });
    return mapCandidate(rows[0]);
}

module.exports = {
    find,
    count,
    findById,
    findByCode,
    findByIdentityCard,
    findByUserId,
    insert,
    updateById,
    deleteById,
    generateCandidateCode
};