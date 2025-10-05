# 📚 Literature Review Management System

A comprehensive full-stack web application for managing academic papers, research literature, and citations with modern features including PDF management, note-taking, citation network visualization, and AI-powered summaries.

![NestJS](https://img.shields.io/badge/NestJS-10.3.0-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Key Features

### 📄 Smart Paper Management
- ✅ **Auto-fill from DOI/ArXiv URL** - Extract metadata from CrossRef, Semantic Scholar, and ArXiv
- ✅ **ArXiv PDF Auto-Download & Upload** - Automatically fetch and upload PDFs to server
- ✅ **Advanced Search & Filters** - Filter by title, author, journal, tags, year range
- ✅ **Quick Add Dialog** - Fast paper entry from any page
- ✅ **Inline Tag Creation** - Create tags on-the-fly while adding papers

### 📑 PDF Management
- ✅ **Secure Upload** - Drag & drop with progress tracking (10MB limit)
- ✅ **In-Browser Preview** - View PDFs with zoom controls
- ✅ **Authenticated Download** - JWT-protected PDF access
- ✅ **Multiple PDFs per Paper** - Support for different versions

### 📝 Note-Taking System
- ✅ **Rich Notes** - Create detailed notes for each paper
- ✅ **Highlighted Quotes** - Include quoted text from papers
- ✅ **Page References** - Track page numbers for citations
- ✅ **Search & Filter** - Find notes quickly

### 🏷️ Tag System
- ✅ **Color-Coded Tags** - 18 preset colors + custom hex input
- ✅ **Paper Count Statistics** - See usage per tag
- ✅ **Multi-Select Filtering** - Filter papers by multiple tags
- ✅ **Tag Management Page** - Dedicated CRUD interface

### 📚 Personal Library
- ✅ **Reading Status** - Track progress (To Read, Reading, Read, Completed)
- ✅ **Star Ratings** - Rate papers 1-5 stars
- ✅ **Favorites** - Mark important papers
- ✅ **Bulk Actions** - Change status, rate, or remove multiple papers
- ✅ **Progress Bars** - Visual reading progress indicators
- ✅ **Statistics** - Total papers, average rating

### 🔗 Citation Network Visualization
- ✅ **Interactive D3.js Graph** - Zoom, pan, and explore connections
- ✅ **Network Depth Control** - Adjust visualization depth (1-3 levels)
- ✅ **Node Click Details** - View paper info in drawer
- ✅ **Export PNG/SVG** - Save visualizations
- ✅ **Hover Effects** - Interactive node animations
- ✅ **Statistics Display** - Node and edge counts

### 🤖 AI-Powered Summaries
- ✅ **Auto-Generate Summaries** - Create paper summaries
- ✅ **Key Findings Extraction** - Identify main points
- ✅ **Regenerate Option** - Update summaries as needed
- ✅ **Copy to Clipboard** - Easy sharing
- ✅ **Expand/Collapse** - Space-efficient display

### 🔐 Authentication & Security
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt encryption
- ✅ **Protected Routes** - Frontend and backend guards
- ✅ **User Profiles** - Customizable user data

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.3.0 (TypeScript)
- **Database**: MySQL 8.0 + TypeORM
- **Authentication**: JWT (Passport.js)
- **File Upload**: Multer
- **Validation**: class-validator
- **External APIs**: 
  - CrossRef API (DOI metadata)
  - Semantic Scholar API (academic data)
  - ArXiv API (preprint papers & PDFs)

### Frontend
- **Framework**: React 18.2.0 + TypeScript 5.3.3
- **Build Tool**: Vite 6.2.1
- **UI Library**: Material-UI (MUI) 5.15.9
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Visualization**: D3.js v7
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast

## 📦 Quick Start

### Prerequisites
```bash
Node.js >= 18.x
MySQL >= 8.0
npm or yarn
```

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/literature-review-management.git
cd literature-review-management
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=literature_review

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d

# Server
PORT=3000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

Create database:
```sql
CREATE DATABASE literature_review;
```

Start server:
```bash
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:3000/api/v1
```

Start server:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🚀 Usage

1. **Register** at `/register`
2. **Login** at `/login`
3. **Quick Add Paper**:
   - Click "Quick Add" button
   - Paste DOI or ArXiv URL (e.g., `https://arxiv.org/abs/1706.03762`)
   - Click "Extract Metadata"
   - Review and click "Save"
   - PDF automatically uploads for ArXiv papers! 🎉
4. **Manage Papers**: Edit, delete, add tags
5. **Upload PDFs**: Drag & drop on paper detail page
6. **Create Notes**: Add highlighted quotes with page numbers
7. **Add to Library**: Track reading status and rate papers
8. **Explore Citations**: View interactive network graph
9. **Generate Summary**: Click generate button on paper detail

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Total Lines of Code | 35,000+ |
| Backend Endpoints | 42 |
| Frontend Pages | 10 |
| Components | 20+ |
| Services | 9 |
| Database Tables | 8 |

## 🔌 API Endpoints

<details>
<summary>Click to view all endpoints</summary>

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/profile` - Get profile

### Papers
- `GET /api/v1/papers` - List papers
- `GET /api/v1/papers/:id` - Get paper
- `POST /api/v1/papers` - Create paper
- `PUT /api/v1/papers/:id` - Update paper
- `DELETE /api/v1/papers/:id` - Delete paper
- `POST /api/v1/papers/extract-metadata` - Extract from DOI/URL
- `POST /api/v1/papers/download-arxiv-pdf` - Download ArXiv PDF
- `GET /api/v1/papers/statistics` - Get statistics

### Tags
- `GET /api/v1/tags` - List tags
- `POST /api/v1/tags` - Create tag
- `PUT /api/v1/tags/:id` - Update tag
- `DELETE /api/v1/tags/:id` - Delete tag

### Notes
- `GET /api/v1/notes` - List notes
- `POST /api/v1/notes` - Create note
- `PUT /api/v1/notes/:id` - Update note
- `DELETE /api/v1/notes/:id` - Delete note

### Library
- `GET /api/v1/library` - Get library
- `POST /api/v1/library` - Add to library
- `PUT /api/v1/library/:id` - Update entry
- `DELETE /api/v1/library/:id` - Remove from library

### Citations
- `GET /api/v1/citations/network/:id` - Get network
- `POST /api/v1/citations` - Add citation
- `DELETE /api/v1/citations/:id` - Delete citation

### PDF
- `POST /api/v1/pdf/upload/:paperId` - Upload PDF
- `GET /api/v1/pdf/:paperId` - List PDFs
- `GET /api/v1/pdf/download/:id` - Download PDF
- `DELETE /api/v1/pdf/:id` - Delete PDF

### Summaries
- `POST /api/v1/summaries/:paperId` - Generate
- `GET /api/v1/summaries/:paperId` - Get summary
- `DELETE /api/v1/summaries/:paperId` - Delete

</details>

## 📁 Project Structure

```
literature-review/
├── backend/                      # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication (JWT)
│   │   │   ├── users/           # User management
│   │   │   ├── papers/          # Paper CRUD + metadata extraction
│   │   │   ├── tags/            # Tag management
│   │   │   ├── notes/           # Note-taking
│   │   │   ├── library/         # Personal library
│   │   │   ├── citations/       # Citation network
│   │   │   ├── pdf/             # PDF upload/download
│   │   │   └── summaries/       # AI summaries
│   │   ├── config/              # Configuration
│   │   └── main.ts              # Entry point
│   ├── uploads/                 # PDF storage (gitignored)
│   ├── package.json
│   └── .env.example
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── papers/          # QuickAddDialog
│   │   │   ├── pdf/             # PdfUploader, PdfViewer
│   │   │   ├── notes/           # NoteCard, NoteDialog
│   │   │   ├── tags/            # TagCard, TagDialog
│   │   │   └── summary/         # AiSummaryCard
│   │   ├── pages/               # Page components
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── papers/          # Papers, PaperDetail, PaperForm
│   │   │   ├── library/         # LibraryPage
│   │   │   ├── citations/       # CitationNetworkPage
│   │   │   └── profile/         # ProfilePage
│   │   ├── services/            # API services (9 services)
│   │   ├── contexts/            # AuthContext
│   │   ├── types/               # TypeScript types
│   │   └── main.tsx
│   ├── package.json
│   └── .env.example
│
├── database/                     # Database
│   └── schema.sql               # MySQL schema
│
├── .gitignore
└── README.md
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:cov          # Coverage

# Frontend tests
cd frontend
npm run test              # Vitest tests
```

## 🚢 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy dist/ folder to Netlify/Vercel/AWS S3
```

### Deployment Options
- **Backend**: AWS EC2, DigitalOcean, Heroku, Railway
- **Frontend**: Netlify, Vercel, AWS S3 + CloudFront
- **Database**: AWS RDS, DigitalOcean Managed MySQL

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [React](https://react.dev/) - UI library
- [Material-UI](https://mui.com/) - Component library
- [D3.js](https://d3js.org/) - Data visualization
- [CrossRef](https://www.crossref.org/) - DOI metadata service
- [Semantic Scholar](https://www.semanticscholar.org/) - Academic search
- [ArXiv](https://arxiv.org/) - Preprint repository

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

⭐ **If you find this project helpful, please give it a star!**
