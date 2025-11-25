const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper: map DB row to API output (without password)
function mapUser(row) {
  if (!row) return null;
  const { password, ...rest } = row;
  return rest;
}

// Đã có schema trên Supabase; bỏ tự tạo bảng MySQL

async function find(filter = {}, options = {}) {
  const { search, role_id, is_active, limit = 10, skip = 0 } = options;
  const where = [];
  const params = {};

  if (filter.user_id) {
    where.push('u.user_id = :user_id');
    params.user_id = Number(filter.user_id);
  }
  if (filter.username) {
    where.push('u.username = :username');
    params.username = filter.username;
  }
  if (filter.email) {
    where.push('u.email = :email');
    params.email = filter.email;
  }
  if (role_id) {
    where.push('u.role_id = :role_id');
    params.role_id = role_id;
  }
  if (is_active !== undefined) {
    where.push('u.is_active = :is_active');
    params.is_active = is_active;
  }
  if (search) {
    where.push('(u.username LIKE :kw OR u.email LIKE :kw OR u.full_name LIKE :kw)');
    params.kw = `%${search}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT u.user_id, u.username, u.email, u.full_name, u.phone, u.is_active, 
           u.last_login, u.created_at, u.updated_at,
           r.role_id, r.role_name, r.description as role_description
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    ${whereSql}
    ORDER BY u.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  params.limit = Number(limit);
  params.offset = Number(skip);
  const rows = await query(sql, params);
  return rows.map(mapUser);
}

async function count(filter = {}, options = {}) {
  const { search, role_id, is_active } = options;
  const where = [];
  const params = {};

  if (role_id) { where.push('u.role_id = :role_id'); params.role_id = role_id; }
  if (is_active !== undefined) { where.push('u.is_active = :is_active'); params.is_active = is_active; }
  if (search) { where.push('(u.username LIKE :kw OR u.email LIKE :kw OR u.full_name LIKE :kw)'); params.kw = `%${search}%`; }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(`SELECT COUNT(*)::int AS total FROM users u ${whereSql}`, params);
  return rows[0]?.total || 0;
}

async function findById(id) {
  const rows = await query(
    `SELECT u.user_id, u.username, u.email, u.full_name, u.phone, u.is_active, 
            u.last_login, u.created_at, u.updated_at,
            r.role_id, r.role_name, r.description as role_description
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = :id`,
    { id: Number(id) }
  );
  return mapUser(rows[0]);
}

async function findOneByEmailOrUsername(email, username, excludeId) {
  const params = { email, username };
  let where = '(u.email = :email OR u.username = :username)';
  if (excludeId) {
    where += ' AND u.user_id <> :excludeId';
    params.excludeId = Number(excludeId);
  }
  const rows = await query(
    `SELECT u.user_id, u.username, u.email FROM users u WHERE ${where} LIMIT 1`,
    params
  );
  return rows[0] || null;
}

async function insert(userData) {
  const { username, email, password, full_name, role_id, phone } = userData;
  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(password, salt);
  
  console.log('📝 Inserting user with data:', { username, email, full_name, role_id, phone });
  
  const result = await query(
    `INSERT INTO users (username, email, password, full_name, role_id, phone) 
     VALUES (:username, :email, :password, :full_name, :role_id, :phone)
     RETURNING user_id`,
    { username, email, password: hashed, full_name, role_id, phone }
  );
  
  const newId = result[0].user_id;
  console.log('✅ User created with ID:', newId);
  return await findById(newId);
}

async function updateById(id, updateData) {
  const fields = [];
  const params = { id: Number(id) };
  const allowed = ['username','email','full_name','role_id','is_active','phone','password'];
  
  for (const key of allowed) {
    if (updateData[key] !== undefined) {
      if (key === 'password') {
        // Hash password nếu có
        const salt = await bcrypt.genSalt(12);
        const hashed = await bcrypt.hash(updateData[key], salt);
        fields.push(`${key} = :${key}`);
        params[key] = hashed;
      } else {
        fields.push(`${key} = :${key}`);
        params[key] = updateData[key];
      }
    }
  }
  
  if (!fields.length) return await findById(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = :id`, params);
  return await findById(id);
}

async function deleteById(id) {
  // Soft delete: set is_active = false instead of hard delete
  const result = await query('UPDATE users SET is_active = false WHERE user_id = :id RETURNING user_id', { id: Number(id) });
  return result.length > 0;
}

module.exports = {
  find,
  count,
  findById,
  findOneByEmailOrUsername,
  insert,
  updateById,
  deleteById
};
