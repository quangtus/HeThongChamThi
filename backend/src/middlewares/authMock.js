const jwt = require('jsonwebtoken');

// Mock users data (giống như trong authControllerMock)
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    role_id: 1,
    role_name: 'admin',
    is_active: true
  },
  {
    user_id: 2,
    username: 'examiner',
    role_id: 2,
    role_name: 'examiner',
    is_active: true
  },
  {
    user_id: 3,
    username: 'candidate',
    role_id: 3,
    role_name: 'candidate',
    is_active: true
  }
];

// Middleware xác thực JWT (Mock version)
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    
    // Kiểm tra user trong mock data
    const user = mockUsers.find(u => u.user_id === decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Thêm thông tin user vào request
    req.user = {
      userId: user.user_id,
      username: user.username,
      roleId: user.role_id,
      roleName: user.role_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực'
    });
  }
};

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  if (req.user.roleName !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập'
    });
  }
  next();
};

// Middleware kiểm tra quyền examiner hoặc admin
const requireExaminerOrAdmin = (req, res, next) => {
  if (!['admin', 'examiner'].includes(req.user.roleName)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập'
    });
  }
  next();
};

// Middleware kiểm tra quyền theo role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  requireAdmin,
  requireExaminerOrAdmin,
  requireRole
};
