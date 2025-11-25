const { query } = require('../config/db');

// @desc    Lấy tất cả các roles
// @route   GET /api/roles
// @access  Private (Admin)
const getRoles = async(req, res) => {
    try {
        console.log('🔍 Getting roles list...');

        const roles = await query(`
      SELECT role_id, role_name, description, is_active
      FROM roles
      WHERE is_active = TRUE
      ORDER BY role_name ASC
    `);

        console.log('✅ Found roles:', roles.length);

        res.json({
            success: true,
            message: 'Lấy danh sách roles thành công',
            data: roles
        });

    } catch (error) {
        console.error('❌ Error getting roles:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách roles',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getRoles
};