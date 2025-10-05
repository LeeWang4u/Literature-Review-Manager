# 📊 Database Design - Literature Review Manager

## Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   USERS     │         │   PAPERS    │         │  PDF_FILES  │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ PK id       │────┐    │ PK id       │────────>│ PK id       │
│    email    │    │    │    title    │         │    paper_id │
│    password │    │    │    authors  │         │    file_name│
│    full_name│    │    │    abstract │         │    file_path│
│    avatar   │    │    │    year     │         │    file_size│
│    bio      │    │    │    journal  │         │ FK uploaded_by
│    affil... │    │    │    doi      │         └─────────────┘
└─────────────┘    │    │ FK added_by │
      │            │    └─────────────┘
      │            │           │
      │            │           │
      │            └───────────┼──────────┐
      │                        │          │
      │                        │          │
      ▼                        ▼          ▼
┌─────────────┐         ┌─────────────┐  ┌─────────────┐
│USER_LIBRARY │         │   NOTES     │  │ PAPER_TAGS  │
├─────────────┤         ├─────────────┤  ├─────────────┤
│ PK id       │         │ PK id       │  │ PK id       │
│ FK user_id  │         │ FK user_id  │  │ FK paper_id │
│ FK paper_id │         │ FK paper_id │  │ FK tag_id   │
│    status   │         │    content  │  └─────────────┘
│    rating   │         │    highlight│         │
│    added_at │         │    page_num │         │
└─────────────┘         │    color    │         ▼
                        └─────────────┘  ┌─────────────┐
                                         │    TAGS     │
                                         ├─────────────┤
                                         │ PK id       │
      ┌──────────────────────────────────│    name     │
      │                                  │    color    │
      │                                  └─────────────┘
      │
      │          ┌─────────────┐
      │          │  CITATIONS  │
      │          ├─────────────┤
      │          │ PK id       │
      └─────────>│ FK created_by
                 │ FK citing_paper_id ──┐
                 │ FK cited_paper_id ───┼─> (self-reference to PAPERS)
                 │    citation_context  │
                 └─────────────┘        │
                                        │
                 ┌─────────────┐        │
                 │AI_SUMMARIES │        │
                 ├─────────────┤        │
                 │ PK id       │        │
                 │ FK paper_id │<───────┘
                 │    summary  │
                 │    key_find.│
                 │    methodol.│
                 └─────────────┘
```

## 📋 Bảng và Mối quan hệ

### 1. **USERS** (Người dùng)
- Lưu thông tin người dùng (UC1, UC2)
- **1-to-Many** với: papers, notes, user_library, citations
- **Attributes**: email (unique), password (hashed), profile info

### 2. **PAPERS** (Bài báo)
- Lưu thông tin metadata của paper (UC3, UC4)
- **Many-to-Many** với users qua user_library
- **Many-to-Many** với tags qua paper_tags
- **Self-referencing** qua citations (citing/cited relationship)
- **1-to-Many** với: pdf_files, notes, ai_summaries

### 3. **PDF_FILES** (File PDF)
- Lưu thông tin file PDF đã upload (UC5)
- **Many-to-1** với papers
- Mỗi paper có thể có nhiều versions/files

### 4. **TAGS** (Thẻ phân loại)
- Lưu các tag để phân loại paper (UC8)
- **Many-to-Many** với papers qua paper_tags
- Có màu sắc để dễ phân biệt

### 5. **PAPER_TAGS** (Junction table)
- Bảng trung gian giữa papers và tags

### 6. **USER_LIBRARY** (Thư viện cá nhân)
- Lưu papers mà user đã thêm vào thư viện (UC7)
- **Many-to-Many** junction table
- Có status: to-read, reading, read, favorite
- Có rating (1-5 stars)

### 7. **NOTES** (Ghi chú)
- Lưu notes và highlights của user cho từng paper (UC8)
- **Many-to-1** với users và papers
- Có thể có highlight text, page number, color

### 8. **CITATIONS** (Trích dẫn)
- Lưu mối quan hệ citation giữa các papers (UC9, UC10)
- Self-referencing relationship
- citing_paper_id → cited_paper_id
- Dùng để vẽ citation network graph

### 9. **AI_SUMMARIES** (Tóm tắt AI)
- Lưu summary được sinh tự động bởi AI (UC11)
- **1-to-1** với papers (có thể có hoặc không)

## 🔍 Indexes

- **Email index** trên users (cho login nhanh)
- **FULLTEXT index** trên title, abstract, keywords (cho search UC6)
- **Foreign key indexes** cho JOIN queries
- **Composite unique keys** để tránh duplicate records

## 📊 Use Case Coverage

| Use Case | Tables Used |
|----------|-------------|
| UC1: Đăng ký/Đăng nhập | users |
| UC2: Quản lý profile | users |
| UC3: Thêm bài báo mới | papers |
| UC4: Chỉnh sửa/Xóa bài báo | papers |
| UC5: Upload & Quản lý PDF | pdf_files |
| UC6: Tìm kiếm bài báo | papers (FULLTEXT search) |
| UC7: Thêm vào thư viện | user_library |
| UC8: Ghi chú & Tag | notes, tags, paper_tags |
| UC9: Tạo quan hệ trích dẫn | citations |
| UC10: Xem đồ thị citation | citations |
| UC11: Sinh tóm tắt & phân tích | ai_summaries |

## 🚀 Next Steps

1. ✅ Database schema created
2. ⏭️ Create UML diagrams
3. ⏭️ Setup NestJS backend
4. ⏭️ Implement APIs
