const bcrypt = require('bcryptjs');

// Mock users data (mở rộng từ authControllerMock)
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    password: 'admin123',
    full_name: 'Quản trị viên hệ thống',
    email: 'admin@examgrading.edu.vn',
    phone: '0123456789',
    role_id: 1,
    role_name: 'admin',
    is_active: true,
    last_login: new Date('2024-01-15T10:30:00Z'),
    created_at: new Date('2024-01-01T00:00:00Z')
  },
  {
    user_id: 2,
    username: 'examiner',
    password: 'examiner123',
    full_name: 'Nguyễn Văn Chấm',
    email: 'examiner@examgrading.edu.vn',
    phone: '0123456788',
    role_id: 2,
    role_name: 'examiner',
    is_active: true,
    last_login: new Date('2024-01-14T15:20:00Z'),
    created_at: new Date('2024-01-02T00:00:00Z')
  },
  {
    user_id: 3,
    username: 'candidate',
    password: 'candidate123',
    full_name: 'Trần Thị Thí Sinh',
    email: 'candidate@examgrading.edu.vn',
    phone: '0123456787',
    role_id: 3,
    role_name: 'candidate',
    is_active: true,
    last_login: new Date('2024-01-13T09:15:00Z'),
    created_at: new Date('2024-01-03T00:00:00Z')
  },
  {
    user_id: 4,
    username: 'supervisor',
    password: 'supervisor123',
    full_name: 'Lê Văn Giám Thị',
    email: 'supervisor@examgrading.edu.vn',
    phone: '0123456786',
    role_id: 4,
    role_name: 'supervisor',
    is_active: true,
    last_login: new Date('2024-01-12T14:45:00Z'),
    created_at: new Date('2024-01-04T00:00:00Z')
  },
  {
    user_id: 5,
    username: 'data_manager',
    password: 'data123',
    full_name: 'Phạm Thị Quản Lý',
    email: 'data@examgrading.edu.vn',
    phone: '0123456785',
    role_id: 5,
    role_name: 'data_manager',
    is_active: true,
    last_login: new Date('2024-01-11T11:30:00Z'),
    created_at: new Date('2024-01-05T00:00:00Z')
  }
];

// Mock roles data
const mockRoles = [
  {
    role_id: 1,
    role_name: 'admin',
    description: 'Quản trị viên hệ thống',
    permissions: { all: true }
  },
  {
    role_id: 2,
    role_name: 'examiner',
    description: 'Cán bộ chấm thi',
    permissions: { grade: true, view_reports: true, manage_assignments: true }
  },
  {
    role_id: 3,
    role_name: 'candidate',
    description: 'Thí sinh',
    permissions: { take_exam: true, view_results: true }
  },
  {
    role_id: 4,
    role_name: 'supervisor',
    description: 'Giám thị',
    permissions: { monitor_exam: true, manage_candidates: true }
  },
  {
    role_id: 5,
    role_name: 'data_manager',
    description: 'Quản lý dữ liệu',
    permissions: { import_data: true, export_data: true, manage_questions: true }
  }
];

// @desc    Lấy danh sách tất cả users
// @route   GET /api/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    
    let filteredUsers = [...mockUsers];
    
    // Filter by search
    if (search) {
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filter by role
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role_name === role);
    }
    
    // Filter by status
    if (status !== '') {
      const isActive = status === 'true';
      filteredUsers = filteredUsers.filter(user => user.is_active === isActive);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Add role info
    const usersWithRoles = paginatedUsers.map(user => {
      const role = mockRoles.find(r => r.role_id === user.role_id);
      return {
        ...user,
        role_info: role
      };
    });
    
    res.json({
      success: true,
      data: {
        users: usersWithRoles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(filteredUsers.length / limit),
          total_items: filteredUsers.length,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy thông tin user theo ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = mockUsers.find(u => u.user_id === parseInt(id));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    const role = mockRoles.find(r => r.role_id === user.role_id);
    
    res.json({
      success: true,
      data: {
        ...user,
        role_info: role
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Tạo user mới
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res) => {
  try {
    const { username, password, full_name, email, phone, role_id } = req.body;
    
    // Validation
    if (!username || !password || !full_name || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }
    
    // Check if username exists
    const existingUser = mockUsers.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username đã tồn tại'
      });
    }
    
    // Check if email exists
    if (email) {
      const existingEmail = mockUsers.find(u => u.email === email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }
    }
    
    // Check if role exists
    const role = mockRoles.find(r => r.role_id === parseInt(role_id));
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role không tồn tại'
      });
    }
    
    // Create new user
    const newUser = {
      user_id: mockUsers.length + 1,
      username,
      password, // In real app, hash this password
      full_name,
      email: email || null,
      phone: phone || null,
      role_id: parseInt(role_id),
      role_name: role.role_name,
      is_active: true,
      last_login: null,
      created_at: new Date()
    };
    
    mockUsers.push(newUser);
    
    res.status(201).json({
      success: true,
      message: 'Tạo user thành công',
      data: {
        ...newUser,
        role_info: role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cập nhật user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, email, phone, role_id, is_active } = req.body;
    
    const userIndex = mockUsers.findIndex(u => u.user_id === parseInt(id));
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    // Check if username exists (excluding current user)
    if (username) {
      const existingUser = mockUsers.find(u => u.username === username && u.user_id !== parseInt(id));
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username đã tồn tại'
        });
      }
    }
    
    // Check if email exists (excluding current user)
    if (email) {
      const existingEmail = mockUsers.find(u => u.email === email && u.user_id !== parseInt(id));
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }
    }
    
    // Check if role exists
    if (role_id) {
      const role = mockRoles.find(r => r.role_id === parseInt(role_id));
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Role không tồn tại'
        });
      }
    }
    
    // Update user
    const updatedUser = {
      ...mockUsers[userIndex],
      username: username || mockUsers[userIndex].username,
      full_name: full_name || mockUsers[userIndex].full_name,
      email: email || mockUsers[userIndex].email,
      phone: phone || mockUsers[userIndex].phone,
      role_id: role_id ? parseInt(role_id) : mockUsers[userIndex].role_id,
      role_name: role_id ? mockRoles.find(r => r.role_id === parseInt(role_id)).role_name : mockUsers[userIndex].role_name,
      is_active: is_active !== undefined ? is_active : mockUsers[userIndex].is_active
    };
    
    mockUsers[userIndex] = updatedUser;
    
    const role = mockRoles.find(r => r.role_id === updatedUser.role_id);
    
    res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: {
        ...updatedUser,
        role_info: role
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Xóa user (vô hiệu hóa)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const userIndex = mockUsers.findIndex(u => u.user_id === parseInt(id));
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    // Check if trying to delete admin
    if (mockUsers[userIndex].role_name === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản admin'
      });
    }
    
    // Soft delete - set is_active to false
    mockUsers[userIndex].is_active = false;
    
    res.json({
      success: true,
      message: 'Xóa user thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy danh sách roles
// @route   GET /api/users/roles
// @access  Private (Admin only)
const getRoles = async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockRoles
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách roles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Thống kê users
// @route   GET /api/users/statistics
// @access  Private (Admin only)
const getUserStatistics = async (req, res) => {
  try {
    const totalUsers = mockUsers.length;
    const activeUsers = mockUsers.filter(u => u.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    const roleStats = mockRoles.map(role => ({
      role_name: role.role_name,
      role_description: role.description,
      count: mockUsers.filter(u => u.role_id === role.role_id).length,
      active_count: mockUsers.filter(u => u.role_id === role.role_id && u.is_active).length
    }));
    
    const recentLogins = mockUsers
      .filter(u => u.last_login)
      .sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        full_name: u.full_name,
        last_login: u.last_login
      }));
    
    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: inactiveUsers,
        role_statistics: roleStats,
        recent_logins: recentLogins
      }
    });
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getUserStatistics
};
