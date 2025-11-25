/**
 * Form Validation & Data Transformation Helpers
 * Đảm bảo data gửi lên backend đúng format với database schema
 */

/**
 * Validate và transform Subject form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateSubjectForm(formData) {
    const errors = [];

    // subject_code: required, uppercase, max 20 chars
    if (!formData.subject_code || formData.subject_code.trim() === '') {
        errors.push('Mã môn không được để trống');
    } else if (formData.subject_code.length > 20) {
        errors.push('Mã môn không được quá 20 ký tự');
    }

    // subject_name: required, max 100 chars
    if (!formData.subject_name || formData.subject_name.trim() === '') {
        errors.push('Tên môn không được để trống');
    } else if (formData.subject_name.length > 100) {
        errors.push('Tên môn không được quá 100 ký tự');
    }

    // is_active: MUST be boolean
    if (typeof formData.is_active !== 'boolean') {
        errors.push('Trạng thái phải là boolean (true/false)');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        subject_code: formData.subject_code.trim().toUpperCase(),
        subject_name: formData.subject_name.trim(),
        description: formData.description ? formData.description.trim() : null,
        is_active: formData.is_active // Boolean
    };
}

/**
 * Validate và transform Exam Essay form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateExamEssayForm(formData) {
    const errors = [];

    // exam_code: required, uppercase, max 20 chars
    if (!formData.exam_code || formData.exam_code.trim() === '') {
        errors.push('Mã đề thi không được để trống');
    } else if (formData.exam_code.length > 20) {
        errors.push('Mã đề thi không được quá 20 ký tự');
    }

    // subject_id: required, must be positive integer
    const subjectId = parseInt(formData.subject_id);
    if (isNaN(subjectId) || subjectId <= 0) {
        errors.push('Vui lòng chọn môn thi');
    }

    // duration: required, must be positive integer
    const duration = parseInt(formData.duration);
    if (isNaN(duration) || duration <= 0) {
        errors.push('Thời gian thi phải là số dương');
    }

    // total_score: required, must be positive number
    const totalScore = parseFloat(formData.total_score);
    if (isNaN(totalScore) || totalScore <= 0) {
        errors.push('Tổng điểm phải là số dương');
    }

    // exam_date: optional, but if provided must be valid date
    if (formData.exam_date && formData.exam_date.trim() !== '') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formData.exam_date)) {
            errors.push('Ngày thi phải theo định dạng YYYY-MM-DD');
        }
    }

    // is_active: MUST be boolean
    if (typeof formData.is_active !== 'boolean') {
        errors.push('Trạng thái phải là boolean (true/false)');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        exam_code: formData.exam_code.trim().toUpperCase(),
        subject_id: subjectId,
        duration: duration,
        total_score: totalScore,
        exam_date: formData.exam_date ? formData.exam_date.trim() : null,
        description: formData.description ? formData.description.trim() : null,
        is_active: formData.is_active // Boolean
    };
}

/**
 * Validate và transform Essay Question form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateEssayQuestionForm(formData) {
    const errors = [];

    // question_number: required, must be positive integer
    const questionNumber = parseInt(formData.question_number);
    if (isNaN(questionNumber) || questionNumber <= 0) {
        errors.push('Số thứ tự câu hỏi phải là số dương');
    }

    // question_text: required
    if (!formData.question_text || formData.question_text.trim() === '') {
        errors.push('Nội dung câu hỏi không được để trống');
    }

    // max_score: required, must be positive number
    const maxScore = parseFloat(formData.max_score);
    if (isNaN(maxScore) || maxScore <= 0) {
        errors.push('Điểm tối đa phải là số dương');
    }

    // grading_criteria: optional, but if provided must be valid JSON
    let gradingCriteria = null;
    if (formData.grading_criteria && formData.grading_criteria.trim() !== '') {
        try {
            gradingCriteria = JSON.parse(formData.grading_criteria);
            // Validate JSON structure (optional, tùy requirement)
            if (typeof gradingCriteria !== 'object') {
                errors.push('Tiêu chí chấm điểm phải là object JSON');
            }
        } catch (e) {
            errors.push('Tiêu chí chấm điểm phải là JSON hợp lệ: ' + e.message);
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        question_number: questionNumber,
        question_text: formData.question_text.trim(),
        max_score: maxScore,
        grading_criteria: gradingCriteria, // Object hoặc null, KHÔNG phải string
        suggested_answer: formData.suggested_answer ? formData.suggested_answer.trim() : null
    };
}

/**
 * Validate và transform Question Bank form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateQuestionBankForm(formData) {
    const errors = [];

    // bank_name: required, max 200 chars
    if (!formData.bank_name || formData.bank_name.trim() === '') {
        errors.push('Tên ngân hàng không được để trống');
    } else if (formData.bank_name.length > 200) {
        errors.push('Tên ngân hàng không được quá 200 ký tự');
    }

    // subject_id: required, must be positive integer
    const subjectId = parseInt(formData.subject_id);
    if (isNaN(subjectId) || subjectId <= 0) {
        errors.push('Vui lòng chọn môn thi');
    }

    // is_active: MUST be boolean
    if (typeof formData.is_active !== 'boolean') {
        errors.push('Trạng thái phải là boolean (true/false)');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        bank_name: formData.bank_name.trim(),
        subject_id: subjectId,
        description: formData.description ? formData.description.trim() : null,
        is_active: formData.is_active // Boolean
    };
}

/**
 * Validate và transform Bank Question form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateBankQuestionForm(formData) {
    const errors = [];

    // question_text: required
    if (!formData.question_text || formData.question_text.trim() === '') {
        errors.push('Nội dung câu hỏi không được để trống');
    }

    // question_type: required, must be valid ENUM
    const validTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE'];
    if (!validTypes.includes(formData.question_type)) {
        errors.push('Loại câu hỏi không hợp lệ. Chỉ chấp nhận: ' + validTypes.join(', '));
    }

    // difficulty_level: required, must be valid ENUM
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
    if (!validDifficulties.includes(formData.difficulty_level)) {
        errors.push('Độ khó không hợp lệ. Chỉ chấp nhận: ' + validDifficulties.join(', '));
    }

    // score: required, must be positive number
    const score = parseFloat(formData.score);
    if (isNaN(score) || score <= 0) {
        errors.push('Điểm số phải là số dương');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        question_text: formData.question_text.trim(),
        question_type: formData.question_type,
        difficulty_level: formData.difficulty_level,
        score: score,
        explanation: formData.explanation ? formData.explanation.trim() : null
    };
}

/**
 * Validate và transform Answer Choice form data
 * @param {Object} formData - Raw form data từ UI
 * @returns {Object} - Validated data sẵn sàng gửi API
 * @throws {Error} - Nếu validation fail
 */
export function validateAnswerChoiceForm(formData) {
    const errors = [];

    // answer_text: required
    if (!formData.answer_text || formData.answer_text.trim() === '') {
        errors.push('Nội dung đáp án không được để trống');
    }

    // is_correct: MUST be boolean
    if (typeof formData.is_correct !== 'boolean') {
        errors.push('Trạng thái đúng/sai phải là boolean (true/false)');
    }

    // answer_order: optional, but if provided must be positive integer
    let answerOrder = 1; // Default
    if (formData.answer_order !== undefined && formData.answer_order !== null) {
        answerOrder = parseInt(formData.answer_order);
        if (isNaN(answerOrder) || answerOrder <= 0) {
            errors.push('Thứ tự đáp án phải là số dương');
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        answer_text: formData.answer_text.trim(),
        is_correct: formData.is_correct, // Boolean
        answer_order: answerOrder
    };
}

/**
 * Format date từ database (ISO string) sang định dạng Việt Nam
 * @param {string} isoDateString - Ngày dạng ISO (2025-01-15T00:00:00Z)
 * @returns {string} - Ngày định dạng VN (15/01/2025)
 */
export function formatDateVN(isoDateString) {
    if (!isoDateString) return '-';
    const date = new Date(isoDateString);
    return date.toLocaleDateString('vi-VN');
}

/**
 * Format datetime từ database sang định dạng Việt Nam
 * @param {string} isoDateTimeString - Datetime dạng ISO
 * @returns {string} - Datetime định dạng VN (15/01/2025 14:30)
 */
export function formatDateTimeVN(isoDateTimeString) {
    if (!isoDateTimeString) return '-';
    const date = new Date(isoDateTimeString);
    return date.toLocaleString('vi-VN');
}

/**
 * Convert ngày từ input date (YYYY-MM-DD) sang ISO string
 * @param {string} dateString - Ngày dạng YYYY-MM-DD
 * @returns {string} - ISO date string
 */
export function toISODate(dateString) {
    if (!dateString || dateString.trim() === '') return null;
    return dateString; // HTML date input đã trả về format YYYY-MM-DD
}

/**
 * Helper: Format boolean thành badge text
 * @param {boolean} isActive - Trạng thái
 * @returns {Object} - {text, className}
 */
export function formatActiveStatus(isActive) {
    if (isActive) {
        return {
            text: '✓ Kích hoạt',
            className: 'badge badge-success'
        };
    } else {
        return {
            text: '⊘ Vô hiệu',
            className: 'badge badge-secondary'
        };
    }
}

/**
 * Helper: Format question type ENUM sang text tiếng Việt
 * @param {string} type - ENUM value
 * @returns {string}
 */
export function formatQuestionType(type) {
    const mapping = {
        'MULTIPLE_CHOICE': '📝 Trắc nghiệm',
        'TRUE_FALSE': '✓✗ Đúng/Sai'
    };
    return mapping[type] || type;
}

/**
 * Helper: Format difficulty level ENUM sang text tiếng Việt
 * @param {string} level - ENUM value
 * @returns {string}
 */
export function formatDifficulty(level) {
    const mapping = {
        'EASY': '🟢 Dễ',
        'MEDIUM': '🟡 Trung bình',
        'HARD': '🔴 Khó'
    };
    return mapping[level] || level;
}

/**
 * Utility: Safe JSON stringify với formatting
 * @param {any} obj - Object to stringify
 * @returns {string} - Formatted JSON string
 */
export function prettyJSON(obj) {
    if (!obj) return '';
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return String(obj);
    }
}

/**
 * Utility: Safe JSON parse
 * @param {string} jsonString - JSON string to parse
 * @returns {any} - Parsed object hoặc null nếu invalid
 */
export function safeJSONParse(jsonString) {
    if (!jsonString || jsonString.trim() === '') return null;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('JSON parse error:', e);
        return null;
    }
}

export default {
    // Validators
    validateSubjectForm,
    validateExamEssayForm,
    validateEssayQuestionForm,
    validateQuestionBankForm,
    validateBankQuestionForm,
    validateAnswerChoiceForm,

    // Formatters
    formatDateVN,
    formatDateTimeVN,
    toISODate,
    formatActiveStatus,
    formatQuestionType,
    formatDifficulty,

    // JSON Utilities
    prettyJSON,
    safeJSONParse
};