# 🗃️ Database Design: Tại sao tách AI Summary thành bảng riêng?

## Câu hỏi
Tại sao thiết kế bảng `ai_summaries` riêng biệt thay vì lưu trực tiếp vào bảng `papers`?

---

## Phương án 1: Lưu trong bảng Papers (KHÔNG được chọn)

```sql
CREATE TABLE papers (
  id INT PRIMARY KEY,
  title VARCHAR(500),
  authors TEXT,
  abstract TEXT,
  -- ... các fields khác
  
  -- AI Summary fields
  ai_summary TEXT,
  ai_key_findings JSON,
  ai_methodology TEXT,
  ai_limitations TEXT,
  ai_generated_at TIMESTAMP,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### ❌ Nhược điểm:

1. **Null Values lãng phí storage**
   - Nhiều papers chưa có AI summary → các columns này NULL
   - Mỗi paper có thể 4-5 columns NULL, lãng phí space

2. **Không flexible cho versioning**
   - Nếu muốn lưu nhiều versions của summary (v1, v2, v3)?
   - Phải thêm `ai_summary_v2`, `ai_summary_v3`... → Nightmare!

3. **Khó track history**
   - Không biết khi nào summary được tạo/cập nhật
   - Không biết summary nào là mới nhất
   - Không thể restore summary cũ

4. **Table bloat**
   - Bảng `papers` càng lúc càng to
   - Query papers thường xuyên phải load cả summary (có thể >1MB/record)
   - Làm chậm queries không liên quan đến summary

5. **Không theo chuẩn normalization**
   - Vi phạm 3NF (Third Normal Form)
   - Summary không phải là thuộc tính "inherent" của paper
   - Summary là "derived data" từ paper

---

## Phương án 2: Bảng riêng ai_summaries (✅ ĐÃ CHỌN)

```sql
CREATE TABLE papers (
  id INT PRIMARY KEY,
  title VARCHAR(500),
  authors TEXT,
  abstract TEXT,
  -- ... các fields khác
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE ai_summaries (
  id INT PRIMARY KEY,
  paper_id INT REFERENCES papers(id),
  summary TEXT,
  key_findings JSON,
  methodology TEXT,
  limitations TEXT,
  generated_at TIMESTAMP,
  INDEX idx_paper_id (paper_id)
);
```

### ✅ Ưu điểm:

### 1. **Separation of Concerns**
```typescript
// Papers table: Core academic data
- Title, authors, abstract, DOI
- Publication info
- Unchanging metadata

// AI Summaries table: Generated content
- AI-generated summary
- May change/regenerate
- Optional feature
```

### 2. **Storage Efficiency**
```
Papers WITHOUT summary:
- papers table: 100 rows × 2KB = 200KB ✅
- ai_summaries table: 0 rows = 0KB
- Total: 200KB

Papers WITH embedded summary:
- papers table: 100 rows × 3KB (with NULL columns) = 300KB ❌
- Total: 300KB (50% overhead!)
```

### 3. **Multiple Versions Support**
```sql
-- Có thể lưu nhiều versions
INSERT INTO ai_summaries (paper_id, summary, generated_at)
VALUES (1, 'Version 1 summary...', '2025-01-01');

INSERT INTO ai_summaries (paper_id, summary, generated_at)
VALUES (1, 'Version 2 improved summary...', '2025-02-01');

-- Query latest
SELECT * FROM ai_summaries 
WHERE paper_id = 1 
ORDER BY generated_at DESC 
LIMIT 1;
```

### 4. **Performance Optimization**
```sql
-- Query papers WITHOUT loading summaries (fast!)
SELECT id, title, authors FROM papers;

-- Only load summary when needed
SELECT p.*, s.summary, s.key_findings 
FROM papers p
LEFT JOIN ai_summaries s ON p.id = s.paper_id
WHERE p.id = 123;
```

### 5. **Future Extensibility**
```sql
-- Dễ dàng thêm features:

-- 1. AI model tracking
ALTER TABLE ai_summaries 
ADD COLUMN model_version VARCHAR(50);

-- 2. Quality scoring
ALTER TABLE ai_summaries 
ADD COLUMN quality_score DECIMAL(3,2);

-- 3. User feedback
ALTER TABLE ai_summaries 
ADD COLUMN user_rating INT;

-- 4. Cost tracking (API costs)
ALTER TABLE ai_summaries 
ADD COLUMN api_cost DECIMAL(10,4);
```

### 6. **Business Logic Benefits**

```typescript
// Papers service: Focus on academic data
class PapersService {
  async create(data) { /* ... */ }
  async update(id, data) { /* ... */ }
  async search(filters) { /* ... */ }
}

// Summaries service: Focus on AI features
class SummariesService {
  async generate(paperId) { 
    // Call OpenAI API
    // Save to ai_summaries table
  }
  
  async regenerate(paperId) {
    // Generate new version
    // Keep old versions for history
  }
  
  async getHistory(paperId) {
    // Get all versions
  }
}
```

### 7. **Data Integrity**
```sql
-- If paper is deleted, cascade delete summaries
ALTER TABLE ai_summaries
ADD CONSTRAINT fk_paper
FOREIGN KEY (paper_id) 
REFERENCES papers(id)
ON DELETE CASCADE;

-- One-to-Many relationship
-- 1 paper → 0 or many summaries
```

---

## Real-world Scenarios

### Scenario 1: Batch Paper Import
```typescript
// Import 1000 papers from external API
// Only 10% have summaries initially

// With separate tables:
- Insert 1000 rows vào papers table ✅
- Insert 100 rows vào ai_summaries table ✅
- Papers table clean, no NULLs

// With embedded:
- Insert 1000 rows với 900 rows có NULL summary columns ❌
- Wasted space, slower inserts
```

### Scenario 2: Regenerate All Summaries
```typescript
// AI model improved, regenerate all summaries

// With separate tables:
// Keep old summaries, add new ones
for (const paper of papers) {
  const newSummary = await generateSummary(paper);
  await db.aiSummaries.create({
    paperId: paper.id,
    summary: newSummary,
    generatedAt: new Date(),
    modelVersion: 'gpt-4-turbo'
  });
}
// Can compare old vs new! ✅

// With embedded:
// Old summaries lost forever ❌
UPDATE papers SET ai_summary = ?, ai_generated_at = ?;
```

### Scenario 3: Statistics & Analytics
```sql
-- How many papers have summaries?
SELECT COUNT(*) FROM papers;
SELECT COUNT(DISTINCT paper_id) FROM ai_summaries;
-- Easy comparison ✅

-- With embedded:
SELECT COUNT(*) FROM papers WHERE ai_summary IS NOT NULL;
-- Less clear ❌

-- Average generation time?
SELECT AVG(quality_score) FROM ai_summaries;
-- Clean ✅

-- Model performance comparison?
SELECT model_version, AVG(user_rating)
FROM ai_summaries
GROUP BY model_version;
-- Easy! ✅
```

---

## Database Design Principles Applied

### 1. **Single Responsibility Principle**
- `papers` table: Manage academic papers
- `ai_summaries` table: Manage AI-generated content

### 2. **Open/Closed Principle**
- Easy to add new AI features without modifying papers schema
- `ai_summaries` can evolve independently

### 3. **Database Normalization (3NF)**
- No repeating groups
- No partial dependencies
- No transitive dependencies
- AI summary depends on paper, not on paper's other attributes

### 4. **DRY (Don't Repeat Yourself)**
- Paper data stored once
- Summaries reference papers, not duplicate paper data

---

## Migration Path Example

Nếu sau này muốn merge lại (unlikely):

```sql
-- Add columns to papers
ALTER TABLE papers 
ADD COLUMN latest_summary TEXT,
ADD COLUMN latest_summary_at TIMESTAMP;

-- Migrate latest summaries
UPDATE papers p
JOIN (
  SELECT paper_id, summary, generated_at
  FROM ai_summaries s1
  WHERE generated_at = (
    SELECT MAX(generated_at) 
    FROM ai_summaries s2 
    WHERE s2.paper_id = s1.paper_id
  )
) latest ON p.id = latest.paper_id
SET p.latest_summary = latest.summary,
    p.latest_summary_at = latest.generated_at;

-- Keep ai_summaries for history
```

---

## Kết luận

### Tách bảng riêng là lựa chọn đúng vì:

✅ **Tính linh hoạt**: Dễ thêm features, versions, metadata  
✅ **Hiệu năng**: Papers queries nhanh hơn, không load summary không cần  
✅ **Tiết kiệm storage**: Không lãng phí space cho NULL values  
✅ **Maintainability**: Code rõ ràng, dễ maintain  
✅ **Scalability**: Dễ scale, có thể move summaries sang DB khác  
✅ **Data integrity**: Cascade deletes, clear relationships  
✅ **Future-proof**: Dễ thêm AI improvements, A/B testing  

### Khi nào NÊN merge vào papers table?

- ❌ Không bao giờ! Đây là bad practice
- Có thể chỉ lưu `latest_summary_id` trong papers để optimize 1 query duy nhất

### Best Practice hiện tại:

```typescript
// Lazy loading (default)
const paper = await papersRepo.findOne({ where: { id } });
// Only paper data loaded ✅

// Eager loading when needed
const paperWithSummary = await papersRepo.findOne({ 
  where: { id },
  relations: ['summaries'] 
});
// Load with summary ✅

// Latest summary only
const paper = await papersRepo
  .createQueryBuilder('paper')
  .leftJoinAndSelect('paper.summaries', 'summary')
  .where('paper.id = :id', { id })
  .orderBy('summary.generatedAt', 'DESC')
  .limit(1)
  .getOne();
// Optimized query ✅
```

---

*Thiết kế database không chỉ về "chạy được", mà về "scale được", "maintain được", và "evolve được"!*
