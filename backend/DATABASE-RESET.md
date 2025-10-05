# MySQL Database Reset Instructions

## Problem
The `tags` table has a duplicate index error. We need to drop and recreate the database.

## Solution

### Option 1: Using MySQL Workbench (Recommended)

1. Open **MySQL Workbench**
2. Connect to your MySQL server (root/root)
3. Click on **Query** tab or press `Ctrl+T`
4. Paste and execute these commands:

```sql
DROP DATABASE IF EXISTS literature_review_db;
CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. You should see "Action completed successfully"
6. Then run: `npm run start:dev` to create all tables

---

### Option 2: Using MySQL Command Line

If you have MySQL in PATH, run:

```bash
mysql -u root -proot -e "DROP DATABASE IF EXISTS literature_review_db; CREATE DATABASE literature_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

### Option 3: Add MySQL to Windows PATH

1. Find your MySQL installation (usually `C:\Program Files\MySQL\MySQL Server 8.0\bin` or `C:\xampp\mysql\bin`)
2. Add it to Windows PATH:
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find `Path`, click "Edit"
   - Click "New" and add your MySQL bin path
   - Click OK and restart PowerShell
3. Then run the reset script: `powershell -ExecutionPolicy Bypass -File scripts\reset-db.ps1`

---

## What Was Fixed

- **Tag Entity**: Removed duplicate `@Index()` decorator (the `unique: true` already creates a unique index)
- **Database**: Will be recreated with clean schema

## After Database Reset

Run the backend:
```bash
npm run start:dev
```

TypeORM will automatically create all 8 tables:
- users
- papers
- tags
- notes
- citations
- user_library
- pdf_files
- ai_summaries

---

## Current Configuration

From your `.env` file:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=literature_review_db
```

✅ Password is configured correctly!
