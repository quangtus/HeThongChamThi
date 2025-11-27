# 📥 Hướng dẫn Import Excel/CSV

## Tổng quan

Hệ thống hỗ trợ import dữ liệu từ file Excel (.xlsx, .xls) hoặc CSV (.csv) cho 3 loại đối tượng:
- **Users** (Người dùng)
- **Candidates** (Thí sinh)
- **Examiners** (Cán bộ chấm thi)

## ⚠️ QUAN TRỌNG: Thứ tự Import

**BẮT BUỘC phải import theo thứ tự:**
1. **Users** trước (với `role_id` đúng)
2. **Examiners/Candidates** sau (với `user_id` đã tồn tại)

**Lý do:**
- Examiners yêu cầu `user_id` có `role_id = 2`
- Candidates yêu cầu `user_id` có `role_id = 3`
- Nếu import examiners/candidates trước khi có users → sẽ bị lỗi

## 📋 1. Import Users

### Endpoint
```
POST /api/users/import
```

### File mẫu
- Excel: `users_template.xlsx`
- CSV: `users_template.csv`

### Cấu trúc file

| Cột | Bắt buộc | Mô tả | Ví dụ |
|-----|----------|-------|-------|
| `username` | ✅ | Tên đăng nhập (chỉ chữ, số, dấu gạch dưới) | `user001` |
| `password` | ❌ | Mật khẩu (mặc định: `default123`) | `password123` |
| `full_name` | ✅ | Họ và tên đầy đủ | `Nguyễn Văn A` |
| `email` | ❌ | Email (phải hợp lệ nếu có) | `user001@example.com` |
| `phone` | ❌ | Số điện thoại | `0123456789` |
| `role_id` | ❌ | Vai trò: 1=Admin, 2=Examiner, 3=Candidate (mặc định: 3) | `3` |
| `is_active` | ❌ | Trạng thái hoạt động (mặc định: true) | `true` |

### Lưu ý
- `username` và `email` phải unique trong hệ thống
- `role_id` phải là 1, 2 hoặc 3
- `password` tối thiểu 6 ký tự

### Ví dụ dữ liệu
```csv
username,password,full_name,email,phone,role_id,is_active
user001,password123,Nguyễn Văn A,user001@example.com,0123456789,3,true
user002,password123,Trần Thị B,user002@example.com,0987654321,3,true
```

---

## 📋 2. Import Candidates (Thí sinh)

### Endpoint
```
POST /api/candidates/import
```

### File mẫu
- Excel: `candidates_template.xlsx`
- CSV: `candidates_template.csv`

### Cấu trúc file

| Cột | Bắt buộc | Mô tả | Ví dụ |
|-----|----------|-------|-------|
| `user_id` | ⚠️ | ID người dùng (phải tồn tại với role_id = 3). **Có thể để trống nếu dùng `username`** | `2` |
| `username` | ⚠️ | Username của user (phải có role_id = 3). **KHUYẾN NGHỊ: Dùng thay cho `user_id`** | `user001` |
| `candidate_code` | ❌ | Mã thí sinh (tự động tạo nếu để trống) | `TS001` |
| `date_of_birth` | ✅ | Ngày sinh (định dạng YYYY-MM-DD) | `2000-01-15` |
| `identity_card` | ❌ | Số CMND/CCCD (9-20 ký tự, unique) | `123456789` |
| `address` | ❌ | Địa chỉ | `Hà Nội` |
| `is_active` | ❌ | Trạng thái hoạt động (mặc định: true) | `true` |

**Lưu ý:** Phải cung cấp **một trong hai**: `user_id` HOẶC `username`. 
- ✅ **KHUYẾN NGHỊ**: Dùng `username` (dễ liên kết với file users, không cần tra cứu `user_id`)
- ⚠️ Có thể dùng `user_id` (phải tra cứu sau khi import users)

### Lưu ý
- ⚠️ **QUAN TRỌNG**: Phải cung cấp **một trong hai**: `user_id` HOẶC `username`
- ✅ **KHUYẾN NGHỊ**: Dùng `username` (dễ liên kết với file users, không cần tra cứu)
- ⚠️ User phải tồn tại trong bảng `users` với `role_id = 3` (Thí sinh)
- ⚠️ User phải được tạo trước với role "Thí sinh" (role_id = 3)
- User không được có candidate record trước đó
- `candidate_code` phải unique nếu được cung cấp
- `identity_card` phải unique nếu được cung cấp
- `date_of_birth` phải đúng định dạng YYYY-MM-DD

### Quy trình Import (Khuyến nghị)
1. **Bước 1**: Import Users với `role_id = 3` (hoặc tạo thủ công)
2. **Bước 2**: Import Candidates với `username` từ bước 1
   - Copy `username` từ file users đã import
   - Để trống `user_id`, điền `username`
   - Hệ thống tự động tìm `user_id` tương ứng

### Ví dụ dữ liệu (Dùng username - Khuyến nghị)
```csv
user_id,username,candidate_code,date_of_birth,identity_card,address,is_active
,user001,TS001,2000-01-15,123456789,Hà Nội,true
,user002,TS002,2000-02-20,987654321,TP.HCM,true
```

### Ví dụ dữ liệu (Dùng user_id - Không khuyến nghị)
```csv
user_id,username,candidate_code,date_of_birth,identity_card,address,is_active
2,,TS001,2000-01-15,123456789,Hà Nội,true
3,,TS002,2000-02-20,987654321,TP.HCM,true
```
**Lưu ý:** Phải tra cứu `user_id` sau khi import users → Bất tiện!

---

## 📋 3. Import Examiners (Cán bộ chấm thi)

### Endpoint
```
POST /api/examiners/import
```

### File mẫu
- Excel: `examiners_template.xlsx`
- CSV: `examiners_template.csv`

### Cấu trúc file

| Cột | Bắt buộc | Mô tả | Ví dụ |
|-----|----------|-------|-------|
| `user_id` | ⚠️ | ID người dùng (phải tồn tại với role_id = 2). **Có thể để trống nếu dùng `username`** | `4` |
| `username` | ⚠️ | Username của user (phải có role_id = 2). **KHUYẾN NGHỊ: Dùng thay cho `user_id`** | `examiner001` |
| `examiner_code` | ❌ | Mã cán bộ (tự động tạo nếu để trống) | `CB001` |
| `specialization` | ❌ | Chuyên môn (tối đa 100 ký tự) | `Toán học` |
| `experience_years` | ❌ | Số năm kinh nghiệm (0-50, mặc định: 0) | `5` |
| `certification_level` | ❌ | Cấp độ: JUNIOR, SENIOR, EXPERT (mặc định: JUNIOR) | `SENIOR` |
| `is_active` | ❌ | Trạng thái hoạt động (mặc định: true) | `true` |

**Lưu ý:** Phải cung cấp **một trong hai**: `user_id` HOẶC `username`. 
- ✅ **KHUYẾN NGHỊ**: Dùng `username` (dễ liên kết với file users, không cần tra cứu `user_id`)
- ⚠️ Có thể dùng `user_id` (phải tra cứu sau khi import users)

### Lưu ý
- ⚠️ **QUAN TRỌNG**: Phải cung cấp **một trong hai**: `user_id` HOẶC `username`
- ✅ **KHUYẾN NGHỊ**: Dùng `username` (dễ liên kết với file users, không cần tra cứu)
- ⚠️ User phải tồn tại trong bảng `users` với `role_id = 2` (Cán bộ chấm thi)
- ⚠️ User phải được tạo trước với role "Cán bộ chấm thi" (role_id = 2)
- User không được có examiner record trước đó
- `examiner_code` phải unique nếu được cung cấp
- `certification_level` phải là: JUNIOR, SENIOR, hoặc EXPERT
- `experience_years` phải từ 0-50

### Quy trình Import (Khuyến nghị)
1. **Bước 1**: Import Users với `role_id = 2` (hoặc tạo thủ công)
2. **Bước 2**: Import Examiners với `username` từ bước 1
   - Copy `username` từ file users đã import
   - Để trống `user_id`, điền `username`
   - Hệ thống tự động tìm `user_id` tương ứng

### Ví dụ dữ liệu (Dùng username - Khuyến nghị)
```csv
user_id,username,examiner_code,specialization,experience_years,certification_level,is_active
,examiner001,CB001,Toán học,5,SENIOR,true
,,CB002,Vật lý,3,JUNIOR,true
```

### Ví dụ dữ liệu (Dùng user_id - Không khuyến nghị)
```csv
user_id,username,examiner_code,specialization,experience_years,certification_level,is_active
4,,CB001,Toán học,5,SENIOR,true
```
**Lưu ý:** Phải tra cứu `user_id` sau khi import users → Bất tiện!

---

## 🔄 Quy trình Import

### Bước 1: Chuẩn bị file
1. Tải file mẫu từ thư mục `backend/`
2. Điền thông tin theo đúng cấu trúc
3. Lưu file với định dạng .xlsx, .xls hoặc .csv

### Bước 2: Upload file
- Sử dụng form upload với field name: `file`
- File tối đa 10MB

### Bước 3: Kiểm tra kết quả
Response sẽ trả về:
```json
{
  "success": true,
  "message": "Import hoàn tất: 5 thành công, 2 lỗi",
  "data": {
    "success": 5,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "message": "Username đã tồn tại",
        "data": { "username": "user001", "email": "" }
      }
    ]
  }
}
```

---

## ⚠️ Lỗi thường gặp

### 1. Users
- **"Username đã tồn tại"**: Username đã có trong hệ thống
- **"Email đã tồn tại"**: Email đã có trong hệ thống
- **"Email không hợp lệ"**: Định dạng email sai
- **"Password phải có ít nhất 6 ký tự"**: Password quá ngắn

### 2. Candidates
- **"Thiếu user_id hoặc username"**: Phải cung cấp một trong hai
- **"Username không tồn tại"**: `username` không có trong bảng users (phải import users trước)
- **"User ID không tồn tại"**: `user_id` không có trong bảng users
- **"User ID không phải là thí sinh"**: User có `role_id` khác 3
- **"User ID đã có thông tin thí sinh rồi"**: User đã có candidate record
- **"Mã thí sinh đã tồn tại"**: `candidate_code` bị trùng
- **"Số CMND/CCCD đã tồn tại"**: `identity_card` bị trùng
- **"date_of_birth phải có định dạng YYYY-MM-DD"**: Định dạng ngày sai

### 3. Examiners
- **"Thiếu user_id hoặc username"**: Phải cung cấp một trong hai
- **"Username không tồn tại"**: `username` không có trong bảng users (phải import users trước)
- **"User ID không tồn tại"**: `user_id` không có trong bảng users
- **"User ID không phải là cán bộ chấm thi"**: User có `role_id` khác 2
- **"User ID đã có thông tin cán bộ chấm thi rồi"**: User đã có examiner record
- **"Mã cán bộ đã tồn tại"**: `examiner_code` bị trùng
- **"certification_level phải là JUNIOR, SENIOR hoặc EXPERT"**: Giá trị không hợp lệ

---

## 📝 Best Practices

1. **Kiểm tra dữ liệu trước khi import**: Đảm bảo không có dữ liệu trùng lặp
2. **Import theo thứ tự**: Users → Candidates/Examiners
3. **✅ KHUYẾN NGHỊ: Dùng username thay vì user_id**: 
   - `user_id` là auto-increment, không thể biết trước
   - `username` dễ liên kết giữa các file, không cần tra cứu
   - Copy `username` từ file users sang file candidates/examiners
4. **Backup database**: Trước khi import số lượng lớn
5. **Test với file nhỏ**: Thử với 5-10 records trước
6. **Kiểm tra encoding**: File CSV nên dùng UTF-8
7. **Xử lý lỗi**: Kiểm tra phần `errors` trong response để sửa lại file

---

## 🔧 Xử lý CSV với Excel

Khi mở file CSV trong Excel:
1. File → Open → Chọn file CSV
2. Chọn encoding UTF-8
3. Chọn delimiter: Comma
4. Preview và xác nhận

Khi lưu từ Excel sang CSV:
1. File → Save As
2. Chọn format: CSV UTF-8 (Comma delimited) (*.csv)
3. Lưu file

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Định dạng file (.xlsx, .xls, .csv)
2. Cấu trúc cột đúng với mẫu
3. Dữ liệu không trùng lặp
4. Định dạng ngày tháng (YYYY-MM-DD)
5. Encoding UTF-8 cho file CSV

