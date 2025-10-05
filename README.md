# 📚 Literature Review Manager

> Hệ thống quản lý tài liệu nghiên cứu khoa học với đầy đủ chức năng quản lý papers, phân tích trích dẫn, và visualization.

[![Backend Status](https://img.shields.io/badge/Backend-100%25%20Complete-success)](./backend)
[![Frontend Status](https://img.shields.io/badge/Frontend-Pending-yellow)](./frontend)
[![Database](https://img.shields.io/badge/Database-MySQL%208.0-blue)](./database)
[![Progress](https://img.shields.io/badge/Progress-60%25-orange)](./PROJECT-STATUS.md)

---

## 🎯 Overview

**Literature Review Manager** là một ứng dụng web full-stack giúp các nhà nghiên cứu:
- ✅ **Quản lý và tổ chức bài báo khoa học** - CRUD hoàn chỉnh với 41 API endpoints
- ✅ **Upload và quản lý PDF files** - Multer với version control
- ✅ **Tạo ghi chú và phân loại theo tags** - Note-taking với highlighted text
- ✅ **Xây dựng và visualize citation networks** - D3.js graph algorithm ready
- ✅ **Sinh tự động tóm tắt bằng AI** - Placeholder sẵn sàng cho OpenAI integration
- ✅ **Tìm kiếm và lọc papers nhanh chóng** - Full-text search với pagination

### 🎉 Backend Implementation: 100% Complete!

**9 modules, 41 endpoints, JWT auth, file upload, citation network - ALL DONE!**

## 🏗️ Architecture

```
literature-review/
├── backend/              # NestJS REST API
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── config/       # Configuration
│   │   └── common/       # Shared code
│   └── uploads/          # Uploaded files
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   └── visualizations/ # D3.js charts
│   └── public/
├── database/             # Database schema
│   ├── schema.sql        # MySQL schema
│   └── README.md         # DB documentation
└── docs/                 # Documentation
    └── UML-Diagrams.md   # UML diagrams
```

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **ORM**: TypeORM 0.3.x
- **Database**: MySQL 8.0+
- **Auth**: JWT (Passport.js)
- **File Upload**: Multer
- **API Docs**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18.x
- **Language**: TypeScript/JavaScript
- **State Management**: Context API / Redux Toolkit
- **Routing**: React Router v6
- **UI Library**: Material-UI / Tailwind CSS
- **Visualization**: D3.js
- **Charts**: D3.js + React
- **HTTP Client**: Axios

### Database
- **RDBMS**: MySQL 8.0+
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

## 📋 Features (Use Cases)

| UC | Feature | Status |
|---|---|---|
| UC1 | Đăng ký/Đăng nhập | ⏳ To Implement |
| UC2 | Quản lý profile | ⏳ To Implement |
| UC3 | Thêm bài báo mới | ⏳ To Implement |
| UC4 | Chỉnh sửa/Xóa bài báo | ⏳ To Implement |
| UC5 | Upload & Quản lý PDF | ⏳ To Implement |
| UC6 | Tìm kiếm bài báo | ⏳ To Implement |
| UC7 | Thêm vào thư viện cá nhân | ⏳ To Implement |
| UC8 | Ghi chú & Tag | ⏳ To Implement |
| UC9 | Tạo quan hệ trích dẫn | ⏳ To Implement |
| UC10 | Xem đồ thị citation | ⏳ To Implement |
| UC11 | Sinh tóm tắt & phân tích (AI) | ⏳ To Implement |

## 🚀 Quick Start

### Prerequisites
- **Node.js**: >= 18.x
- **MySQL**: >= 8.0
- **npm** hoặc **yarn**
- **Git**

### Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd literature-review
```

#### 2. Setup Database
```bash
# Tạo database
mysql -u root -p
CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Import schema
mysql -u root -p literature_review_db < database/schema.sql
```

#### 3. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env với thông tin database của bạn
npm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3000`  
API Docs: `http://localhost:3000/api/docs`

#### 4. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env nếu cần
npm start
```

Frontend sẽ chạy tại: `http://localhost:3001`

## 📖 Documentation

- **Database**: [`database/README.md`](./database/README.md) - ERD, schema, relationships
- **UML Diagrams**: [`docs/UML-Diagrams.md`](./docs/UML-Diagrams.md) - Use case, class, sequence diagrams
- **Backend API**: [`backend/README.md`](./backend/README.md) - API endpoints, setup guide
- **Frontend**: [`frontend/README.md`](./frontend/README.md) - Components, pages, routing

## 🔐 Authentication Flow

```
1. User registers → POST /api/v1/auth/register
2. User logs in → POST /api/v1/auth/login → Receives JWT token
3. Frontend stores token in localStorage
4. All subsequent requests include: Authorization: Bearer <token>
5. Backend validates JWT on protected routes
```

## 📊 Key API Endpoints

```
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login

# Papers
GET    /api/v1/papers          # List & search
POST   /api/v1/papers          # Create
GET    /api/v1/papers/:id      # Detail
PUT    /api/v1/papers/:id      # Update
DELETE /api/v1/papers/:id      # Delete

# Library
POST   /api/v1/library/add/:paperId
GET    /api/v1/library

# Citations
POST   /api/v1/citations
GET    /api/v1/citations/network/:paperId

# AI
POST   /api/v1/summaries/generate/:paperId
```

## 🎨 Visualization Features

### 1. Citation Network Graph (D3.js)
- **Force-directed graph** hiển thị mối quan hệ trích dẫn
- Interactive: click, hover, zoom, pan
- Color-coded by year/category
- Node size based on citation count

### 2. Trends & Statistics
- Publication trends over time (line chart)
- Top authors/journals (bar chart)
- Keyword cloud (word cloud)
- Papers by category (pie chart)

### 3. Personal Library Dashboard
- Reading status distribution
- Papers added over time
- Tags usage statistics

## 🧪 Testing

### Backend
```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage
```

### Frontend
```bash
cd frontend
npm run test          # Jest tests
npm run test:coverage # Coverage
```

## 📦 Deployment

### Backend (Production)
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend (Production Build)
```bash
cd frontend
npm run build
# Serve build/ folder với nginx hoặc serve
```

### Docker (Optional)
```bash
docker-compose up -d
```

## 🗄️ Database Schema

Xem chi tiết trong [`database/README.md`](./database/README.md)

**Core Tables**:
- `users` - User accounts
- `papers` - Research papers
- `tags` - Classification tags
- `notes` - User notes
- `citations` - Citation relationships
- `user_library` - Personal library
- `pdf_files` - Uploaded PDFs
- `ai_summaries` - AI-generated summaries

## 🔄 Development Workflow

1. **Feature Branch**: `git checkout -b feature/your-feature`
2. **Backend Implementation**: 
   - Create entity, DTO, service, controller
   - Write tests
3. **Frontend Implementation**:
   - Create components, pages
   - Connect to API
   - Add to routing
4. **Testing**: Run unit & integration tests
5. **PR**: Create pull request for review

## 📝 Code Style

### Backend (NestJS)
- Use TypeScript strict mode
- Follow NestJS module structure
- DTOs for validation
- Services for business logic
- Controllers for routing

### Frontend (React)
- Functional components with hooks
- TypeScript for type safety
- Component-based architecture
- Custom hooks for reusable logic
- Context API for state management

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify .env credentials match
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
```

### CORS Issues
```typescript
// backend/src/main.ts
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true,
});
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## 📄 License

MIT License

## 👥 Authors

- Your Name - Đồ Án Tốt Nghiệp

## 📞 Support

Nếu có vấn đề hoặc câu hỏi, hãy tạo issue hoặc liên hệ trực tiếp.

---

**Happy Coding! 🚀**
