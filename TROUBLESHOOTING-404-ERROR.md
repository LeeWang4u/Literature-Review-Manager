# 🔧 Troubleshooting: DOI Auto-fill 404 Error

## 🚨 Error Received
```json
{
  "statusCode": 404,
  "message": "Unable to fetch paper metadata. Please enter details manually."
}
```

## 🔍 Possible Causes & Solutions

### Issue 1: Backend không có endpoint mới

**Symptom:** Error 404 khi call API

**Root Cause:** Backend đang chạy code cũ, chưa có endpoint `extract-metadata`

**Solution:**

1. **Kill tất cả Node processes:**
```powershell
# List all node processes
Get-Process node

# Kill all
Stop-Process -Name "node" -Force
```

2. **Restart backend:**
```powershell
cd "d:\Đồ Án TN\literature-review\backend"
npm run start:dev
```

3. **Verify endpoint exists:**
Tìm dòng này trong logs:
```
LOG [RouterExplorer] Mapped {/api/v1/papers/extract-metadata, POST} route
```

---

### Issue 2: External API (Crossref/Semantic Scholar) trả về 404

**Symptom:** Backend nhận request nhưng không tìm thấy paper

**Root Cause:** 
- DOI không tồn tại trong Crossref
- Paper không có trong Semantic Scholar
- ArXiv ID sai

**Solution:**

**Test với DOI đã biết chắc chắn tồn tại:**

| DOI | Status | Description |
|-----|--------|-------------|
| `https://arxiv.org/abs/1706.03762` | ✅ Works | Transformer paper - 100K+ citations |
| `10.1038/nature12373` | ✅ Should work | Nature journal paper |
| `10.9999/fake.doi` | ❌ Will fail | Fake DOI |

---

### Issue 3: URL path không đúng

**Check URL đúng:**
```
✅ Correct: http://localhost:3000/api/v1/papers/extract-metadata
❌ Wrong:   http://localhost:3000/papers/extract-metadata (missing /api/v1)
```

**Verify in frontend:**
```typescript
// frontend/src/services/api.ts
const API_BASE_URL = 'http://localhost:3000/api/v1'; // ✅ Correct

// frontend/src/services/paper-metadata.service.ts
'/papers/extract-metadata' // ✅ Correct (will be combined with base URL)
```

---

### Issue 4: Authentication token không hợp lệ

**Symptom:** 401 Unauthorized (not 404, but related)

**Solution:**
1. Login lại
2. Check token in localStorage
3. Verify token format

---

## 🧪 Debug Steps

### Step 1: Check Backend Logs

**Backend terminal should show:**
```
[PaperMetadataService] Extracting metadata from: https://arxiv.org/abs/1706.03762
[PaperMetadataService] Processing URL: https://arxiv.org/abs/1706.03762
[PaperMetadataService] Fetching from Semantic Scholar: arXiv:1706.03762
```

**If you DON'T see these logs:**
- Endpoint không được gọi
- Check frontend network tab (F12)
- Verify URL đúng

**If you see error logs:**
```
[PaperMetadataService] Semantic Scholar failed: ...
```
- External API có vấn đề
- Try different DOI
- Check internet connection

---

### Step 2: Test với Browser Console

1. **Login vào application** (http://localhost:5173)

2. **Open DevTools** (F12)

3. **Copy & paste script này vào Console:**

```javascript
// Get token
const token = localStorage.getItem('access_token');
console.log('Token:', token ? '✅ Found' : '❌ Not found');

// Test API
const testDOI = 'https://arxiv.org/abs/1706.03762';

fetch('http://localhost:3000/api/v1/papers/extract-metadata', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ input: testDOI })
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

4. **Check console output:**
- ✅ If success → metadata được trả về
- ❌ If error → xem error message

---

### Step 3: Test với Swagger UI

1. **Open Swagger:** http://localhost:3000/api/docs

2. **Find endpoint:** `POST /papers/extract-metadata`

3. **Authorize:**
   - Click 🔒 icon
   - Enter JWT token
   - Click "Authorize"

4. **Try it out:**
   - Click "Try it out"
   - Enter request body:
   ```json
   {
     "input": "https://arxiv.org/abs/1706.03762"
   }
   ```
   - Click "Execute"

5. **Check response:**
   - **200 OK** → ✅ Working!
   - **404 Not Found** → ❌ Endpoint doesn't exist
   - **401 Unauthorized** → ❌ Token invalid

---

### Step 4: Check Network Tab

1. Open DevTools (F12) → **Network tab**

2. Click "Auto-fill" button in UI

3. Find request: `extract-metadata`

4. **Check Request:**
   - **URL:** `http://localhost:3000/api/v1/papers/extract-metadata`
   - **Method:** `POST`
   - **Headers:** `Authorization: Bearer ...`
   - **Body:** `{"input":"..."}`

5. **Check Response:**
   - **Status:** Should be `200 OK`
   - **Response body:** Should have `title`, `authors`, etc.

6. **If 404:**
   - Check URL spelling
   - Verify backend is running new code
   - Check endpoint exists in backend logs

---

## 🔧 Quick Fixes

### Fix 1: Restart Backend Properly

```powershell
# 1. Kill all node processes
Stop-Process -Name "node" -Force

# 2. Navigate to backend
cd "d:\Đồ Án TN\literature-review\backend"

# 3. Clean build
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Rebuild
npm run build

# 5. Start dev server
npm run start:dev
```

### Fix 2: Clear Browser Cache

```powershell
# In browser:
# 1. F12 → Application tab
# 2. Clear Storage → Clear site data
# 3. Refresh page (Ctrl+F5)
```

### Fix 3: Verify Service is Injected

Check `papers.module.ts`:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Paper])],
  providers: [PapersService, PaperMetadataService], // ✅ Both services
  controllers: [PapersController],
  exports: [PapersService],
})
export class PapersModule {}
```

---

## ✅ Verification Checklist

Run through this checklist:

- [ ] Backend đang chạy (port 3000)
- [ ] Backend logs show endpoint registered: `/api/v1/papers/extract-metadata`
- [ ] Frontend đang chạy (port 5173)
- [ ] Đã login vào application
- [ ] Token tồn tại trong localStorage
- [ ] Test với DOI hợp lệ: `https://arxiv.org/abs/1706.03762`
- [ ] Network tab shows request to correct URL
- [ ] Backend logs show service được gọi
- [ ] Internet connection hoạt động (để gọi external APIs)

---

## 🎯 Expected Behavior

**When working correctly:**

1. **User nhập DOI:** `https://arxiv.org/abs/1706.03762`

2. **Click "Auto-fill"**

3. **Frontend:**
   - POST request to `/api/v1/papers/extract-metadata`
   - Body: `{"input":"https://arxiv.org/abs/1706.03762"}`

4. **Backend logs:**
   ```
   [PaperMetadataService] Extracting metadata from: https://arxiv.org/abs/1706.03762
   [PaperMetadataService] Processing URL: https://arxiv.org/abs/1706.03762
   [PaperMetadataService] Fetching from Semantic Scholar: arXiv:1706.03762
   ```

5. **Response 200 OK:**
   ```json
   {
     "title": "Attention Is All You Need",
     "authors": "Ashish Vaswani, Noam Shazeer, ...",
     "publicationYear": 2017,
     ...
   }
   ```

6. **Frontend:**
   - Success toast appears
   - Form fields populated
   - DOI input cleared

---

## 📞 Still Not Working?

If you've tried all above steps and it still doesn't work:

1. **Check file versions:**
   ```powershell
   # Make sure you have the latest files
   git status
   ```

2. **Rebuild everything:**
   ```powershell
   # Backend
   cd backend
   Remove-Item node_modules -Recurse -Force
   Remove-Item package-lock.json -Force
   npm install
   npm run build
   npm run start:dev
   
   # Frontend
   cd ../frontend
   npm run dev
   ```

3. **Check axios version in backend:**
   ```powershell
   cd backend
   npm list axios
   # Should show: axios@^1.7.9
   ```

4. **Provide these details for further debugging:**
   - Backend logs (full output)
   - Frontend network tab screenshot
   - Browser console errors
   - DOI you're testing with

---

**Good luck debugging! 🐛🔧**
