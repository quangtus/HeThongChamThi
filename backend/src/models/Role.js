const { query } = require('../config/db');

// Helper: map DB row to API output
function mapRole(row) {
  if (!row) return null;
  return row;
}

// Đã có schema trên Supabase; bỏ tự tạo bảng MySQL

async function findAll() {
  const rows = await query(
    'SELECT role_id, role_name, description, permissions, is_active, created_at, updated_at FROM roles WHERE is_active = true ORDER BY role_name'
  );
  return rows.map(mapRole);
}

async function findById(id) {
  const rows = await query(
    'SELECT role_id, role_name, description, permissions, is_active, created_at, updated_at FROM roles WHERE role_id = :id',
    { id: Number(id) }
  );
  return mapRole(rows[0]);
}

async function findByName(roleName) {
  const rows = await query(
    'SELECT role_id, role_name, description, permissions, is_active, created_at, updated_at FROM roles WHERE role_name = :roleName',
    { roleName }
  );
  return mapRole(rows[0]);
}

async function insert(roleData) {
  const { role_name, description, permissions } = roleData;
  const rows = await query(
    `INSERT INTO roles (role_name, description, permissions) 
     VALUES (:role_name, :description, :permissions)
     RETURNING role_id`,
    { role_name, description, permissions: JSON.stringify(permissions || {}) }
  );
  const newId = rows[0].role_id;
  return await findById(newId);
}

async function updateById(id, updateData) {
  const fields = [];
  const params = { id: Number(id) };
  const allowed = ['role_name', 'description', 'permissions', 'is_active'];
  
  for (const key of allowed) {
    if (updateData[key] !== undefined) {
      if (key === 'permissions') {
        fields.push(`${key} = :${key}`);
        params[key] = JSON.stringify(updateData[key]);
      } else {
        fields.push(`${key} = :${key}`);
        params[key] = updateData[key];
      }
    }
  }
  
  if (!fields.length) return await findById(id);
  await query(`UPDATE roles SET ${fields.join(', ')} WHERE role_id = :id`, params);
  return await findById(id);
}

async function deleteById(id) {
  await query('UPDATE roles SET is_active = false WHERE role_id = :id', { id: Number(id) });
}

module.exports = {
  findAll,
  findById,
  findByName,
  insert,
  updateById,
  deleteById
};
