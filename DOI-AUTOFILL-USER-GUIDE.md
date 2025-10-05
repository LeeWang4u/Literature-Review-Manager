# 🎯 DOI/URL Auto-fill Feature - User Guide

## Tổng quan

Feature **DOI/URL Auto-fill** cho phép bạn tự động điền thông tin bài báo chỉ bằng cách nhập DOI hoặc URL của bài báo. Hệ thống sẽ tự động lấy metadata từ các nguồn như Crossref, Semantic Scholar, và ArXiv.

---

## 🚀 Cách sử dụng

### 1. Truy cập trang "Add New Paper"

Từ menu, chọn **Papers** → **Add Paper** hoặc truy cập: `http://localhost:5173/papers/new`

### 2. Sử dụng Auto-fill

Ở đầu form, bạn sẽ thấy một phần "Quick Start":

```
┌─────────────────────────────────────────────────────────┐
│ ℹ️ Quick Start: Enter a DOI or URL below to            │
│    automatically populate paper details!                │
└─────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐ ┌───────────────┐
│ 🪄 DOI or URL                      │ │  🪄 Auto-fill │
│ e.g., 10.1038/nature12373          │ │               │
└────────────────────────────────────┘ └───────────────┘

                Or enter manually
─────────────────────────────────────────────────────────
```

### 3. Nhập DOI hoặc URL

Bạn có thể nhập các định dạng sau:

#### ✅ DOI thuần túy:
```
10.1038/nature12373
10.1016/j.cell.2020.01.001
```

#### ✅ DOI URL:
```
https://doi.org/10.1038/nature12373
http://dx.doi.org/10.1038/nature12373
```

#### ✅ ArXiv URL:
```
https://arxiv.org/abs/2103.12345
https://arxiv.org/abs/1706.03762
```

### 4. Nhấn "Auto-fill"

- Click vào nút **"Auto-fill"** hoặc nhấn **Enter** trong ô input
- Hệ thống sẽ hiển thị trạng thái "Extracting..."
- Sau vài giây, form sẽ được tự động điền với thông tin:
  - ✅ Title (Tiêu đề)
  - ✅ Authors (Tác giả)
  - ✅ Abstract (Tóm tắt)
  - ✅ Publication Year (Năm xuất bản)
  - ✅ Journal (Tạp chí)
  - ✅ DOI
  - ✅ URL
  - ✅ Keywords (Từ khóa)

### 5. Kiểm tra và chỉnh sửa

Sau khi auto-fill thành công:
- ✏️ Kiểm tra lại các trường đã được điền
- ✏️ Chỉnh sửa nếu cần (bạn vẫn có thể sửa bất kỳ thông tin nào)
- 🏷️ Chọn hoặc tạo tags cho bài báo
- 💾 Nhấn "Save" để lưu

---

## 📝 Ví dụ thực tế

### Ví dụ 1: Paper từ Nature

**Input:**
```
10.1038/nature12373
```

**Output (Auto-filled):**
```
Title: Observational Evidence from Supernovae for an Accelerating Universe...
Authors: Adam G. Riess, Alexei V. Filippenko, Peter Challis, ...
Abstract: We present spectral and photometric observations of 10 Type Ia supernovae...
Publication Year: 1998
Journal: The Astronomical Journal
DOI: 10.1038/nature12373
URL: https://doi.org/10.1038/nature12373
```

### Ví dụ 2: Paper từ ArXiv

**Input:**
```
https://arxiv.org/abs/1706.03762
```

**Output (Auto-filled):**
```
Title: Attention Is All You Need
Authors: Ashish Vaswani, Noam Shazeer, Niki Parmar, ...
Abstract: The dominant sequence transduction models are based on complex...
Publication Year: 2017
```

---

## 🎯 API Sources

Hệ thống sử dụng các nguồn sau theo thứ tự ưu tiên:

### 1. **Crossref API** (Primary)
- ✅ Độ chính xác cao nhất cho papers có DOI
- ✅ Metadata đầy đủ (authors, journal, volume, issue, pages)
- ✅ Abstract có sẵn cho nhiều papers
- 🌐 https://api.crossref.org

### 2. **Semantic Scholar** (Fallback)
- ✅ Hỗ trợ cả DOI và ArXiv
- ✅ Bao gồm papers chưa xuất bản
- ✅ Fields of study (research areas)
- 🌐 https://api.semanticscholar.org

### 3. **OpenAlex** (Future)
- 🔮 Dự định tích hợp trong tương lai
- ✅ Open source alternative
- ✅ Comprehensive coverage
- 🌐 https://openalex.org

---

## ⚠️ Error Handling

### Lỗi thường gặp:

#### 1. "Invalid input. Please provide a valid DOI or URL"
- ❌ Input không đúng định dạng
- ✅ Kiểm tra lại DOI/URL có đúng không

#### 2. "Unable to fetch paper metadata"
- ❌ Paper không tìm thấy trong database
- ❌ Hoặc API tạm thời không khả dụng
- ✅ Thử lại sau hoặc nhập thủ công

#### 3. Network timeout
- ❌ Kết nối mạng chậm
- ✅ Kiểm tra kết nối internet và thử lại

---

## 🔧 Technical Details

### Backend Endpoint

```typescript
POST /papers/extract-metadata
Content-Type: application/json

Request Body:
{
  "input": "10.1038/nature12373"
}

Response (200 OK):
{
  "title": "Paper title...",
  "authors": "Author 1, Author 2",
  "abstract": "Abstract text...",
  "publicationYear": 2023,
  "journal": "Journal name",
  "volume": "123",
  "issue": "4",
  "pages": "123-145",
  "doi": "10.1038/nature12373",
  "url": "https://doi.org/10.1038/nature12373",
  "keywords": "keyword1, keyword2"
}
```

### Frontend Service

```typescript
import { paperMetadataService } from '@/services/paper-metadata.service';

const metadata = await paperMetadataService.extractMetadata(doiInput);
```

---

## 📊 Performance

- ⚡ Trung bình 2-5 giây cho mỗi request
- 🔄 Automatic fallback giữa các API sources
- 💾 Không cache (real-time data)
- 🌐 Timeout: 10 seconds per API call

---

## 🎓 Best Practices

### ✅ DOs:

1. **Use DOI when available**
   - DOI cho kết quả chính xác nhất
   - Crossref API có metadata đầy đủ nhất

2. **Verify auto-filled data**
   - Luôn kiểm tra lại trước khi save
   - Đặc biệt chú ý: authors, publication year

3. **Use for published papers**
   - Feature hoạt động tốt nhất với papers đã xuất bản
   - ArXiv papers có thể thiếu một số metadata

### ❌ DON'Ts:

1. **Don't rely 100% on auto-fill**
   - Abstract có thể bị thiếu hoặc cắt ngắn
   - Một số trường có thể không có (volume, issue, pages)

2. **Don't use for unpublished work**
   - Papers chưa được index sẽ không tìm thấy
   - Working papers/drafts cần nhập thủ công

3. **Don't spam the API**
   - Tránh gửi quá nhiều requests liên tiếp
   - Có thể bị rate-limited bởi external APIs

---

## 🔮 Future Enhancements

### Planned Features:

1. **Batch Import** 📦
   - Upload file CSV/BibTeX với multiple DOIs
   - Auto-import tất cả papers cùng lúc

2. **Browser Extension** 🔌
   - One-click save từ journal websites
   - Auto-detect DOI on page

3. **PDF Metadata Extraction** 📄
   - Upload PDF → extract DOI from document
   - Parse PDF metadata automatically

4. **Caching Layer** 💾
   - Cache frequently accessed papers
   - Reduce API calls, improve speed

5. **More API Sources** 🌐
   - PubMed/NCBI for biomedical papers
   - IEEE Xplore for engineering papers
   - ACM Digital Library for CS papers

---

## 🐛 Troubleshooting

### Q: Auto-fill không hoạt động?
**A:** Kiểm tra:
1. Backend server có đang chạy? (http://localhost:3000)
2. Internet connection có ổn định?
3. DOI/URL có đúng định dạng?

### Q: Một số trường bị trống sau auto-fill?
**A:** Bình thường. Một số papers không có đầy đủ metadata:
- Abstract có thể không có trong Crossref
- Volume/Issue/Pages có thể thiếu với ArXiv papers
- Bạn có thể điền thủ công các trường còn thiếu

### Q: Tại sao cần 2-5 giây?
**A:** Hệ thống phải:
1. Gọi Crossref API (timeout 10s)
2. Nếu fail, gọi Semantic Scholar (timeout 10s)
3. Parse và map response data
4. Return về frontend

### Q: Có giới hạn số lượng requests?
**A:** 
- Crossref: No rate limit (nếu có User-Agent)
- Semantic Scholar: 100 requests/5 minutes
- Nên sử dụng hợp lý

---

## 📞 Support

Nếu gặp vấn đề hoặc có câu hỏi:
1. Check console log trong browser (F12)
2. Check backend log trong terminal
3. Xem API response trong Network tab

---

## ✅ Testing Checklist

Để test feature này:

- [ ] Input DOI thuần túy: `10.1038/nature12373`
- [ ] Input DOI URL: `https://doi.org/10.1038/nature12373`
- [ ] Input ArXiv URL: `https://arxiv.org/abs/1706.03762`
- [ ] Test invalid DOI → Verify error message
- [ ] Test network error → Verify fallback behavior
- [ ] Verify all fields populated correctly
- [ ] Edit auto-filled data → Verify editable
- [ ] Save paper → Verify data persisted
- [ ] Test in edit mode → Verify auto-fill hidden

---

**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX  
**Version:** 1.0.0
