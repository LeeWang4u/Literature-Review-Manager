-- ============================================================
-- Publisher Integration - Manual Migration SQL
-- ============================================================
-- This file contains the SQL statements to manually create
-- the publisher_accounts and download_logs tables.
-- 
-- Use this if you prefer to run migrations manually instead
-- of using TypeORM migration runner.
-- ============================================================

-- ============================================================
-- Step 1: Create publisher_accounts table
-- ============================================================

CREATE TABLE IF NOT EXISTS `publisher_accounts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `publisher_name` ENUM('ieee', 'springer', 'acm', 'elsevier', 'wiley', 'arxiv', 'other') NOT NULL,
  `account_email` VARCHAR(255) DEFAULT NULL,
  `access_token` TEXT DEFAULT NULL COMMENT 'Encrypted OAuth access token',
  `refresh_token` TEXT DEFAULT NULL COMMENT 'Encrypted OAuth refresh token',
  `token_expires_at` TIMESTAMP NULL DEFAULT NULL,
  `institution_name` VARCHAR(255) DEFAULT NULL,
  `institutional_credentials` TEXT DEFAULT NULL COMMENT 'Encrypted institutional login credentials',
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `verification_status` ENUM('pending', 'verified', 'failed', 'expired') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Unique constraint: one account per publisher per user
  UNIQUE KEY `IDX_UNIQUE_USER_PUBLISHER` (`user_id`, `publisher_name`),
  
  -- Index for faster user lookups
  KEY `IDX_PUBLISHER_ACCOUNTS_USER_ID` (`user_id`),
  
  -- Index for filtering active accounts
  KEY `IDX_PUBLISHER_ACCOUNTS_IS_ACTIVE` (`is_active`),
  
  -- Foreign key to users table
  CONSTRAINT `FK_PUBLISHER_ACCOUNTS_USER` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Step 2: Create download_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS `download_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `paper_id` INT NOT NULL,
  `publisher_account_id` INT DEFAULT NULL,
  `download_method` ENUM('manual', 'publisher_oauth', 'institutional', 'open_access', 'arxiv') NOT NULL,
  `download_status` ENUM('success', 'failed', 'pending') NOT NULL,
  `file_size_bytes` BIGINT DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `retry_count` INT DEFAULT 0,
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  
  -- Composite index for user + paper lookups
  KEY `IDX_DOWNLOAD_LOGS_USER_PAPER` (`user_id`, `paper_id`),
  
  -- Index for status filtering
  KEY `IDX_DOWNLOAD_LOGS_STATUS` (`download_status`),
  
  -- Index for time-based queries
  KEY `IDX_DOWNLOAD_LOGS_ATTEMPTED_AT` (`attempted_at`),
  
  -- Index for publisher account queries
  KEY `IDX_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT` (`publisher_account_id`),
  
  -- Foreign key to users table
  CONSTRAINT `FK_DOWNLOAD_LOGS_USER` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE,
  
  -- Foreign key to papers table
  CONSTRAINT `FK_DOWNLOAD_LOGS_PAPER` 
    FOREIGN KEY (`paper_id`) 
    REFERENCES `papers` (`id`) 
    ON DELETE CASCADE,
  
  -- Foreign key to publisher_accounts table
  CONSTRAINT `FK_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT` 
    FOREIGN KEY (`publisher_account_id`) 
    REFERENCES `publisher_accounts` (`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Step 3: Verify tables created successfully
-- ============================================================

-- Show all tables
SHOW TABLES;

-- Show publisher_accounts structure
DESCRIBE publisher_accounts;

-- Show download_logs structure
DESCRIBE download_logs;

-- Show indexes on publisher_accounts
SHOW INDEXES FROM publisher_accounts;

-- Show indexes on download_logs
SHOW INDEXES FROM download_logs;

-- Verify foreign keys
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME,
  DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'literature_review_db'
  AND TABLE_NAME IN ('publisher_accounts', 'download_logs')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================
-- Step 4: Insert sample test data (optional)
-- ============================================================

-- Insert test publisher account
INSERT INTO publisher_accounts (
  user_id, 
  publisher_name, 
  account_email, 
  verification_status,
  is_active
) VALUES (
  1, -- Replace with actual user_id from your users table
  'ieee',
  'test@example.com',
  'verified',
  TRUE
);

-- Insert test download log
INSERT INTO download_logs (
  user_id,
  paper_id,
  publisher_account_id,
  download_method,
  download_status,
  file_size_bytes
) VALUES (
  1, -- Replace with actual user_id
  1, -- Replace with actual paper_id
  1, -- Replace with actual publisher_account_id
  'publisher_oauth',
  'success',
  2048576 -- 2MB in bytes
);

-- Verify test data
SELECT * FROM publisher_accounts;
SELECT * FROM download_logs;

-- ============================================================
-- Rollback (Drop tables) - Use if you need to start over
-- ============================================================

/*
-- Uncomment and run these commands to drop tables

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS download_logs;
DROP TABLE IF EXISTS publisher_accounts;

SET FOREIGN_KEY_CHECKS = 1;
*/

-- ============================================================
-- Migration tracking (if using TypeORM migrations table)
-- ============================================================

-- Check TypeORM migrations table
SELECT * FROM migrations;

-- Manually mark migrations as run (only if needed)
/*
INSERT INTO migrations (timestamp, name) VALUES 
  (1728648000000, 'CreatePublisherAccountsTable1728648000000'),
  (1728648100000, 'CreateDownloadLogsTable1728648100000');
*/

-- ============================================================
-- End of Migration SQL
-- ============================================================
