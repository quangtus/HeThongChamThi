/**
 * Utility functions for handling PostgreSQL errors
 */

/**
 * Handle PostgreSQL error codes and return appropriate error messages
 * @param {Error} error - The error object from PostgreSQL
 * @param {Object} customMessages - Custom error messages for specific cases
 * @returns {Object} - Error response object
 */
function handlePostgreSQLError(error, customMessages = {}) {
    console.error('PostgreSQL Error:', error);
    
    const defaultMessages = {
        // Unique constraint violation
        '23505': 'Dữ liệu đã tồn tại trong hệ thống',
        
        // Foreign key constraint violation
        '23503': 'Không thể thực hiện thao tác do ràng buộc dữ liệu',
        
        // Check constraint violation
        '23514': 'Dữ liệu không đúng định dạng hoặc không hợp lệ',
        
        // Not null constraint violation
        '23502': 'Thiếu thông tin bắt buộc',
        
        // Invalid input syntax
        '22P02': 'Định dạng dữ liệu không hợp lệ',
        
        // Connection errors
        'ECONNREFUSED': 'Không thể kết nối đến cơ sở dữ liệu',
        'ENOTFOUND': 'Không tìm thấy máy chủ cơ sở dữ liệu',
        'ETIMEDOUT': 'Kết nối đến cơ sở dữ liệu bị timeout'
    };
    
    // Merge custom messages with default messages
    const messages = { ...defaultMessages, ...customMessages };
    
    // Get error code
    const errorCode = error.code || error.errno;
    
    // Return appropriate error message
    if (messages[errorCode]) {
        return {
            success: false,
            message: messages[errorCode],
            errorCode: errorCode
        };
    }
    
    // Default error message
    return {
        success: false,
        message: 'Đã xảy ra lỗi không xác định',
        errorCode: errorCode,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
}

/**
 * Handle specific CRUD operation errors
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed (create, update, delete)
 * @param {string} entity - The entity being operated on (user, candidate, etc.)
 * @returns {Object} - Error response object
 */
function handleCRUDError(error, operation, entity) {
    const customMessages = {};
    
    // Custom messages based on operation and entity
    if (operation === 'create') {
        if (entity === 'user') {
            customMessages['23505'] = 'Username hoặc email đã tồn tại';
        } else if (entity === 'candidate') {
            customMessages['23505'] = 'Mã thí sinh hoặc số CMND/CCCD đã tồn tại';
        } else if (entity === 'examiner') {
            customMessages['23505'] = 'Mã cán bộ chấm thi đã tồn tại';
        } else if (entity === 'registration') {
            customMessages['23505'] = 'Thí sinh đã đăng ký môn thi này rồi';
        }
    } else if (operation === 'update') {
        if (entity === 'user') {
            customMessages['23505'] = 'Username hoặc email đã tồn tại';
            customMessages['23503'] = 'Role ID không tồn tại';
        } else if (entity === 'candidate') {
            customMessages['23505'] = 'Mã thí sinh hoặc số CMND/CCCD đã tồn tại';
        } else if (entity === 'examiner') {
            customMessages['23505'] = 'Mã cán bộ chấm thi đã tồn tại';
        }
    } else if (operation === 'delete') {
        if (entity === 'user') {
            customMessages['23503'] = 'Không thể xóa user vì đang được sử dụng bởi thí sinh hoặc cán bộ chấm thi';
        } else if (entity === 'candidate') {
            customMessages['23503'] = 'Không thể xóa thí sinh vì đã có đăng ký thi';
        } else if (entity === 'examiner') {
            customMessages['23503'] = 'Không thể xóa cán bộ chấm thi vì đã có phân công chấm thi';
        }
    }
    
    return handlePostgreSQLError(error, customMessages);
}

module.exports = {
    handlePostgreSQLError,
    handleCRUDError
};
