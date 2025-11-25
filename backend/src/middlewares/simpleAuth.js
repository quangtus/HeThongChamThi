/**
 * ⭐ MIDDLEWARE PHÂN QUYỀN ĐƠN GIẢN
 * Kiểm tra role_id (integer) thay vì roleName (string)
 * 
 * HỆ THỐNG 3 ROLES:
 * - role_id = 1: Admin (Quản trị viên) - Full quyền
 * - role_id = 2: Examiner (Cán bộ chấm thi) - Chỉ chấm điểm
 * - role_id = 3: Candidate (Thí sinh) - Chỉ làm bài thi
 */

/**
 * Kiểm tra user phải là Admin (role_id = 1)
 * Dùng cho: Quản lý users, candidates, examiners, đề thi, ngân hàng câu hỏi
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
            code: 'NOT_AUTHENTICATED'
        });
    }

    if (req.user.role_id !== 1) {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Admin mới có quyền thực hiện chức năng này',
            code: 'FORBIDDEN',
            requiredRole: 'Admin',
            yourRole: req.user.role_id
        });
    }

    next();
};

/**
 * Kiểm tra user phải là Examiner (role_id = 2)
 * Dùng cho: Chấm điểm, xem phân công chấm thi
 */
const requireExaminer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
            code: 'NOT_AUTHENTICATED'
        });
    }

    if (req.user.role_id !== 2) {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Cán bộ chấm thi mới có quyền thực hiện chức năng này',
            code: 'FORBIDDEN',
            requiredRole: 'Examiner',
            yourRole: req.user.role_id
        });
    }

    next();
};

/**
 * Kiểm tra user phải là Candidate (role_id = 3)
 * Dùng cho: Làm bài thi trắc nghiệm, xem kết quả
 */
const requireCandidate = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
            code: 'NOT_AUTHENTICATED'
        });
    }

    if (req.user.role_id !== 3) {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Thí sinh mới có quyền thực hiện chức năng này',
            code: 'FORBIDDEN',
            requiredRole: 'Candidate',
            yourRole: req.user.role_id
        });
    }

    next();
};

/**
 * Kiểm tra user phải là Admin HOẶC Examiner
 * Dùng cho: Xem báo cáo, thống kê
 */
const requireAdminOrExaminer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
            code: 'NOT_AUTHENTICATED'
        });
    }

    if (![1, 2].includes(req.user.role_id)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chức năng này',
            code: 'FORBIDDEN',
            requiredRole: 'Admin hoặc Examiner',
            yourRole: req.user.role_id
        });
    }

    next();
};

/**
 * Helper functions - Kiểm tra role (dùng trong code logic)
 */
const isAdmin = (user) => user?.role_id === 1;
const isExaminer = (user) => user?.role_id === 2;
const isCandidate = (user) => user?.role_id === 3;

module.exports = {
    requireAdmin,
    requireExaminer,
    requireCandidate,
    requireAdminOrExaminer,
    isAdmin,
    isExaminer,
    isCandidate
};