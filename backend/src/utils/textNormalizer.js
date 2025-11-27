const ACCENT_MAP_FROM = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const ACCENT_MAP_TO = [
    'a'.repeat(17),
    'e'.repeat(11),
    'i'.repeat(5),
    'o'.repeat(17),
    'u'.repeat(11),
    'y'.repeat(5),
    'd'
].join('');

/**
 * Remove Vietnamese diacritics using Unicode normalization.
 * @param {string} value
 * @returns {string}
 */
function normalizeVietnamese(value = '') {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

/**
 * Build a SQL snippet that removes Vietnamese accents from a column using translate().
 * The caller must bind params named in fromParamName/toParamName.
 * @param {string} columnExpression
 * @param {string} fromParamName
 * @param {string} toParamName
 * @returns {string}
 */
function buildAccentInsensitiveSql(columnExpression, fromParamName, toParamName) {
    return `translate(lower(COALESCE(${columnExpression}, '')), :${fromParamName}, :${toParamName})`;
}

module.exports = {
    ACCENT_MAP_FROM,
    ACCENT_MAP_TO,
    normalizeVietnamese,
    buildAccentInsensitiveSql
};

