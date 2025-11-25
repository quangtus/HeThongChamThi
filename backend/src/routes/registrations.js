const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middlewares/auth');
const {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistrationStatus,
  updateRegistration,
  deleteRegistration,
  getRegistrationsByCandidate,
  getRegistrationStatistics
} = require('../controllers/registrationController');

// Validation rules
const registrationValidation = [
  body('candidate_id').isInt({ min: 1 }).withMessage('ID thí sinh không hợp lệ'),
  body('subject_id').isInt({ min: 1 }).withMessage('ID môn thi không hợp lệ'),
  body('exam_type').isIn(['ESSAY', 'MCQ', 'BOTH']).withMessage('Loại thi không hợp lệ'),
  body('exam_session').optional().isString().isLength({ max: 50 }).withMessage('Ca thi không hợp lệ'),
  body('exam_room').optional().isString().isLength({ max: 50 }).withMessage('Phòng thi không hợp lệ'),
  body('seat_number').optional().isString().isLength({ max: 10 }).withMessage('Số bàn không hợp lệ'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Ghi chú quá dài')
];

const statusUpdateValidation = [
  body('status').isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).withMessage('Trạng thái không hợp lệ'),
  body('rejection_reason').optional().isString().isLength({ max: 500 }).withMessage('Lý do từ chối quá dài')
];

// Middleware kiểm tra quyền
const requireAdminOrSupervisor = (req, res, next) => {
  if (['admin', 'supervisor'].includes(req.user.roleName)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập chức năng này'
    });
  }
};

const requireAdminOrCandidate = (req, res, next) => {
  if (['admin', 'candidate'].includes(req.user.roleName)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập chức năng này'
    });
  }
};

// Routes

// @route   GET /api/registrations
// @desc    Lấy danh sách đăng ký thi
// @access  Private (Admin, Supervisor)
router.get('/', authenticateToken, requireAdminOrSupervisor, getRegistrations);

// @route   GET /api/registrations/statistics
// @desc    Lấy thống kê đăng ký thi
// @access  Private (Admin, Supervisor)
router.get('/statistics', authenticateToken, requireAdminOrSupervisor, getRegistrationStatistics);

// @route   GET /api/registrations/candidate/:candidateId
// @desc    Lấy đăng ký thi của thí sinh
// @access  Private
router.get('/candidate/:candidateId', authenticateToken, getRegistrationsByCandidate);

// @route   GET /api/registrations/:id
// @desc    Lấy thông tin đăng ký thi theo ID
// @access  Private
router.get('/:id', authenticateToken, getRegistrationById);

// @route   POST /api/registrations
// @desc    Tạo đăng ký thi mới
// @access  Private (Admin, Candidate)
router.post('/', authenticateToken, requireAdminOrCandidate, registrationValidation, createRegistration);

// @route   PUT /api/registrations/:id/status
// @desc    Cập nhật trạng thái đăng ký thi
// @access  Private (Admin, Supervisor)
router.put('/:id/status', authenticateToken, requireAdminOrSupervisor, statusUpdateValidation, updateRegistrationStatus);

// @route   PUT /api/registrations/:id
// @desc    Cập nhật thông tin đăng ký thi
// @access  Private (Admin, Supervisor)
router.put('/:id', authenticateToken, requireAdminOrSupervisor, registrationValidation, updateRegistration);

// @route   DELETE /api/registrations/:id
// @desc    Xóa đăng ký thi
// @access  Private (Admin, Candidate - chỉ xóa của mình)
router.delete('/:id', authenticateToken, deleteRegistration);

module.exports = router;
