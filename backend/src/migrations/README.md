# 📦 Database Migrations - Publisher Integration

## 📋 **Migration Files Created:**

### **1. CreatePublisherAccountsTable** (1728648000000)
- **Table**: `publisher_accounts`
- **Purpose**: Store linked publisher accounts (IEEE, Springer, ACM, etc.)
- **Features**:
  - OAuth token storage (encrypted)
  - Institutional credentials support
  - Token expiration tracking
  - Verification status
  - Unique constraint: one account per publisher per user

### **2. CreateDownloadLogsTable** (1728648100000)
- **Table**: `download_logs`
- **Purpose**: Track all PDF download attempts and results
- **Features**:
  - Download method tracking (OAuth, manual, ArXiv, etc.)
  - Success/failure status
  - File size tracking
  - Error logging
  - Retry count

---

## 🚀 **How to Run Migrations:**

### **Method 1: Using npm scripts (Recommended)**

```bash
# Navigate to backend directory
cd backend

# Run all pending migrations
npm run migration:run

# Revert last migration if needed
npm run migration:revert
```

### **Method 2: Using TypeORM CLI directly**

```bash
# Run migrations
npx typeorm migration:run -d src/config/typeorm.config.ts

# Revert migrations
npx typeorm migration:revert -d src/config/typeorm.config.ts

# Show migration status
npx typeorm migration:show -d src/config/typeorm.config.ts
```

---

## 📊 **Database Schema Overview:**

### **publisher_accounts Table:**

```sql
CREATE TABLE `publisher_accounts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `publisher_name` ENUM('ieee', 'springer', 'acm', 'elsevier', 'wiley', 'arxiv', 'other'),
  `account_email` VARCHAR(255),
  `access_token` TEXT,           -- Encrypted
  `refresh_token` TEXT,           -- Encrypted
  `token_expires_at` TIMESTAMP,
  `institution_name` VARCHAR(255),
  `institutional_credentials` TEXT, -- Encrypted
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_verified_at` TIMESTAMP,
  `verification_status` ENUM('pending', 'verified', 'failed', 'expired') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `IDX_UNIQUE_USER_PUBLISHER` (`user_id`, `publisher_name`),
  KEY `IDX_PUBLISHER_ACCOUNTS_USER_ID` (`user_id`),
  KEY `IDX_PUBLISHER_ACCOUNTS_IS_ACTIVE` (`is_active`),
  CONSTRAINT `FK_PUBLISHER_ACCOUNTS_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
```

### **download_logs Table:**

```sql
CREATE TABLE `download_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `paper_id` INT NOT NULL,
  `publisher_account_id` INT,
  `download_method` ENUM('manual', 'publisher_oauth', 'institutional', 'open_access', 'arxiv'),
  `download_status` ENUM('success', 'failed', 'pending'),
  `file_size_bytes` BIGINT,
  `error_message` TEXT,
  `retry_count` INT DEFAULT 0,
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP,
  
  KEY `IDX_DOWNLOAD_LOGS_USER_PAPER` (`user_id`, `paper_id`),
  KEY `IDX_DOWNLOAD_LOGS_STATUS` (`download_status`),
  KEY `IDX_DOWNLOAD_LOGS_ATTEMPTED_AT` (`attempted_at`),
  KEY `IDX_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT` (`publisher_account_id`),
  CONSTRAINT `FK_DOWNLOAD_LOGS_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_DOWNLOAD_LOGS_PAPER` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT` FOREIGN KEY (`publisher_account_id`) REFERENCES `publisher_accounts` (`id`) ON DELETE SET NULL
);
```

---

## ⚙️ **Important Notes:**

### **1. Disable synchronize in Production:**

After running migrations, update `typeorm.config.ts`:

```typescript
export const typeOrmConfig: TypeOrmModuleOptions = {
  // ... other configs
  synchronize: false, // ⚠️ Set to false in production!
  // This prevents TypeORM from auto-creating/dropping tables
};
```

### **2. Migration vs Synchronize:**

- **synchronize: true** (Current):
  - Auto-creates/updates tables from entities
  - Good for development
  - ⚠️ DANGEROUS in production (can drop columns/data)

- **Migrations** (Recommended for Production):
  - Explicit version control of schema changes
  - Safe rollback capability
  - No accidental data loss

### **3. Running Migrations in Order:**

Migrations run in chronological order based on timestamp in filename:
1. `1728648000000-CreatePublisherAccountsTable.ts` (runs first)
2. `1728648100000-CreateDownloadLogsTable.ts` (runs second)

This ensures `publisher_accounts` exists before `download_logs` references it.

---

## 🧪 **Testing Migrations:**

### **Test on Development Database:**

```bash
# 1. Backup current database
mysqldump -u root -p literature_review_db > backup.sql

# 2. Run migrations
npm run migration:run

# 3. Verify tables created
mysql -u root -p literature_review_db -e "SHOW TABLES;"

# 4. Check table structures
mysql -u root -p literature_review_db -e "DESCRIBE publisher_accounts;"
mysql -u root -p literature_review_db -e "DESCRIBE download_logs;"

# 5. If issues, revert
npm run migration:revert

# 6. Restore backup if needed
mysql -u root -p literature_review_db < backup.sql
```

### **Verify Foreign Keys:**

```sql
-- Check foreign key constraints
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'literature_review_db'
  AND TABLE_NAME IN ('publisher_accounts', 'download_logs')
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### **Verify Indexes:**

```sql
-- Check indexes on publisher_accounts
SHOW INDEXES FROM publisher_accounts;

-- Check indexes on download_logs
SHOW INDEXES FROM download_logs;
```

---

## 🔄 **Migration Workflow:**

### **Development Phase:**

1. ✅ Keep `synchronize: true` for rapid iteration
2. ✅ Entities auto-update database schema
3. ✅ No migration files needed yet

### **Pre-Production Phase:**

1. ✅ Generate migrations from entities:
   ```bash
   npm run migration:generate -- src/migrations/MigrationName
   ```
2. ✅ Review generated SQL
3. ✅ Test migrations on staging database

### **Production Phase:**

1. ✅ Set `synchronize: false`
2. ✅ Run migrations on production:
   ```bash
   NODE_ENV=production npm run migration:run
   ```
3. ✅ Monitor logs for errors
4. ✅ Keep migrations in version control (Git)

---

## 🛠️ **Common Migration Commands:**

```bash
# Show migration status (which have run)
npx typeorm migration:show -d src/config/typeorm.config.ts

# Create empty migration file
npx typeorm migration:create src/migrations/MigrationName

# Generate migration from entity changes
npx typeorm migration:generate src/migrations/MigrationName -d src/config/typeorm.config.ts

# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Revert all migrations (⚠️ DANGER)
# Run migration:revert multiple times
```

---

## 📝 **Sample Data for Testing:**

### **Insert Test Publisher Account:**

```sql
-- After running migrations, you can insert test data:
INSERT INTO publisher_accounts (
  user_id, 
  publisher_name, 
  account_email, 
  verification_status,
  is_active
) VALUES (
  1, -- Replace with actual user ID
  'ieee',
  'test@example.com',
  'verified',
  TRUE
);
```

### **Insert Test Download Log:**

```sql
INSERT INTO download_logs (
  user_id,
  paper_id,
  publisher_account_id,
  download_method,
  download_status,
  file_size_bytes
) VALUES (
  1, -- User ID
  1, -- Paper ID
  1, -- Publisher Account ID
  'publisher_oauth',
  'success',
  2048576 -- 2MB
);
```

---

## 🔍 **Troubleshooting:**

### **Error: "Table already exists"**

```bash
# Solution: Table was created by synchronize
# Option 1: Drop tables manually and re-run migration
mysql -u root -p literature_review_db -e "DROP TABLE IF EXISTS download_logs, publisher_accounts;"
npm run migration:run

# Option 2: Skip this migration (not recommended)
# Manually update migrations table to mark as run
```

### **Error: "Foreign key constraint fails"**

```bash
# Solution: Ensure parent tables exist
# Check that 'users' and 'papers' tables exist first
mysql -u root -p literature_review_db -e "SHOW TABLES LIKE '%users%';"
mysql -u root -p literature_review_db -e "SHOW TABLES LIKE '%papers%';"
```

### **Error: "Migration failed, reverting..."**

```bash
# Check migration logs
# Fix the SQL in migration file
# Re-run migration
npm run migration:run
```

---

## ✅ **Post-Migration Checklist:**

- [ ] Tables created successfully
- [ ] Foreign keys established
- [ ] Indexes created
- [ ] Unique constraints working
- [ ] Enum values correct
- [ ] Timestamps auto-updating
- [ ] CASCADE deletes working
- [ ] SET NULL on publisher_account delete working

---

## 🎯 **Next Steps After Migration:**

1. ✅ Update `app.module.ts` to import PublisherAccount & DownloadLog entities
2. ✅ Create PublishersModule, Controller, Service
3. ✅ Implement EncryptionService for token security
4. ✅ Build OAuth strategies (IEEE, Springer, ACM)
5. ✅ Create frontend Publisher Accounts page
6. ✅ Test full OAuth flow

---

**Migration Files Location:**
- `backend/src/migrations/1728648000000-CreatePublisherAccountsTable.ts`
- `backend/src/migrations/1728648100000-CreateDownloadLogsTable.ts`

**Entity Files Location:**
- `backend/src/modules/publishers/entities/publisher-account.entity.ts`
- `backend/src/modules/publishers/entities/download-log.entity.ts`

