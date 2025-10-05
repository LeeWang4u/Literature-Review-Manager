# ============================================
# HƯỚNG DẪN RESET DATABASE
# ============================================

## VẤN ĐỀ ĐÃ SỬA
✅ Tag entity: Xóa @Index() trùng lặp
✅ User entity: Xóa @Index() trùng lặp  
✅ MySQL password: Đã cấu hình trong .env

## BẠN CẦN LÀM GÌ BÂY GIỜ?

### Bước 1: Mở MySQL Workbench (KHUYẾN NGHỊ)

1. Mở **MySQL Workbench**
2. Kết nối với server (username: root, password: root)
3. Click vào tab **Query** hoặc nhấn Ctrl+T
4. Dán và chạy 2 lệnh sau:

```sql
DROP DATABASE IF EXISTS literature_review_db;
CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Bạn sẽ thấy "Action completed successfully"

### Bước 2: Khởi động lại Backend

Quay lại terminal và chạy:

```bash
npm run start:dev
```

TypeORM sẽ TỰ ĐỘNG tạo tất cả các bảng!

## HOẶC: Sử dụng MySQL Command Line

Nếu bạn có MySQL trong PATH của Windows:

```bash
mysql -u root -proot -e "DROP DATABASE IF EXISTS literature_review_db; CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Rồi chạy:
```bash
npm run start:dev
```

## KẾT QUẢ MONG ĐỢI

Sau khi chạy `npm run start:dev`, bạn sẽ thấy:

```
✅ Database 'literature_review_db' is ready
[Nest] ... LOG [NestFactory] Starting Nest application...
[Nest] ... LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] ... LOG [RoutesResolver] AuthController {/api/auth}:
[Nest] ... LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
...
[Nest] ... LOG Application is running on: http://localhost:3000
```

TypeORM sẽ tạo 8 bảng:
- users
- papers  
- tags
- notes
- citations
- user_library
- pdf_files
- ai_summaries

## NẾU GẶP VẤN ĐỀ

- ❓ MySQL Workbench không mở được? → Cài đặt từ https://dev.mysql.com/downloads/workbench/
- ❓ Không nhớ mật khẩu MySQL? → Kiểm tra file .env (DB_PASSWORD=root)
- ❓ Vẫn lỗi duplicate index? → Chắc chắn đã DROP database trước khi CREATE

## THÔNG TIN CẤU HÌNH HIỆN TẠI

Từ file .env:
```
DB_HOST=localhost
DB_PORT=3306  
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=literature_review_db
```

---
Sau khi database chạy thành công, bạn có thể:
- Truy cập Swagger API: http://localhost:3000/api
- Đăng ký tài khoản mới
- Bắt đầu sử dụng ứng dụng!
    