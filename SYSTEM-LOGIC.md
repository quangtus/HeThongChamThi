# 📋 Hệ thống Thi và Chấm thi - Logic Tổng quan

## 🗄️ Cấu trúc Database

### Các bảng chính:

| Bảng | Mô tả |
|------|-------|
| `roles` | 3 vai trò: admin (1), examiner (2), candidate (3) |
| `users` | Thông tin người dùng (username, password, email, phone, full_name) |
| `examiners` | Thông tin cán bộ chấm thi (liên kết user_id có role_id=2) |
| `candidates` | Thông tin thí sinh (liên kết user_id có role_id=3) |
| `subjects` | Môn thi |
| `candidate_exam_registrations` | Đăng ký thi của thí sinh |

### Quan hệ quan trọng:

```
users (1) ──────┬───► (0..1) examiners    [chỉ khi role_id = 2]
               └───► (0..1) candidates    [chỉ khi role_id = 3]
```

- Mỗi `user` có thể là admin, examiner, hoặc candidate tùy theo `role_id`
- User với `role_id = 2` (examiner) **PHẢI CÓ** record trong bảng `examiners`
- User với `role_id = 3` (candidate) **PHẢI CÓ** record trong bảng `candidates`
- `full_name`, `email`, `phone` nằm trong bảng `users` (KHÔNG CÓ trong examiners/candidates)

## 🔐 Authentication

### Login Flow:
1. POST `/api/auth/login` với `{ username, password }`
2. Kiểm tra user tồn tại và is_active = true
3. So sánh password với bcrypt
4. Trả về JWT token (hết hạn sau 24h)

### Tài khoản mẫu:
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Examiner | examiner | examiner123 |
| Candidate | candidate | candidate123 |

## 📥 Import Logic

### Import Examiners (POST /api/examiners/import):
1. Đọc file Excel với các cột: `user_id`, `examiner_code`, `specialization`, `experience_years`, `certification_level`
2. Kiểm tra:
   - ✅ `user_id` tồn tại trong bảng `users`
   - ✅ User có `role_id = 2` (examiner)
   - ✅ User chưa có record trong `examiners`
   - ✅ `examiner_code` không trùng (nếu có)
3. Tự động tạo `examiner_code` nếu không có

### Import Candidates (POST /api/candidates/import):
1. Đọc file Excel với các cột: `user_id`, `candidate_code`, `date_of_birth`, `identity_card`, `address`
2. Kiểm tra:
   - ✅ `user_id` tồn tại trong bảng `users`
   - ✅ User có `role_id = 3` (candidate)
   - ✅ User chưa có record trong `candidates`
   - ✅ `candidate_code` không trùng (nếu có)
   - ✅ `identity_card` không trùng (nếu có)
3. Tự động tạo `candidate_code` nếu không có

## 📁 Cấu trúc Source Code

```
backend/
├── src/
│   ├── config/db.js          # Kết nối PostgreSQL
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── examinerController.js
│   │   ├── candidateController.js
│   │   └── subjectController.js
│   ├── models/               # Database operations
│   │   ├── User.js
│   │   ├── Examiner.js
│   │   ├── Candidate.js
│   │   └── Subject.js
│   ├── routes/               # API routes
│   ├── middlewares/          # Auth middleware
│   └── seeders/              # Dữ liệu mẫu
│       └── authSeeder.js

frontend/
├── src/
│   ├── api/                  # API calls
│   ├── components/           # React components
│   ├── pages/                # Page components
│   └── router/               # Routes
```

## 🚀 Chạy hệ thống

```bash
# Cách 1: Dùng file bat
start-project.bat    # Khởi động toàn bộ hệ thống
stop-project.bat     # Dừng hệ thống

# Cách 2: Thủ công
cd backend && yarn && yarn dev
cd frontend && yarn && yarn dev
```

## 🔍 API Endpoints chính

### Auth
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/profile` - Lấy thông tin user hiện tại

### Users
- `GET /api/users` - Danh sách users
- `POST /api/users` - Tạo user mới
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

### Examiners
- `GET /api/examiners` - Danh sách cán bộ chấm thi
- `POST /api/examiners` - Tạo mới
- `POST /api/examiners/import` - Import từ Excel
- `PUT /api/examiners/:id` - Cập nhật
- `DELETE /api/examiners/:id` - Xóa

### Candidates
- `GET /api/candidates` - Danh sách thí sinh
- `POST /api/candidates` - Tạo mới
- `POST /api/candidates/import` - Import từ Excel
- `PUT /api/candidates/:id` - Cập nhật
- `DELETE /api/candidates/:id` - Xóa

### Subjects
- `GET /api/subjects` - Danh sách môn thi
- `POST /api/subjects` - Tạo mới
- `PUT /api/subjects/:id` - Cập nhật
- `DELETE /api/subjects/:id` - Xóa

## ⚠️ Lưu ý quan trọng

1. **Tính nhất quán dữ liệu**: Khi tạo user với role examiner/candidate, cần tạo thêm record trong bảng examiners/candidates tương ứng

2. **Import yêu cầu user_id**: Import examiner/candidate từ Excel yêu cầu user_id đã tồn tại và có role đúng

3. **Thông tin cá nhân ở bảng users**: `full_name`, `email`, `phone` nằm trong bảng `users`, KHÔNG PHẢI trong `examiners` hay `candidates`
