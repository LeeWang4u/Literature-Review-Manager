# 🚀 Backend Setup Instructions

## Prerequisites

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **MySQL**: >= 8.0
- **Git**: Latest version

## Step-by-Step Setup

### 1️⃣ Install Node.js Dependencies

```powershell
cd backend
npm install
```

This will install all dependencies from `package.json`:
- NestJS framework
- TypeORM & MySQL driver
- JWT & Passport for authentication
- Class-validator for validation
- Swagger for API documentation
- Bcrypt for password hashing
- Multer for file uploads

**Expected output:**
```
added 800+ packages in 30s
```

### 2️⃣ Create MySQL Database

Open MySQL shell:
```powershell
mysql -u root -p
```

Create database:
```sql
CREATE DATABASE literature_review_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Verify
SHOW DATABASES;

-- Exit
EXIT;
```

### 3️⃣ Import Database Schema

```powershell
# From project root
mysql -u root -p literature_review_db < database/schema.sql
```

Verify tables created:
```powershell
mysql -u root -p
USE literature_review_db;
SHOW TABLES;
```

You should see 9 tables:
- users
- papers
- tags
- paper_tags
- notes
- user_library
- citations
- pdf_files
- ai_summaries

### 4️⃣ Configure Environment Variables

Copy example file:
```powershell
cd backend
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password_here
DB_DATABASE=literature_review_db

# JWT Authentication
JWT_SECRET=change-this-to-random-secret-key-in-production
JWT_EXPIRATION=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:3001

# Optional: AI Service
# OPENAI_API_KEY=sk-...
```

**Important:** Change `DB_PASSWORD` to your actual MySQL password!

### 5️⃣ Create Uploads Directory

```powershell
# In backend folder
mkdir uploads
```

This folder will store uploaded PDF files.

### 6️⃣ Start Development Server

```powershell
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - 10/04/2025, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 10/04/2025, 10:00:01 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 12345  - 10/04/2025, 10:00:01 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 10/04/2025, 10:00:02 AM     LOG [NestApplication] Nest application successfully started
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

### 7️⃣ Test API Documentation

Open browser and navigate to:
```
http://localhost:3000/api/docs
```

You should see Swagger UI with all API endpoints documented.

---

## 🧪 Testing the API

### Test 1: Register a User

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "test@example.com",
  "password": "123456",
  "fullName": "Test User",
  "affiliation": "Test University",
  "researchInterests": "Machine Learning, AI"
}
```

**Expected Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "fullName": "Test User",
    "avatarUrl": null
  }
}
```

### Test 2: Login

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "fullName": "Test User",
    "avatarUrl": null
  }
}
```

**Copy the `accessToken`** - you'll need it for authenticated requests!

### Test 3: Get Profile (Protected Route)

1. Click **"Authorize"** button in Swagger UI (top right)
2. Paste your token: `Bearer <your_token>`
3. Click **"Authorize"** then **"Close"**

**Endpoint:** `GET /api/v1/auth/profile`

**Expected Response (200):**
```json
{
  "id": 1,
  "email": "test@example.com",
  "fullName": "Test User",
  "avatarUrl": null,
  "bio": null,
  "affiliation": "Test University",
  "researchInterests": "Machine Learning, AI",
  "createdAt": "2025-10-04T10:00:00.000Z",
  "updatedAt": "2025-10-04T10:00:00.000Z",
  "isActive": true
}
```

### Test 4: Create a Paper

**Endpoint:** `POST /api/v1/papers`

**Request:**
```json
{
  "title": "Attention Is All You Need",
  "authors": "Vaswani, Ashish; Shazeer, Noam; Parmar, Niki",
  "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
  "publicationYear": 2017,
  "journal": "NeurIPS",
  "doi": "10.5555/3295222.3295349",
  "url": "https://arxiv.org/abs/1706.03762",
  "keywords": "transformer, attention, neural networks, NLP"
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "title": "Attention Is All You Need",
  "authors": "Vaswani, Ashish; Shazeer, Noam; Parmar, Niki",
  "publicationYear": 2017,
  "addedBy": 1,
  "createdAt": "2025-10-04T10:05:00.000Z",
  ...
}
```

### Test 5: Search Papers

**Endpoint:** `GET /api/v1/papers?query=attention&page=1&pageSize=10`

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Attention Is All You Need",
      ...
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 🔧 Troubleshooting

### Issue 1: Cannot connect to MySQL

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solutions:**
1. Check MySQL is running:
   ```powershell
   # Windows - Services
   Get-Service -Name MySQL*
   
   # Start MySQL if stopped
   net start MySQL80
   ```

2. Verify credentials in `.env`:
   ```env
   DB_USERNAME=root
   DB_PASSWORD=your_actual_password
   ```

3. Test MySQL connection:
   ```powershell
   mysql -u root -p
   ```

### Issue 2: Port 3000 already in use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### Issue 3: Module not found errors

**Error:**
```
Cannot find module '@nestjs/common'
```

**Solution:**
```powershell
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue 4: TypeORM sync errors

**Error:**
```
QueryFailedError: Table 'users' already exists
```

**Solution:**

**Option 1:** Set synchronize to false in `.env`:
```env
NODE_ENV=production
```

**Option 2:** Drop and recreate database:
```sql
DROP DATABASE literature_review_db;
CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Then re-import schema.

### Issue 5: File upload fails

**Error:**
```
ENOENT: no such file or directory, open './uploads/...'
```

**Solution:**
```powershell
# Create uploads directory
mkdir uploads

# Verify it exists
ls
```

---

## 📝 Available Scripts

```powershell
# Development
npm run start:dev          # Start with hot-reload

# Production
npm run build              # Build for production
npm run start:prod         # Run production build

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage

# Linting
npm run lint               # Check code style
npm run format             # Auto-format code

# Database
npm run typeorm            # Run TypeORM CLI
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
```

---

## 🎯 Next Steps

1. ✅ Backend server running
2. ✅ API tested via Swagger
3. ⏭️ Complete remaining modules (copy from `IMPLEMENTATION-GUIDE.md`)
4. ⏭️ Setup Frontend (React)
5. ⏭️ Integrate frontend with backend APIs
6. ⏭️ Implement D3.js visualizations

---

## 📚 Additional Resources

- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **Swagger UI**: http://localhost:3000/api/docs
- **MySQL Docs**: https://dev.mysql.com/doc/

---

## 💡 Tips

1. **Use Swagger** for testing - no need for Postman
2. **Check logs** in terminal for errors
3. **JWT tokens expire** after 7 days (configurable)
4. **Hot reload** is enabled - changes auto-restart server
5. **Database sync** happens automatically in development

---

## 🎉 Success!

If you see this in your terminal:
```
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

**Your backend is ready!** 🎊

Next: Implement frontend or complete remaining backend modules.
