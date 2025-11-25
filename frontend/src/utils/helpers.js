// Utility functions for frontend

/**
 * Get error message from API response
 * Compatible with older JavaScript without optional chaining
 */
export const getErrorMessage = (error) => {
    if (error.response && error.response.data) {
        if (error.response.data.message) {
            return error.response.data.message;
        }
        if (error.response.data.errors && error.response.data.errors[0] && error.response.data.errors[0].msg) {
            return error.response.data.errors[0].msg;
        }
    }
    return error.message || 'Đã xảy ra lỗi không xác định';
};

/**
 * Get pagination pages from response
 */
export const getPaginationPages = (response) => {
    if (response && response.pagination && response.pagination.pages) {
        return response.pagination.pages;
    }
    return 1;
};

/**
 * Get nested property safely
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return defaultValue;
        }
    }

    return result !== undefined ? result : defaultValue;
};

/**
 * Format date to Vietnamese format
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
};

/**
 * Format datetime to Vietnamese format
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
};