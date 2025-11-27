const XLSX = require('xlsx');
const path = require('path');

// Create Users template
// Dữ liệu mẫu: 1 admin, 3 examiners, 5 candidates
const usersData = [
    ['username', 'password', 'full_name', 'email', 'phone', 'role_id', 'is_active'],
    ['admin001', 'password123', 'Phạm Văn Admin', 'admin001@example.com', '0123456789', '1', 'true'],
    ['examiner001', 'password123', 'Lê Văn Chấm', 'examiner001@example.com', '0111222333', '2', 'true'],
    ['examiner002', 'password123', 'Trần Thị Giám Khảo', 'examiner002@example.com', '0111222334', '2', 'true'],
    ['examiner003', 'password123', 'Nguyễn Văn Chấm Thi', 'examiner003@example.com', '0111222335', '2', 'true'],
    ['candidate001', 'password123', 'Nguyễn Văn Thí Sinh', 'candidate001@example.com', '0987654321', '3', 'true'],
    ['candidate002', 'password123', 'Trần Thị Học Sinh', 'candidate002@example.com', '0987654322', '3', 'true'],
    ['candidate003', 'password123', 'Lê Văn Sinh Viên', 'candidate003@example.com', '0987654323', '3', 'true'],
    ['candidate004', 'password123', 'Phạm Thị Thí Sinh', 'candidate004@example.com', '0987654324', '3', 'true'],
    ['candidate005', 'password123', 'Hoàng Văn Học Viên', 'candidate005@example.com', '0987654325', '3', 'true']
];

const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
const usersWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(usersWorkbook, usersSheet, 'Users');
XLSX.writeFile(usersWorkbook, path.join(__dirname, 'users_template.xlsx'));
console.log('✅ Created users_template.xlsx');

// Create Candidates template
// Note: Hỗ trợ cả user_id và username (khuyến nghị dùng username)
// - Nếu dùng username: để trống user_id, điền username từ file users
// - Nếu dùng user_id: điền user_id (phải tra cứu sau khi import users)
// Dữ liệu mẫu: 5 candidates liên kết với users có role_id = 3
const candidatesData = [
    ['user_id', 'username', 'candidate_code', 'date_of_birth', 'identity_card', 'address', 'is_active'],
    ['', 'candidate001', 'TS001', '2000-01-15', '123456789', 'Hà Nội', 'true'],
    ['', 'candidate002', 'TS002', '2000-02-20', '987654321', 'TP.HCM', 'true'],
    ['', 'candidate003', 'TS003', '2001-03-25', '111222333', 'Đà Nẵng', 'true'],
    ['', 'candidate004', 'TS004', '2000-04-10', '444555666', 'Hải Phòng', 'true'],
    ['', 'candidate005', 'TS005', '2001-05-15', '777888999', 'Cần Thơ', 'true']
];

const candidatesSheet = XLSX.utils.aoa_to_sheet(candidatesData);
const candidatesWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(candidatesWorkbook, candidatesSheet, 'Candidates');
XLSX.writeFile(candidatesWorkbook, path.join(__dirname, 'candidates_template.xlsx'));
console.log('✅ Created candidates_template.xlsx');

// Create Examiners template
// Note: Hỗ trợ cả user_id và username (khuyến nghị dùng username)
// - Nếu dùng username: để trống user_id, điền username từ file users
// - Nếu dùng user_id: điền user_id (phải tra cứu sau khi import users)
// Dữ liệu mẫu: 3 examiners liên kết với users có role_id = 2
const examinersData = [
    ['user_id', 'username', 'examiner_code', 'specialization', 'experience_years', 'certification_level', 'is_active'],
    ['', 'examiner001', 'CB001', 'Toán học', '5', 'SENIOR', 'true'],
    ['', 'examiner002', 'CB002', 'Vật lý', '8', 'EXPERT', 'true'],
    ['', 'examiner003', 'CB003', 'Hóa học', '3', 'JUNIOR', 'true']
];

const examinersSheet = XLSX.utils.aoa_to_sheet(examinersData);
const examinersWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(examinersWorkbook, examinersSheet, 'Examiners');
XLSX.writeFile(examinersWorkbook, path.join(__dirname, 'examiners_template.xlsx'));
console.log('✅ Created examiners_template.xlsx');

console.log('\n📝 Lưu ý QUAN TRỌNG:');
console.log('⚠️  THỨ TỰ IMPORT BẮT BUỘC:');
console.log('   1. Import Users TRƯỚC (với role_id đúng)');
console.log('   2. Import Examiners/Candidates SAU (với user_id hoặc username)');
console.log('');
console.log('📋 Chi tiết:');
console.log('- Users: role_id = 1 (Admin), 2 (Examiner), 3 (Candidate)');
console.log('- Candidates/Examiners: Hỗ trợ cả user_id và username');
console.log('  ✅ KHUYẾN NGHỊ: Dùng username (dễ liên kết với file users)');
console.log('  ⚠️  Có thể dùng user_id (phải tra cứu sau khi import users)');
console.log('- Candidates: username/user_id phải có role_id = 3');
console.log('- Examiners: username/user_id phải có role_id = 2');
console.log('- Các trường có thể để trống sẽ được tự động tạo (candidate_code, examiner_code)');
console.log('- date_of_birth phải có định dạng YYYY-MM-DD');
console.log('- certification_level: JUNIOR, SENIOR, hoặc EXPERT');
console.log('');
console.log('💡 CÁCH SỬ DỤNG TỐT NHẤT:');
console.log('   1. Import users_template.csv → Lấy danh sách username');
console.log('   2. Copy username vào candidates_template.csv hoặc examiners_template.csv');
console.log('   3. Để trống cột user_id, điền username');
console.log('   4. Import candidates/examiners → Hệ thống tự động tìm user_id');
console.log('');
console.log('❌ LỖI THƯỜNG GẶP:');
console.log('- Import Examiners/Candidates trước khi có Users → LỖI');
console.log('- username không tồn tại → LỖI (phải import users trước)');
console.log('- username có role_id sai → LỖI (examiner cần role_id=2, candidate cần role_id=3)');
console.log('- Thiếu cả user_id và username → LỖI (phải có một trong hai)');

