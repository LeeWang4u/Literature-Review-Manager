# TÀI LIỆU API - LITERATURE REVIEW MANAGER

## Tổng Quan Hệ Thống

**Literature Review Manager** là hệ thống quản lý tài liệu nghiên cứu khoa học với các tính năng:
- Quản lý bài báo khoa học (papers)
- Quản lý trích dẫn và mạng lưới trích dẫn (citations network)
- Quản lý ghi chú (notes)
- Quản lý thẻ (tags)
- Quản lý PDF
- Tóm tắt bài báo bằng AI
- Chat với AI về bài báo
- Xác thực người dùng (JWT, Google OAuth)

**Base URL**: `http://localhost:3000`  
**Authentication**: Bearer Token (JWT)

---

## 1. AUTHENTICATION MODULE (`/auth`)

### 1.1. Đăng Ký Người Dùng
•	**Endpoint**: `POST /auth/register`  
•	**Mô tả**: Tạo tài khoản người dùng mới  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "email": "user@example.com",<br>  "password": "password123",<br>  "name": "Nguyễn Văn A"<br>}<br>``` | ```json<br>{<br>  "id": 1,<br>  "email": "user@example.com",<br>  "name": "Nguyễn Văn A",<br>  "createdAt": "2025-12-04T00:00:00.000Z"<br>}<br>``` |

•	**Status Codes**:
  - `201`: Đăng ký thành công
  - `409`: Email đã tồn tại

---

### 1.2. Đăng Nhập
•	**Endpoint**: `POST /auth/login`  
•	**Mô tả**: Đăng nhập và nhận JWT token  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "email": "user@example.com",<br>  "password": "password123"<br>}<br>``` | ```json<br>{<br>  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",<br>  "user": {<br>    "id": 1,<br>    "email": "user@example.com",<br>    "name": "Nguyễn Văn A"<br>  }<br>}<br>``` |

•	**Status Codes**:
  - `200`: Đăng nhập thành công
  - `401`: Thông tin đăng nhập không hợp lệ

---

### 1.3. Lấy Thông Tin Profile
•	**Endpoint**: `GET /auth/profile`  
•	**Mô tả**: Lấy thông tin người dùng hiện tại  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "id": 1,<br>  "email": "user@example.com",<br>  "name": "Nguyễn Văn A",<br>  "createdAt": "2025-12-04T00:00:00.000Z"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `401`: Chưa xác thực

---

### 1.4. Đổi Mật Khẩu
•	**Endpoint**: `POST /auth/change-password`  
•	**Mô tả**: Đổi mật khẩu cho người dùng đang đăng nhập  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "currentPassword": "oldpassword123",<br>  "newPassword": "newpassword456"<br>}<br>``` | ```json<br>{<br>  "message": "Password changed successfully"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Đổi mật khẩu thành công
  - `400`: Mật khẩu hiện tại không đúng

---

### 1.5. Quên Mật Khẩu
•	**Endpoint**: `POST /auth/forgot-password`  
•	**Mô tả**: Gửi OTP đến email để reset mật khẩu  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "email": "user@example.com"<br>}<br>``` | ```json<br>{<br>  "message": "OTP đã được gửi đến email",<br>  "token": "reset-token-xyz"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Email không tồn tại

---

### 1.6. Reset Mật Khẩu
•	**Endpoint**: `POST /auth/reset-password`  
•	**Mô tả**: Reset mật khẩu với OTP  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "token": "reset-token-xyz",<br>  "otp": "123456",<br>  "newPassword": "newpassword789"<br>}<br>``` | ```json<br>{<br>  "message": "Password reset successfully"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `400`: OTP không hợp lệ

---

### 1.7. Đăng Nhập Google
•	**Endpoint**: `GET /auth/google`  
•	**Mô tả**: Chuyển hướng đến trang đăng nhập Google OAuth  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Redirect to Google OAuth page |

•	**Status Codes**:
  - `302`: Redirect

---

### 1.8. Google OAuth Callback
•	**Endpoint**: `GET /auth/google/callback`  
•	**Mô tả**: Xử lý callback từ Google và redirect về frontend với token  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| Query parameters từ Google | Redirect to frontend với JWT token |

•	**Status Codes**:
  - `302`: Redirect

---

### 1.9. Xác Thực Email
•	**Endpoint**: `POST /auth/verify-email`  
•	**Mô tả**: Xác thực email với OTP  
•	**Authentication**: Không

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "token": "verification-token",<br>  "otp": "123456"<br>}<br>``` | ```json<br>{<br>  "message": "Email verified successfully"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `400`: OTP sai

---

## 2. PAPERS MODULE (`/papers`)

### 2.1. Trích Xuất Metadata Từ DOI/URL
•	**Endpoint**: `POST /papers/extract-metadata`  
•	**Mô tả**: Tự động lấy thông tin bài báo từ DOI, URL (Crossref, Semantic Scholar, ArXiv)  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "input": "10.1038/nature12373"<br>}<br>``` | ```json<br>{<br>  "title": "Example Paper Title",<br>  "authors": "John Doe, Jane Smith",<br>  "abstract": "This is the abstract...",<br>  "publicationYear": 2023,<br>  "journal": "Nature",<br>  "doi": "10.1038/nature12373",<br>  "url": "https://doi.org/10.1038/nature12373",<br>  "keywords": "machine learning, AI",<br>  "references": [...]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `400`: Input không hợp lệ

**Hỗ trợ input**: DOI, URL Crossref, URL Semantic Scholar, ArXiv ID

---

### 2.2. Download PDF Từ ArXiv
•	**Endpoint**: `POST /papers/download-arxiv-pdf`  
•	**Mô tả**: Tải PDF từ ArXiv  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "input": "2301.12345"<br>}<br>``` | ```json<br>{<br>  "arxivId": "2301.12345",<br>  "filename": "2301.12345.pdf",<br>  "size": 1234567,<br>  "data": "base64-encoded-pdf-data..."<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Không tìm thấy

---

### 2.3. Tạo Bài Báo Mới
•	**Endpoint**: `POST /papers`  
•	**Mô tả**: Thêm bài báo mới vào hệ thống  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "title": "Paper Title",<br>  "authors": "John Doe, Jane Smith",<br>  "abstract": "Abstract text...",<br>  "publicationYear": 2023,<br>  "journal": "Nature",<br>  "doi": "10.1234/example",<br>  "url": "https://example.com/paper",<br>  "keywords": "AI, machine learning",<br>  "tagIds": [1, 2, 3],<br>  "references": [...]<br>}<br>``` | ```json<br>{<br>  "success": true,<br>  "message": "Paper created successfully",<br>  "data": {<br>    "id": 1,<br>    "title": "Paper Title",<br>    "createdAt": "2025-12-04T00:00:00.000Z"<br>  }<br>}<br>``` |

•	**Status Codes**:
  - `201`: Thành công
  - `400`: Dữ liệu không hợp lệ

---

### 2.4. Lấy Danh Sách Bài Báo
•	**Endpoint**: `GET /papers`  
•	**Mô tả**: Lấy tất cả bài báo với tìm kiếm và filter  
•	**Authentication**: Bearer Token  
•	**Query Parameters**:
  - `search`: Tìm kiếm theo title/authors
  - `tagId`: Filter theo tag
  - `year`: Filter theo năm
  - `page`: Số trang (mặc định 1)
  - `limit`: Số lượng/trang (mặc định 10)

| **Request Body** | **Response** |
|------------------|--------------|
| Không có<br><br>**Example**: `GET /papers?search=machine learning&tagId=1&page=1&limit=10` | ```json<br>{<br>  "data": [{<br>    "id": 1,<br>    "title": "Paper Title",<br>    "authors": "John Doe",<br>    "year": 2023,<br>    "tags": [{"id": 1, "name": "AI"}]<br>  }],<br>  "total": 50,<br>  "page": 1,<br>  "limit": 10,<br>  "totalPages": 5<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 2.5. Tìm Bài Báo Theo DOI/URL
•	**Endpoint**: `GET /papers/find`  
•	**Mô tả**: Tìm bài báo trong hệ thống theo DOI hoặc URL  
•	**Authentication**: Bearer Token  
•	**Query Parameters**: `?doi=10.1234/example` hoặc `?url=https://...`

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Paper object nếu tìm thấy |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Không tìm thấy

---

### 2.6. Lấy Thống Kê
•	**Endpoint**: `GET /papers/statistics`  
•	**Mô tả**: Lấy thống kê bài báo của user  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "totalPapers": 150,<br>  "toRead": 50,<br>  "reading": 30,<br>  "completed": 70,<br>  "favorites": 25,<br>  "byYear": {<br>    "2023": 80,<br>    "2022": 40,<br>    "2021": 30<br>  }<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 2.7. Lấy Bài Báo Theo ID
•	**Endpoint**: `GET /papers/:id`  
•	**Mô tả**: Lấy chi tiết một bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có<br><br>**Example**: `GET /papers/1` | Paper object với đầy đủ thông tin |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Không tìm thấy

---

### 2.8. Cập Nhật Bài Báo
•	**Endpoint**: `PUT /papers/:id`  
•	**Mô tả**: Cập nhật thông tin bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Tương tự POST /papers | Updated paper object |

•	**Status Codes**:
  - `200`: Thành công
  - `403`: Không có quyền (không phải owner)
  - `404`: Không tìm thấy

---

### 2.9. Xóa Bài Báo
•	**Endpoint**: `DELETE /papers/:id`  
•	**Mô tả**: Xóa bài báo khỏi hệ thống  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "message": "Paper deleted successfully"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Xóa thành công
  - `403`: Không có quyền
  - `404`: Không tìm thấy

---

### 2.10. Cập Nhật Trạng Thái/Favorite
•	**Endpoint**: `PUT /papers/:id/status`  
•	**Mô tả**: Cập nhật trạng thái đọc hoặc favorite  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "status": "reading",<br>  "favorite": true<br>}<br>```<br><br>**Status values**: `to_read`, `reading`, `completed` | Updated paper object |

•	**Status Codes**:
  - `200`: Thành công

---

### 2.11. Lấy Thư Viện
•	**Endpoint**: `GET /papers/library`  
•	**Mô tả**: Lấy danh sách bài báo trong thư viện với filter  
•	**Authentication**: Bearer Token  
•	**Query Parameters**: `?status=reading&favorite=true`

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Array of papers in library |

•	**Status Codes**:
  - `200`: Thành công

---

### 2.12. Auto-Rate References
•	**Endpoint**: `POST /papers/:id/auto-rate-references`  
•	**Mô tả**: Sử dụng AI để tự động đánh giá độ liên quan của tất cả references  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "success": true,<br>  "rated": 15,<br>  "failed": 2,<br>  "message": "Auto-rated 15/17 references"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `500`: AI lỗi

---

### 2.13. Fetch Nested References
•	**Endpoint**: `POST /papers/:id/fetch-nested-references`  
•	**Mô tả**: Lấy references của references (multi-level citation network)  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "depth": 1,<br>  "maxDepth": 2<br>}<br>``` | ```json<br>{<br>  "success": true,<br>  "fetchedCount": 45,<br>  "depth": 1,<br>  "maxDepth": 2<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 2.14. Fetch Nested Eager
•	**Endpoint**: `POST /papers/:id/fetch-nested/eager`  
•	**Mô tả**: Tìm DOI nếu thiếu và fetch references ở depth chỉ định  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "targetDepth": 1,<br>  "maxDepth": 2<br>}<br>``` | Success message với số lượng references fetched |

•	**Status Codes**:
  - `200`: Thành công

---

## 3. CITATIONS MODULE (`/citations`)

### 3.1. Tạo Citation
•	**Endpoint**: `POST /citations`  
•	**Mô tả**: Tạo mối quan hệ trích dẫn giữa 2 bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "citingPaperId": 1,<br>  "citedPaperId": 2,<br>  "citationContext": "This paper builds on...",<br>  "relevanceScore": 0.85<br>}<br>``` | Created citation object |

•	**Status Codes**:
  - `201`: Tạo citation thành công
  - `400`: Invalid (self-citation hoặc đã tồn tại)

---

### 3.2. Lấy Citations Của Paper
•	**Endpoint**: `GET /citations/paper/:paperId`  
•	**Mô tả**: Lấy danh sách citing và cited papers  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "citing": [{...}],<br>  "cited": [{...}]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.3. Lấy References
•	**Endpoint**: `GET /citations/paper/:paperId/references`  
•	**Mô tả**: Lấy danh sách bài báo mà paper này trích dẫn  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Array of reference papers với relevanceScore |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.4. Lấy Cited-By
•	**Endpoint**: `GET /citations/paper/:paperId/cited-by`  
•	**Mô tả**: Lấy danh sách bài báo trích dẫn paper này  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Array of papers citing this paper |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.5. Lấy Citation Network
•	**Endpoint**: `GET /citations/network/:paperId`  
•	**Mô tả**: Lấy mạng lưới trích dẫn cho visualization D3.js  
•	**Authentication**: Bearer Token  
•	**Query Parameters**: `?depth=3` (mặc định: 2)

| **Request Body** | **Response** |
|------------------|--------------|
| Không có<br><br>**Example**: `GET /citations/network/1?depth=3` | ```json<br>{<br>  "nodes": [<br>    {<br>      "id": 1,<br>      "title": "Main Paper",<br>      "year": 2023,<br>      "authors": ["Author 1"],<br>      "relevanceScore": 1.0,<br>      "networkDepth": 0<br>    }<br>  ],<br>  "edges": [<br>    {<br>      "source": 1,<br>      "target": 2,<br>      "relevanceScore": 0.85,<br>      "isInfluential": true<br>    }<br>  ]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.6. Lấy Citation Statistics
•	**Endpoint**: `GET /citations/stats/:paperId`  
•	**Mô tả**: Lấy thống kê trích dẫn  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "referencesCount": 25,<br>  "citedByCount": 10,<br>  "averageRelevance": 0.75,<br>  "influentialCount": 5<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.7. Cập Nhật Citation
•	**Endpoint**: `PATCH /citations/:id`  
•	**Mô tả**: Cập nhật relevance score và context  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "relevanceScore": 0.9,<br>  "citationContext": "Updated context..."<br>}<br>``` | Updated citation object |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.8. Xóa Citation
•	**Endpoint**: `DELETE /citations/:id`  
•	**Mô tả**: Xóa mối quan hệ trích dẫn  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.9. AI Auto-Rate Citation
•	**Endpoint**: `POST /citations/:id/auto-rate`  
•	**Mô tả**: Sử dụng AI để tự động đánh giá độ liên quan của một citation  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "id": 1,<br>  "relevanceScore": 0.87,<br>  "aiRated": true,<br>  "confidence": 0.92<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công
  - `500`: AI lỗi

---

### 3.10. AI Auto-Rate All References
•	**Endpoint**: `POST /citations/paper/:paperId/auto-rate-all`  
•	**Mô tả**: Tự động đánh giá tất cả references của một paper  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "success": true,<br>  "rated": 20,<br>  "failed": 2,<br>  "averageScore": 0.78<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.11. Analyze References
•	**Endpoint**: `GET /citations/paper/:paperId/analyze`  
•	**Mô tả**: Phân tích và xếp hạng references theo độ quan trọng  
•	**Authentication**: Bearer Token  
•	**Query Parameters**:
  - `limit`: Top N references (mặc định: 10)
  - `minRelevance`: Score tối thiểu 0-1 (mặc định: 0.5)

| **Request Body** | **Response** |
|------------------|--------------|
| Không có<br><br>**Example**: `GET /citations/paper/1/analyze?limit=15&minRelevance=0.6` | ```json<br>{<br>  "totalReferences": 50,<br>  "analyzedReferences": 45,<br>  "topReferences": [...]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.12. Debug Citations
•	**Endpoint**: `GET /citations/debug/paper/:paperId`  
•	**Mô tả**: Lấy raw citation data để debug  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Raw citation data |

•	**Status Codes**:
  - `200`: Thành công

---

### 3.13. Test Citation Parser
•	**Endpoint**: `POST /citations/test-parser`  
•	**Mô tả**: Test AI parser với citation strings mẫu  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "citations": [<br>    "Smith, J. (2022). ML Basics.",<br>    "Doe et al. Deep Learning, 2023"<br>  ]<br>}<br>``` | ```json<br>{<br>  "success": true,<br>  "count": 2,<br>  "results": [...]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

## 4. NOTES MODULE (`/notes`)

### 4.1. Tạo Note
•	**Endpoint**: `POST /notes`  
•	**Mô tả**: Tạo ghi chú mới  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "paperId": 1,<br>  "title": "Note Title",<br>  "content": "Note content...",<br>  "noteType": "summary"<br>}<br>```<br><br>**Note Types**: `summary`, `critique`, `methodology`, `findings`, `general` | Created note object |

•	**Status Codes**:
  - `201`: Thành công

---

### 4.2. Lấy Tất Cả Notes
•	**Endpoint**: `GET /notes`  
•	**Mô tả**: Lấy tất cả ghi chú của user  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Array of all user's notes |

•	**Status Codes**:
  - `200`: Thành công

---

### 4.3. Lấy Notes Của Paper
•	**Endpoint**: `GET /notes/paper/:paperId`  
•	**Mô tả**: Lấy tất cả ghi chú của một bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có<br><br>**Example**: `GET /notes/paper/1` | Array of notes for the paper |

•	**Status Codes**:
  - `200`: Thành công

---

### 4.4. Lấy Note Theo ID
•	**Endpoint**: `GET /notes/:id`  
•	**Mô tả**: Lấy chi tiết một ghi chú  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Note object |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Không tìm thấy

---

### 4.5. Cập Nhật Note
•	**Endpoint**: `PUT /notes/:id`  
•	**Mô tả**: Cập nhật ghi chú  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "title": "Updated Title",<br>  "content": "Updated content...",<br>  "noteType": "critique"<br>}<br>``` | Updated note object |

•	**Status Codes**:
  - `200`: Thành công

---

### 4.6. Xóa Note
•	**Endpoint**: `DELETE /notes/:id`  
•	**Mô tả**: Xóa ghi chú  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

## 5. LIBRARY MODULE (`/library`)

### 5.1. Thêm Vào Thư Viện
•	**Endpoint**: `POST /library/add`  
•	**Mô tả**: Thêm bài báo vào thư viện cá nhân  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "paperId": 1,<br>  "status": "to_read"<br>}<br>```<br><br>**Status**: `to_read`, `reading`, `completed` | Created library entry |

•	**Status Codes**:
  - `201`: Thêm thành công
  - `409`: Bài báo đã có trong thư viện

---

### 5.2. Lấy Thống Kê Thư Viện
•	**Endpoint**: `GET /library/statistics`  
•	**Mô tả**: Lấy thống kê thư viện  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "totalPapers": 100,<br>  "toRead": 40,<br>  "reading": 30,<br>  "completed": 30,<br>  "favorites": 15,<br>  "averageRating": 4.2<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 5.3. Cập Nhật Trạng Thái Đọc
•	**Endpoint**: `PUT /library/:id/status`  
•	**Mô tả**: Cập nhật trạng thái đọc  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "status": "reading"<br>}<br>``` | Updated library entry |

•	**Status Codes**:
  - `200`: Thành công

---

### 5.4. Đánh Giá Paper
•	**Endpoint**: `PUT /library/:id/rating`  
•	**Mô tả**: Đánh giá bài báo (1-5 sao)  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "rating": 5<br>}<br>``` | Updated library entry |

•	**Status Codes**:
  - `200`: Thành công

---

### 5.5. Xóa Khỏi Thư Viện
•	**Endpoint**: `DELETE /library/:id`  
•	**Mô tả**: Xóa bài báo khỏi thư viện  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

### 5.6. Lấy Danh Sách Trạng Thái
•	**Endpoint**: `GET /library/statuses`  
•	**Mô tả**: Lấy danh sách các trạng thái đọc có sẵn  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "statuses": ["to_read", "reading", "completed"]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 5.7. Toggle Favorite
•	**Endpoint**: `PATCH /library/:id/favorite`  
•	**Mô tả**: Bật/tắt favorite cho bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "favorite": true<br>}<br>``` | Updated library entry |

•	**Status Codes**:
  - `200`: Thành công

---

## 6. PDF MODULE (`/pdf`)

### 6.1. Upload PDF
•	**Endpoint**: `POST /pdf/upload/:paperId`  
•	**Mô tả**: Upload file PDF cho một bài báo (max 10MB)  
•	**Authentication**: Bearer Token  
•	**Content-Type**: `multipart/form-data`

| **Request Body** | **Response** |
|------------------|--------------|
| **Form Data**: `file` (PDF file) | ```json<br>{<br>  "id": 1,<br>  "paperId": 1,<br>  "filename": "paper.pdf",<br>  "filepath": "/uploads/pdf-123456.pdf",<br>  "size": 2048576<br>}<br>``` |

•	**Status Codes**:
  - `201`: Upload thành công
  - `400`: File không hợp lệ hoặc quá lớn

---

### 6.2. Lấy PDF Files Của Paper
•	**Endpoint**: `GET /pdf/paper/:paperId`  
•	**Mô tả**: Lấy danh sách tất cả PDF của một bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Array of PDF files |

•	**Status Codes**:
  - `200`: Thành công

---

### 6.3. Lấy PDF Metadata
•	**Endpoint**: `GET /pdf/:id`  
•	**Mô tả**: Lấy thông tin metadata của một PDF file  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | PDF metadata object |

•	**Status Codes**:
  - `200`: Thành công

---

### 6.4. Download PDF
•	**Endpoint**: `GET /pdf/download/:id`  
•	**Mô tả**: Download file PDF  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | PDF file stream |

•	**Status Codes**:
  - `200`: Thành công

---

### 6.5. Xóa PDF
•	**Endpoint**: `DELETE /pdf/:id`  
•	**Mô tả**: Xóa file PDF  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

### 6.6. Trích Xuất Text Từ PDF
•	**Endpoint**: `GET /pdf/extract-text/:id`  
•	**Mô tả**: Trích xuất text content từ PDF  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "id": 1,<br>  "text": "Extracted text content...",<br>  "pages": 15,<br>  "wordCount": 5000<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

## 7. TAGS MODULE (`/tags`)

### 7.1. Tạo Tag
•	**Endpoint**: `POST /tags`  
•	**Mô tả**: Tạo thẻ mới  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "name": "Machine Learning",<br>  "color": "#3498db"<br>}<br>``` | Created tag object |

•	**Status Codes**:
  - `201`: Thành công

---

### 7.2. Lấy Tất Cả Tags
•	**Endpoint**: `GET /tags`  
•	**Mô tả**: Lấy tất cả thẻ của user  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>[<br>  {<br>    "id": 1,<br>    "name": "Machine Learning",<br>    "color": "#3498db",<br>    "paperCount": 25<br>  }<br>]<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 7.3. Lấy Tag Theo ID
•	**Endpoint**: `GET /tags/:id`  
•	**Mô tả**: Lấy chi tiết một thẻ  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Tag object |

•	**Status Codes**:
  - `200`: Thành công

---

### 7.4. Cập Nhật Tag
•	**Endpoint**: `PUT /tags/:id`  
•	**Mô tả**: Cập nhật tên hoặc màu của thẻ  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "name": "Deep Learning",<br>  "color": "#e74c3c"<br>}<br>``` | Updated tag object |

•	**Status Codes**:
  - `200`: Thành công

---

### 7.5. Xóa Tag
•	**Endpoint**: `DELETE /tags/:id`  
•	**Mô tả**: Xóa thẻ  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

## 8. SUMMARIES MODULE (`/summaries`)

### 8.1. Tạo Summary Bằng AI
•	**Endpoint**: `POST /summaries/generate/:paperId`  
•	**Mô tả**: Tạo tóm tắt bài báo bằng Gemini AI  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "forceRegenerate": false,<br>  "provider": "gemini"<br>}<br>``` | ```json<br>{<br>  "id": 1,<br>  "paperId": 1,<br>  "summary": "This paper discusses...",<br>  "keyFindings": ["Finding 1", "Finding 2"],<br>  "methodology": "The authors used...",<br>  "provider": "gemini",<br>  "createdAt": "2025-12-04T00:00:00.000Z"<br>}<br>``` |

•	**Status Codes**:
  - `201`: Tạo summary thành công
  - `400`: AI service không khả dụng
  - `404`: Không tìm thấy bài báo

---

### 8.2. Lấy Summary
•	**Endpoint**: `GET /summaries/:paperId`  
•	**Mô tả**: Lấy summary của một bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Summary object |

•	**Status Codes**:
  - `200`: Thành công
  - `404`: Không tìm thấy

---

### 8.3. Xóa Summary
•	**Endpoint**: `DELETE /summaries/:paperId`  
•	**Mô tả**: Xóa summary  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | Success message |

•	**Status Codes**:
  - `200`: Thành công

---

### 8.4. Gợi Ý Tags Bằng AI
•	**Endpoint**: `POST /summaries/suggest-tags/:paperId`  
•	**Mô tả**: Sử dụng AI để gợi ý tags cho bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "suggested": ["Machine Learning", "Computer Vision"],<br>  "confidence": 0.92<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 8.5. Gợi Ý Tags Từ Text
•	**Endpoint**: `POST /summaries/suggest-tags-from-text`  
•	**Mô tả**: Gợi ý tags từ title và abstract mà không cần paper ID  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "title": "Paper Title",<br>  "abstract": "Abstract text...",<br>  "keywords": "AI, ML"<br>}<br>``` | ```json<br>{<br>  "suggested": ["Machine Learning", "AI"],<br>  "confidence": 0.88<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

## 9. CHAT MODULE (`/chat`)

### 9.1. Chat Với AI
•	**Endpoint**: `POST /chat`  
•	**Mô tả**: Chat với AI về bài báo  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "message": "What is the main contribution?",<br>  "paperId": 1,<br>  "conversationHistory": [<br>    {<br>      "role": "user",<br>      "content": "Previous message"<br>    },<br>    {<br>      "role": "assistant",<br>      "content": "Previous response"<br>    }<br>  ]<br>}<br>``` | ```json<br>{<br>  "message": "The main contribution is...",<br>  "paperId": 1,<br>  "timestamp": "2025-12-04T00:00:00.000Z"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 9.2. Lấy Suggested Prompts
•	**Endpoint**: `GET /chat/prompts`  
•	**Mô tả**: Lấy danh sách câu hỏi gợi ý  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "prompts": [<br>    "What is the main research question?",<br>    "Summarize the methodology",<br>    "What are the key findings?",<br>    "What are the limitations?",<br>    "How does this compare to related work?"<br>  ]<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

## 10. USERS MODULE (`/users`)

### 10.1. Lấy Profile
•	**Endpoint**: `GET /users/profile`  
•	**Mô tả**: Lấy thông tin profile của user  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| Không có | ```json<br>{<br>  "id": 1,<br>  "email": "user@example.com",<br>  "name": "Nguyễn Văn A",<br>  "avatar": "https://example.com/avatar.jpg",<br>  "createdAt": "2025-12-04T00:00:00.000Z"<br>}<br>``` |

•	**Status Codes**:
  - `200`: Thành công

---

### 10.2. Cập Nhật Profile
•	**Endpoint**: `PUT /users/profile`  
•	**Mô tả**: Cập nhật thông tin profile  
•	**Authentication**: Bearer Token

| **Request Body** | **Response** |
|------------------|--------------|
| ```json<br>{<br>  "name": "Nguyễn Văn B",<br>  "avatar": "https://example.com/new-avatar.jpg"<br>}<br>``` | Updated user profile object |

•	**Status Codes**:
  - `200`: Thành công

---

## TỔNG KẾT

### Số Lượng API Endpoints: **75+ endpoints**

### Phân Loại Theo Module:
1. **Authentication** (9 endpoints): Đăng ký, đăng nhập, OAuth, reset password
2. **Papers** (14 endpoints): Quản lý bài báo, metadata extraction, nested references
3. **Citations** (13 endpoints): Quản lý trích dẫn, network visualization, AI rating
4. **Notes** (6 endpoints): Quản lý ghi chú
5. **Library** (7 endpoints): Quản lý thư viện cá nhân
6. **PDF** (6 endpoints): Upload, download, extract text
7. **Tags** (5 endpoints): Quản lý thẻ
8. **Summaries** (5 endpoints): Tóm tắt AI, gợi ý tags
9. **Chat** (2 endpoints): Chat với AI
10. **Users** (2 endpoints): Quản lý profile

### Tính Năng Nổi Bật:
1. ✅ **Tự động trích xuất metadata** từ DOI/URL (Crossref, Semantic Scholar, ArXiv)
2. ✅ **AI-powered features**: Tóm tắt, chat, rating, tag suggestions
3. ✅ **Multi-level citation network**: Fetch references lồng nhau với depth tùy chỉnh
4. ✅ **Citation network visualization**: Data cho D3.js với nodes & edges
5. ✅ **Google OAuth**: Đăng nhập bằng Google
6. ✅ **PDF management**: Upload, download, extract text
7. ✅ **Library management**: Status tracking, favorites, ratings
8. ✅ **Full-text search**: Tìm kiếm trong title, authors, abstract

### Authentication:
- **Type**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer {your-jwt-token}`
- **Token expiration**: Configurable (mặc định 7 ngày)

### Error Response Format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Common Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (không có quyền)
- `404`: Not Found
- `409`: Conflict (duplicate)
- `500`: Internal Server Error

---

**Ngày cập nhật**: 06/12/2025  
**Version**: 1.0.0  
**Backend Framework**: NestJS  
**Database**: MySQL  
**AI Provider**: Google Gemini AI
