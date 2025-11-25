/**
 * ⭐ ROLE CONSTANTS & HELPER FUNCTIONS
 * Hệ thống 3 roles đơn giản cho frontend
 * 
 * ROLES:
 * - 1: Admin (Quản trị viên) - Full quyền
 * - 2: Examiner (Cán bộ chấm thi) - Chỉ chấm điểm  
 * - 3: Candidate (Thí sinh) - Chỉ làm bài thi
 */

// ==================== CONSTANTS ====================

/**
 * Role IDs - Sử dụng để so sánh với user.role_id
 */
export const ROLES = {
    ADMIN: 1,
    EXAMINER: 2,
    CANDIDATE: 3
};

/**
 * Role Names - Tên hiển thị tiếng Việt
 */
export const ROLE_NAMES = {
    1: 'Quản trị viên',
    2: 'Cán bộ chấm thi',
    3: 'Thí sinh'
};

/**
 * Role Names (English) - Tên tiếng Anh
 */
export const ROLE_NAMES_EN = {
    1: 'Admin',
    2: 'Examiner',
    3: 'Candidate'
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Kiểm tra user có phải Admin không
 * @param {Object} user - User object từ AuthContext
 * @returns {boolean}
 */
export const isAdmin = (user) => {
    return user?.role_id === ROLES.ADMIN;
};

/**
 * Kiểm tra user có phải Examiner không
 * @param {Object} user - User object từ AuthContext
 * @returns {boolean}
 */
export const isExaminer = (user) => {
    return user?.role_id === ROLES.EXAMINER;
};

/**
 * Kiểm tra user có phải Candidate không
 * @param {Object} user - User object từ AuthContext
 * @returns {boolean}
 */
export const isCandidate = (user) => {
    return user?.role_id === ROLES.CANDIDATE;
};

/**
 * Kiểm tra user có phải Admin HOẶC Examiner không
 * @param {Object} user - User object từ AuthContext
 * @returns {boolean}
 */
export const isAdminOrExaminer = (user) => {
    return [ROLES.ADMIN, ROLES.EXAMINER].includes(user?.role_id);
};

/**
 * Lấy tên role hiển thị (Tiếng Việt)
 * @param {number} roleId - Role ID (1, 2, hoặc 3)
 * @returns {string} Tên role tiếng Việt
 */
export const getRoleName = (roleId) => {
    return ROLE_NAMES[roleId] || 'Không xác định';
};

/**
 * Lấy tên role hiển thị (Tiếng Anh)
 * @param {number} roleId - Role ID (1, 2, hoặc 3)
 * @returns {string} Tên role tiếng Anh
 */
export const getRoleNameEN = (roleId) => {
    return ROLE_NAMES_EN[roleId] || 'Unknown';
};

/**
 * Lấy danh sách tất cả roles (dùng cho dropdown)
 * @returns {Array<{value: number, label: string}>}
 */
export const getAllRoles = () => {
    return [
        { value: ROLES.ADMIN, label: ROLE_NAMES[ROLES.ADMIN] },
        { value: ROLES.EXAMINER, label: ROLE_NAMES[ROLES.EXAMINER] },
        { value: ROLES.CANDIDATE, label: ROLE_NAMES[ROLES.CANDIDATE] }
    ];
};

/**
 * Lấy màu badge cho role (dùng cho UI)
 * @param {number} roleId - Role ID
 * @returns {string} Tailwind CSS class
 */
export const getRoleBadgeColor = (roleId) => {
    const colors = {
        [ROLES.ADMIN]: 'bg-red-100 text-red-800',
        [ROLES.EXAMINER]: 'bg-blue-100 text-blue-800',
        [ROLES.CANDIDATE]: 'bg-green-100 text-green-800'
    };
    return colors[roleId] || 'bg-gray-100 text-gray-800';
};

/**
 * Lấy icon cho role (dùng cho UI) - Material Icons
 * @param {number} roleId - Role ID
 * @returns {string} Icon name
 */
export const getRoleIcon = (roleId) => {
    const icons = {
        [ROLES.ADMIN]: 'admin_panel_settings',
        [ROLES.EXAMINER]: 'rate_review',
        [ROLES.CANDIDATE]: 'school'
    };
    return icons[roleId] || 'person';
};

// ==================== DEFAULT EXPORT ====================

export default {
    ROLES,
    ROLE_NAMES,
    ROLE_NAMES_EN,
    isAdmin,
    isExaminer,
    isCandidate,
    isAdminOrExaminer,
    getRoleName,
    getRoleNameEN,
    getAllRoles,
    getRoleBadgeColor,
    getRoleIcon
};