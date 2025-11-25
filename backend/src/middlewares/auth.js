const jwt = require('jsonwebtoken');

// Middleware kiểm tra token
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token không được cung cấp',
                code: 'NO_TOKEN'
            });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
            if (err) {
                console.error('Token verification error:', err);

                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        message: 'Token đã hết hạn',
                        code: 'TOKEN_EXPIRED'
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ',
                    code: 'INVALID_TOKEN'
                });
            }

            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực',
            code: 'AUTH_ERROR'
        });
    }
};

// Middleware kiểm tra role
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (req.user.roleName !== role && req.user.roleName !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    verifyToken: authenticateToken,
    requireRole
};