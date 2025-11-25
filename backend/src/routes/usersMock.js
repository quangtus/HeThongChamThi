const express = require('express');
const { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRoles, 
  getUserStatistics 
} = require('../controllers/userControllerMock');
const { protect, requireAdmin } = require('../middlewares/authMock');

const router = express.Router();

// @route   GET /api/users/statistics
// @desc    Lấy thống kê users
// @access  Private (Admin only)
router.get('/statistics', protect, requireAdmin, getUserStatistics);

// @route   GET /api/users/roles
// @desc    Lấy danh sách roles
// @access  Private (Admin only)
router.get('/roles', protect, requireAdmin, getRoles);

// @route   GET /api/users
// @desc    Lấy danh sách users
// @access  Private (Admin only)
router.get('/', protect, requireAdmin, getAllUsers);

// @route   GET /api/users/:id
// @desc    Lấy thông tin user theo ID
// @access  Private (Admin only)
router.get('/:id', protect, requireAdmin, getUserById);

// @route   POST /api/users
// @desc    Tạo user mới
// @access  Private (Admin only)
router.post('/', protect, requireAdmin, createUser);

// @route   PUT /api/users/:id
// @desc    Cập nhật user
// @access  Private (Admin only)
router.put('/:id', protect, requireAdmin, updateUser);

// @route   DELETE /api/users/:id
// @desc    Xóa user (vô hiệu hóa)
// @access  Private (Admin only)
router.delete('/:id', protect, requireAdmin, deleteUser);

module.exports = router;
