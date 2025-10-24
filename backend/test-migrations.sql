-- Test Publisher Integration Tables
-- Run after migrations are complete

USE literature_review_db;

-- ============================================================
-- Step 1: Check tables exist
-- ============================================================
SHOW TABLES LIKE '%publisher%';
SHOW TABLES LIKE '%download%';

-- ============================================================
-- Step 2: Check table structures
-- ============================================================
DESCRIBE publisher_accounts;
DESCRIBE download_logs;

-- ============================================================
-- Step 3: Insert test data
-- ============================================================

-- Get a valid user_id
SELECT id, username, email FROM users LIMIT 1;

-- Insert test publisher account (replace user_id with actual ID from above)
INSERT INTO publisher_accounts (
  user_id, 
  publisher_name, 
  account_email, 
  verification_status,
  is_active,
  last_verified_at
) VALUES (
  1, -- REPLACE WITH YOUR USER ID
  'ieee',
  'test@example.com',
  'verified',
  TRUE,
  NOW()
);

-- Verify insert
SELECT * FROM publisher_accounts;

-- Get paper_id for testing
SELECT id, title FROM papers LIMIT 1;

-- Insert test download log
INSERT INTO download_logs (
  user_id,
  paper_id,
  publisher_account_id,
  download_method,
  download_status,
  file_size_bytes,
  attempted_at,
  completed_at
) VALUES (
  1, -- REPLACE WITH YOUR USER ID
  1, -- REPLACE WITH YOUR PAPER ID
  LAST_INSERT_ID(), -- Uses the publisher_account we just created
  'publisher_oauth',
  'success',
  2048576, -- 2MB
  NOW(),
  NOW()
);

-- Verify insert
SELECT * FROM download_logs;

-- ============================================================
-- Step 4: Test relationships with JOINs
-- ============================================================

-- Get all publisher accounts with user info
SELECT 
  pa.id,
  pa.publisher_name,
  pa.account_email,
  pa.verification_status,
  pa.is_active,
  u.username,
  u.email as user_email
FROM publisher_accounts pa
JOIN users u ON pa.user_id = u.id;

-- Get download logs with full details
SELECT 
  dl.id,
  dl.download_method,
  dl.download_status,
  dl.file_size_bytes,
  dl.attempted_at,
  u.username,
  p.title as paper_title,
  pa.publisher_name
FROM download_logs dl
LEFT JOIN users u ON dl.user_id = u.id
LEFT JOIN papers p ON dl.paper_id = p.id
LEFT JOIN publisher_accounts pa ON dl.publisher_account_id = pa.id;

-- ============================================================
-- Step 5: Test UNIQUE constraint
-- ============================================================

-- This should FAIL (duplicate user_id + publisher_name)
-- Uncomment to test:
/*
INSERT INTO publisher_accounts (
  user_id, 
  publisher_name, 
  account_email
) VALUES (
  1,
  'ieee', -- Already exists for user 1
  'duplicate@example.com'
);
-- Expected error: Duplicate entry for key 'IDX_UNIQUE_USER_PUBLISHER'
*/

-- ============================================================
-- Step 6: Test CASCADE DELETE
-- ============================================================

-- Create a temporary test user
INSERT INTO users (username, email, password, full_name) 
VALUES ('test_cascade', 'test@cascade.com', 'hashed_password', 'Test User');

SET @test_user_id = LAST_INSERT_ID();

-- Create account for test user
INSERT INTO publisher_accounts (user_id, publisher_name, account_email)
VALUES (@test_user_id, 'springer', 'test@springer.com');

-- Verify account created
SELECT * FROM publisher_accounts WHERE user_id = @test_user_id;

-- Delete test user (should cascade delete account)
DELETE FROM users WHERE id = @test_user_id;

-- Verify account was deleted
SELECT * FROM publisher_accounts WHERE user_id = @test_user_id;
-- Should return 0 rows

-- ============================================================
-- Step 7: Test SET NULL on download_logs
-- ============================================================

-- Get a publisher_account_id to test
SELECT id FROM publisher_accounts LIMIT 1;

-- Check download_logs before delete
SELECT id, publisher_account_id FROM download_logs WHERE publisher_account_id IS NOT NULL;

-- Delete a publisher account (download_logs should SET NULL)
-- Uncomment to test:
/*
DELETE FROM publisher_accounts WHERE id = 1;

-- Check download_logs after delete (publisher_account_id should be NULL)
SELECT id, publisher_account_id FROM download_logs WHERE publisher_account_id IS NULL;
*/

-- ============================================================
-- Step 8: Test enum validation
-- ============================================================

-- Valid publisher names
SELECT DISTINCT publisher_name FROM publisher_accounts;

-- Try invalid publisher name (should FAIL)
-- Uncomment to test:
/*
INSERT INTO publisher_accounts (user_id, publisher_name, account_email)
VALUES (1, 'invalid_publisher', 'test@test.com');
-- Expected error: Data truncated for column 'publisher_name'
*/

-- ============================================================
-- Step 9: Check indexes
-- ============================================================

SHOW INDEXES FROM publisher_accounts;
SHOW INDEXES FROM download_logs;

-- ============================================================
-- Step 10: Check foreign keys
-- ============================================================

SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME,
  DELETE_RULE,
  UPDATE_RULE
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'literature_review_db'
  AND TABLE_NAME IN ('publisher_accounts', 'download_logs')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- ============================================================
-- Step 11: Sample analytics queries
-- ============================================================

-- Count accounts by publisher
SELECT 
  publisher_name,
  COUNT(*) as account_count,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
FROM publisher_accounts
GROUP BY publisher_name;

-- Download success rate by method
SELECT 
  download_method,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN download_status = 'success' THEN 1 ELSE 0 END) as successes,
  ROUND(SUM(CASE WHEN download_status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM download_logs
GROUP BY download_method;

-- Recent download activity
SELECT 
  dl.attempted_at,
  u.username,
  p.title,
  dl.download_method,
  dl.download_status,
  pa.publisher_name
FROM download_logs dl
LEFT JOIN users u ON dl.user_id = u.id
LEFT JOIN papers p ON dl.paper_id = p.id
LEFT JOIN publisher_accounts pa ON dl.publisher_account_id = pa.id
ORDER BY dl.attempted_at DESC
LIMIT 10;

-- ============================================================
-- Done! All tests complete.
-- ============================================================

SELECT '✅ All tests completed successfully!' as status;
