# Hệ Thống Thi và Chấm Thi Trực Tuyến

Hệ thống quản lý thi trắc nghiệm và tự luận với các tính năng:
- Quản lý đề thi MCQ (trắc nghiệm)
- Quản lý đề thi tự luận (Essay)
- Phân công chấm thi tự động
- Thống kê kết quả

## 🚀 Cài đặt nhanh

### Yêu cầu hệ thống
- **Node.js** >= 18.x
- **Yarn** (cài bằng `npm install -g yarn` hoặc `corepack enable`)
- **PostgreSQL** database (khuyến nghị dùng Supabase hoặc Aiven)

### Bước 1: Clone dự án
```bash
git clone https://github.com/quangtus/HeThongChamThi.git
cd HeThongChamThi
```

### Bước 2: Cấu hình database (⚠️ BẮT BUỘC)
Sao chép file cấu hình mẫu và điền thông tin thật:

```bash
copy backend\.env.example backend\.env
```

Mở file `backend\.env` và thay thế các giá trị:

```env
## Database - PostgreSQL
PGHOST=your_database_host_here          # VD: aws-xxx.supabase.com
PGPORT=5432                              # Hoặc 6543 cho Supabase pooler
PGUSER=your_database_user_here           # VD: postgres.xxxxx
PGPASSWORD=your_database_password_here   # Mật khẩu database
PGDATABASE=your_database_name_here       # VD: postgres
PGSSL=true

## JWT Secret (đổi thành chuỗi ngẫu nhiên)
JWT_SECRET=your_random_secret_key_here

## AWS S3 (nếu dùng upload file)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=your_s3_bucket_name_here
```

### Bước 3: Khởi động dự án
**Windows:**
```bash
start-project.bat
```

**Hoặc chạy thủ công:**
```bash
# Terminal 1 - Backend
cd backend
yarn install
node src/app.js

# Terminal 2 - Frontend
cd frontend
yarn install
yarn dev
```

### Bước 4: Truy cập hệ thống
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

### Tài khoản demo
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Examiner | examiner | examiner123 |
| Candidate | candidate | candidate123 |

## 📁 Cấu trúc dự án

```
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── controllers/   # Xử lý logic
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── middlewares/   # Auth, upload
│   └── .env              # Cấu hình (không commit)
├── frontend/          # React + Vite
│   └── src/
│       ├── pages/        # Các trang
│       ├── components/   # Components dùng chung
│       └── api/          # API calls
├── DB_v2.sql          # Schema database
├── start-project.bat  # Script khởi động Windows
└── stop-project.bat   # Script dừng Windows
```

## 🛠️ Khắc phục sự cố

### Lỗi kết nối database
- Kiểm tra file `backend/.env` đã có thông tin đúng chưa
- Chạy `node backend/check-db.js` để test kết nối

### Lỗi "port already in use"
```bash
# Dừng tất cả Node.js processes
taskkill /F /IM node.exe
# Hoặc chạy
stop-project.bat
```

### Lỗi dependencies
```bash
cd backend && yarn install
cd frontend && yarn install
```

## 📄 License
MIT License
