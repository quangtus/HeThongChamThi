const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

// Script tạo dữ liệu mẫu cho authentication
async function seedAuthData() {
    try {
        console.log('🌱 Bắt đầu tạo dữ liệu mẫu cho authentication...');

        // 1. Chỉ giữ 3 role chính và dọn dẹp 2 role còn lại nếu có
        const allowedRoles = ['admin', 'examiner', 'candidate'];

        // Deactivate users thuộc các role không còn dùng
        await query(
            'UPDATE users SET is_active = false WHERE role_id IN (SELECT role_id FROM roles WHERE role_name IN (:r1, :r2))', { r1: 'supervisor', r2: 'data_manager' }
        );

        // Deactivate các role không còn dùng
        await query(
            'UPDATE roles SET is_active = false WHERE role_name IN (:r1, :r2)', { r1: 'supervisor', r2: 'data_manager' }
        );

        // Tạo 3 role chính nếu chưa có
        const roles = [{
                role_name: 'admin',
                description: 'Quản trị viên hệ thống',
                permissions: JSON.stringify({ all: true })
            },
            {
                role_name: 'examiner',
                description: 'Cán bộ chấm thi',
                permissions: JSON.stringify({
                    grade: true,
                    view_reports: true,
                    manage_assignments: true
                })
            },
            {
                role_name: 'candidate',
                description: 'Thí sinh',
                permissions: JSON.stringify({
                    take_exam: true,
                    view_results: true
                })
            }
        ];

        for (const role of roles) {
            const [existingRole] = await query(
                'SELECT role_id FROM roles WHERE role_name = :role_name', { role_name: role.role_name }
            );

            if (!existingRole) {
                await query(
                    'INSERT INTO roles (role_name, description, permissions) VALUES (:role_name, :description, :permissions)',
                    role
                );
                console.log(`✅ Đã tạo role: ${role.role_name}`);
            } else {
                console.log(`ℹ️  Role ${role.role_name} đã tồn tại`);
            }
        }

        // 2. Tạo users mẫu
        const users = [{
                username: 'admin',
                password: 'admin123',
                full_name: 'Quản trị viên hệ thống',
                email: 'admin@examgrading.edu.vn',
                phone: '0123456789',
                role_name: 'admin'
            },
            {
                username: 'examiner',
                password: 'examiner123',
                full_name: 'Nguyễn Văn Chấm',
                email: 'examiner@examgrading.edu.vn',
                phone: '0123456788',
                role_name: 'examiner'
            },
            {
                username: 'candidate',
                password: 'candidate123',
                full_name: 'Trần Thị Thí Sinh',
                email: 'candidate@examgrading.edu.vn',
                phone: '0123456787',
                role_name: 'candidate'
            },
            {
                username: 'candidate1',
                password: 'candidate123',
                full_name: 'Nguyễn Văn A',
                email: 'candidate1@example.com',
                phone: '0123456786',
                role_name: 'candidate'
            },
            {
                username: 'candidate2',
                password: 'candidate123',
                full_name: 'Trần Thị B',
                email: 'candidate2@example.com',
                phone: '0123456785',
                role_name: 'candidate'
            }
        ];

        for (const user of users) {
            // Kiểm tra user đã tồn tại chưa
            const [existingUser] = await query(
                'SELECT user_id FROM users WHERE username = :username', { username: user.username }
            );

            if (!existingUser) {
                // Lấy role_id
                const [role] = await query(
                    'SELECT role_id FROM roles WHERE role_name = :role_name', { role_name: user.role_name }
                );

                if (role) {
                    // Hash password
                    const salt = await bcrypt.genSalt(12);
                    const hashedPassword = await bcrypt.hash(user.password, salt);

                    // Tạo user
                    await query(
                        `INSERT INTO users (username, password, full_name, email, phone, role_id, is_active) 
             VALUES (:username, :password, :full_name, :email, :phone, :role_id, :is_active)`, {
                            username: user.username,
                            password: hashedPassword,
                            full_name: user.full_name,
                            email: user.email,
                            phone: user.phone,
                            role_id: role.role_id,
                            is_active: true
                        }
                    );

                    console.log(`✅ Đã tạo user: ${user.username} (${user.full_name})`);
                } else {
                    console.log(`❌ Không tìm thấy role: ${user.role_name}`);
                }
            } else {
                console.log(`ℹ️  User ${user.username} đã tồn tại`);
            }
        }

        // 3. Tạo subjects mẫu
        const subjects = [{
                subject_code: 'MATH',
                subject_name: 'Toán học',
                description: 'Môn thi Toán học - Trắc nghiệm và Tự luận'
            },
            {
                subject_code: 'PHYS',
                subject_name: 'Vật lý',
                description: 'Môn thi Vật lý - Trắc nghiệm và Tự luận'
            },
            {
                subject_code: 'CHEM',
                subject_name: 'Hóa học',
                description: 'Môn thi Hóa học - Trắc nghiệm và Tự luận'
            },
            {
                subject_code: 'BIO',
                subject_name: 'Sinh học',
                description: 'Môn thi Sinh học - Trắc nghiệm và Tự luận'
            },
            {
                subject_code: 'ENG',
                subject_name: 'Tiếng Anh',
                description: 'Môn thi Tiếng Anh - Trắc nghiệm và Tự luận'
            }
        ];

        for (const subject of subjects) {
            const [existingSubject] = await query(
                'SELECT subject_id FROM subjects WHERE subject_code = :subject_code', { subject_code: subject.subject_code }
            );

            if (!existingSubject) {
                await query(
                    'INSERT INTO subjects (subject_code, subject_name, description) VALUES (:subject_code, :subject_name, :description)',
                    subject
                );
                console.log(`✅ Đã tạo subject: ${subject.subject_name}`);
            } else {
                console.log(`ℹ️  Subject ${subject.subject_name} đã tồn tại`);
            }
        }

        // 4. Tạo examiners mẫu (liên kết với user có role examiner)
        const examiners = [{
            examiner_code: 'CB001',
            username: 'examiner',
            specialization: 'Toán học',
            experience_years: 5,
            certification_level: 'SENIOR'
        }];

        for (const examiner of examiners) {
            // Lấy user_id
            const [user] = await query(
                'SELECT user_id FROM users WHERE username = :username', { username: examiner.username }
            );

            if (user) {
                // Kiểm tra examiner đã tồn tại chưa
                const [existingExaminer] = await query(
                    'SELECT examiner_id FROM examiners WHERE user_id = :user_id', { user_id: user.user_id }
                );

                if (!existingExaminer) {
                    await query(
                        `INSERT INTO examiners (examiner_code, user_id, specialization, experience_years, certification_level) 
             VALUES (:examiner_code, :user_id, :specialization, :experience_years, :certification_level)`, {
                            examiner_code: examiner.examiner_code,
                            user_id: user.user_id,
                            specialization: examiner.specialization,
                            experience_years: examiner.experience_years,
                            certification_level: examiner.certification_level
                        }
                    );

                    console.log(`✅ Đã tạo examiner: ${examiner.examiner_code}`);
                } else {
                    console.log(`ℹ️  Examiner cho user ${examiner.username} đã tồn tại`);
                }
            } else {
                console.log(`❌ Không tìm thấy user: ${examiner.username}`);
            }
        }

        // 5. Tạo candidates mẫu (chỉ chứa thông tin bổ sung, thông tin cá nhân lấy từ users)
        const candidates = [{
                candidate_code: 'TS001',
                username: 'candidate1',
                date_of_birth: '2000-01-15',
                identity_card: '123456789',
                address: 'Hà Nội'
            },
            {
                candidate_code: 'TS002',
                username: 'candidate2',
                date_of_birth: '2000-02-20',
                identity_card: '987654321',
                address: 'TP.HCM'
            },
            {
                candidate_code: 'TS003',
                username: 'candidate',
                date_of_birth: '2000-05-15',
                identity_card: '111222333',
                address: 'Đà Nẵng'
            }
        ];

        for (const candidate of candidates) {
            // Lấy user_id
            const [user] = await query(
                'SELECT user_id FROM users WHERE username = :username', { username: candidate.username }
            );

            if (user) {
                // Kiểm tra candidate đã tồn tại chưa theo user_id
                const [existingCandidate] = await query(
                    'SELECT candidate_id FROM candidates WHERE user_id = :user_id', { user_id: user.user_id }
                );

                if (!existingCandidate) {
                    // Tạo candidate (schema: candidate_code, user_id, date_of_birth, identity_card, address)
                    await query(
                        `INSERT INTO candidates (candidate_code, user_id, date_of_birth, identity_card, address) 
             VALUES (:candidate_code, :user_id, :date_of_birth, :identity_card, :address)`, {
                            candidate_code: candidate.candidate_code,
                            user_id: user.user_id,
                            date_of_birth: candidate.date_of_birth,
                            identity_card: candidate.identity_card,
                            address: candidate.address
                        }
                    );

                    console.log(`✅ Đã tạo candidate: ${candidate.candidate_code}`);
                } else {
                    console.log(`ℹ️  Candidate cho user ${candidate.username} đã tồn tại`);
                }
            } else {
                console.log(`❌ Không tìm thấy user: ${candidate.username}`);
            }
        }

        // 6. Tạo đăng ký thi mẫu
        const registrations = [{
                candidate_code: 'TS001',
                subject_code: 'MATH',
                exam_type: 'BOTH',
                status: 'APPROVED',
                exam_session: 'Ca 1',
                exam_room: 'P101',
                seat_number: 'A01'
            },
            {
                candidate_code: 'TS001',
                subject_code: 'PHYS',
                exam_type: 'MCQ',
                status: 'APPROVED',
                exam_session: 'Ca 2',
                exam_room: 'P102',
                seat_number: 'A02'
            },
            {
                candidate_code: 'TS002',
                subject_code: 'MATH',
                exam_type: 'ESSAY',
                status: 'PENDING'
            },
            {
                candidate_code: 'TS002',
                subject_code: 'CHEM',
                exam_type: 'BOTH',
                status: 'APPROVED',
                exam_session: 'Ca 1',
                exam_room: 'P103',
                seat_number: 'B01'
            }
        ];

        for (const registration of registrations) {
            // Lấy candidate_id và subject_id
            const [candidate] = await query(
                'SELECT candidate_id FROM candidates WHERE candidate_code = :candidate_code', { candidate_code: registration.candidate_code }
            );

            const [subject] = await query(
                'SELECT subject_id FROM subjects WHERE subject_code = :subject_code', { subject_code: registration.subject_code }
            );

            if (candidate && subject) {
                // Kiểm tra đăng ký đã tồn tại chưa
                const [existingRegistration] = await query(
                    'SELECT registration_id FROM candidate_exam_registrations WHERE candidate_id = :candidate_id AND subject_id = :subject_id', { candidate_id: candidate.candidate_id, subject_id: subject.subject_id }
                );

                if (!existingRegistration) {
                    // Tạo đăng ký thi
                    await query(
                        `INSERT INTO candidate_exam_registrations (candidate_id, subject_id, exam_type, status, exam_session, exam_room, seat_number) 
             VALUES (:candidate_id, :subject_id, :exam_type, :status, :exam_session, :exam_room, :seat_number)`, {
                            candidate_id: candidate.candidate_id,
                            subject_id: subject.subject_id,
                            exam_type: registration.exam_type,
                            status: registration.status,
                            exam_session: registration.exam_session || null,
                            exam_room: registration.exam_room || null,
                            seat_number: registration.seat_number || null
                        }
                    );

                    console.log(`✅ Đã tạo đăng ký thi: ${registration.candidate_code} - ${registration.subject_code}`);
                } else {
                    console.log(`ℹ️  Đăng ký thi ${registration.candidate_code} - ${registration.subject_code} đã tồn tại`);
                }
            } else {
                console.log(`❌ Không tìm thấy candidate hoặc subject: ${registration.candidate_code} - ${registration.subject_code}`);
            }
        }

        console.log('🎉 Hoàn thành tạo dữ liệu mẫu cho authentication!');
        console.log('\n📋 Tài khoản demo có thể sử dụng:');
        console.log('👑 Admin: admin / admin123');
        console.log('👨‍🏫 Examiner: examiner / examiner123');
        console.log('👨‍🎓 Candidate: candidate / candidate123');
        console.log('👨‍🎓 Candidate1: candidate1 / candidate123');
        console.log('👨‍🎓 Candidate2: candidate2 / candidate123');
        // Chỉ còn 3 role chính

    } catch (error) {
        console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
        throw error;
    }
}

// Chạy seeder nếu file được gọi trực tiếp
if (require.main === module) {
    seedAuthData()
        .then(() => {
            console.log('✅ Seeder hoàn thành');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeder thất bại:', error);
            process.exit(1);
        });
}

module.exports = { seedAuthData };