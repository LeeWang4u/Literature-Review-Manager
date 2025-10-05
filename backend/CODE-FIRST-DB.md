# Code-First Database Setup Guide

## 📌 Giới thiệu

Dự án này sử dụng **TypeORM Code-First** approach, nghĩa là:
- Database schema được tự động tạo từ các Entity classes
- Không cần viết SQL thủ công
- Mọi thay đổi entity sẽ tự động sync với database (trong môi trường development)

## 🚀 Cách sử dụng

### Bước 1: Cấu hình Database

Chỉnh sửa file `.env` với thông tin MySQL của bạn:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=literature_review_db
```

### Bước 2: Tạo Database (Tự động)

**Cách 1: Chạy app trực tiếp (Database sẽ tự động được tạo)**
```bash
npm run start:dev
```

**Cách 2: Tạo database thủ công trước**
```bash
npm run db:create
```

**Cách 3: Tạo database + start app cùng lúc**
```bash
npm run db:setup
```

### Bước 3: Kiểm tra

1. Database `literature_review_db` sẽ được tạo tự động
2. Tất cả các bảng sẽ được tạo từ các Entity files:
   - `users` - Bảng người dùng
   - `papers` - Bảng bài báo
   - `tags` - Bảng thẻ tag
   - `notes` - Bảng ghi chú
   - `citations` - Bảng trích dẫn
   - `library_entries` - Bảng thư viện cá nhân
   - `ai_summaries` - Bảng tóm tắt AI

## 🔧 Cấu hình TypeORM

### Synchronize Mode

File: `src/config/typeorm.config.ts`

```typescript
export const typeOrmConfig: TypeOrmModuleOptions = {
  synchronize: true, // Tự động sync schema với entities
  dropSchema: false, // false = giữ data, true = xóa hết mỗi lần restart
};
```

**⚠️ Lưu ý:**
- `synchronize: true` - Chỉ dùng trong development
- `synchronize: false` - Dùng trong production (dùng migrations thay thế)
- `dropSchema: true` - Xóa toàn bộ data mỗi lần restart (chỉ dùng khi test)

## 📝 Tạo Entity mới

### 1. Tạo Entity Class

```typescript
// src/modules/example/entities/example.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 2. Đăng ký Entity trong Module

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { Example } from './entities/example.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Example])],
})
export class ExampleModule {}
```

### 3. Restart App

```bash
npm run start:dev
```

→ Bảng `examples` sẽ tự động được tạo!

## 🔄 Migrations (Production)

Khi deploy lên production, nên tắt `synchronize` và dùng migrations:

### 1. Tắt synchronize

```typescript
// src/config/typeorm.config.ts
export const typeOrmConfig: TypeOrmModuleOptions = {
  synchronize: false, // Tắt cho production
};
```

### 2. Tạo migration

```bash
npm run migration:generate -- src/migrations/InitialSchema
```

### 3. Chạy migration

```bash
npm run migration:run
```

### 4. Rollback (nếu cần)

```bash
npm run migration:revert
```

## 🛠️ Các lệnh hữu ích

| Lệnh | Mô tả |
|------|-------|
| `npm run start:dev` | Chạy app (tự động tạo DB + tables) |
| `npm run db:create` | Chỉ tạo database |
| `npm run db:setup` | Tạo DB + start app |
| `npm run migration:generate` | Tạo migration file từ entity changes |
| `npm run migration:run` | Chạy migrations |
| `npm run migration:revert` | Rollback migration cuối cùng |

## 🎯 Workflow Development

### Lần đầu setup:
```bash
# 1. Cấu hình .env
cp .env.example .env
# Chỉnh sửa DB_PASSWORD, DB_DATABASE...

# 2. Chạy app (tự động tạo DB + tables)
npm run start:dev
```

### Khi thêm/sửa Entity:
```bash
# Chỉ cần restart app, schema tự động update
npm run start:dev
```

### Khi cần reset DB (xóa toàn bộ data):
```bash
# 1. Sửa typeorm.config.ts
# dropSchema: true

# 2. Restart app
npm run start:dev

# 3. Đừng quên sửa lại
# dropSchema: false
```

## 📚 Entity Relationships

### One-to-Many Example
```typescript
// Paper Entity
@OneToMany(() => Note, note => note.paper)
notes: Note[];

// Note Entity
@ManyToOne(() => Paper, paper => paper.notes)
paper: Paper;
```

### Many-to-Many Example
```typescript
// Paper Entity
@ManyToMany(() => Tag, tag => tag.papers)
@JoinTable()
tags: Tag[];

// Tag Entity
@ManyToMany(() => Paper, paper => paper.tags)
tags: Paper[];
```

## ⚠️ Best Practices

1. **Development**: Dùng `synchronize: true` để tự động sync
2. **Production**: Dùng `synchronize: false` + migrations
3. **Backup**: Luôn backup DB trước khi chạy migrations
4. **Testing**: Dùng separate test database
5. **Git**: KHÔNG commit file `.env` (đã có trong .gitignore)

## 🐛 Troubleshooting

### Lỗi: "Database does not exist"
```bash
npm run db:create
```

### Lỗi: "Table already exists"
- Kiểm tra `synchronize` setting
- Nếu cần reset: xóa DB và chạy lại

### Lỗi: Connection refused
- Kiểm tra MySQL service đang chạy
- Kiểm tra username/password trong .env

### Lỗi: Character encoding
- Database được tạo với `utf8mb4` mặc định
- Hỗ trợ emoji và Unicode đầy đủ

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. MySQL service đang chạy
2. File `.env` có đúng thông tin
3. Port 3306 không bị block
4. User có quyền CREATE DATABASE

---

**Happy Coding! 🚀**
