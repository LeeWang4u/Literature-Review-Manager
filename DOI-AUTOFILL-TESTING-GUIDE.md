# 🧪 DOI/URL Auto-fill Testing Guide

## Quick Start Testing

### 1. Start the Application

**Terminal 1 - Backend:**
```powershell
cd "d:\Đồ Án TN\literature-review\backend"
npm run start:dev
```

**Terminal 2 - Frontend:**
```powershell
cd "d:\Đồ Án TN\literature-review\frontend"
npm run dev
```

Wait for both servers to start:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Swagger: http://localhost:3000/api/docs

---

## 🔧 Backend API Testing

### Test 1: Direct API Call with Swagger

1. Open Swagger UI: http://localhost:3000/api/docs
2. Find endpoint: `POST /papers/extract-metadata`
3. Click "Try it out"
4. Enter request body:
   ```json
   {
     "input": "10.1038/nature12373"
   }
   ```
5. Click "Execute"
6. Verify response (200 OK):
   ```json
   {
     "title": "Observational Evidence...",
     "authors": "Adam G. Riess, ...",
     "abstract": "We present spectral...",
     "publicationYear": 1998,
     "journal": "The Astronomical Journal",
     "doi": "10.1038/nature12373",
     "url": "https://doi.org/10.1038/nature12373"
   }
   ```

### Test 2: Using cURL

```powershell
# Get access token first (login)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123"}'

$token = $loginResponse.accessToken

# Test extract-metadata endpoint
Invoke-RestMethod -Uri "http://localhost:3000/papers/extract-metadata" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"input":"10.1038/nature12373"}'
```

### Test 3: Check Backend Logs

Monitor terminal output for:
```
[PaperMetadataService] Extracting metadata from: 10.1038/nature12373
[PaperMetadataService] Fetching from Crossref with DOI: 10.1038/nature12373
```

---

## 🎨 Frontend UI Testing

### Test 4: Complete User Flow

1. **Login**
   - Navigate to: http://localhost:5173
   - Login with your account

2. **Navigate to Add Paper**
   - Click "Papers" in sidebar
   - Click "Add Paper" button
   - Verify you see the "Quick Start" section at top

3. **Test Auto-fill UI**
   - Verify you see:
     - ℹ️ Info alert with instructions
     - Text field with placeholder "e.g., 10.1038/nature12373..."
     - 🪄 Icon in input field
     - "Auto-fill" button
     - "Or enter manually" divider

4. **Test Auto-fill Functionality**
   - Enter DOI: `10.1038/nature12373`
   - Click "Auto-fill" button
   - Verify:
     - Button shows "Extracting..." with spinner
     - After 2-5 seconds, form fields are populated
     - Success toast appears: "Metadata extracted successfully!"
     - DOI input field is cleared

5. **Verify Form Population**
   - Check all fields are filled:
     - ✅ Title
     - ✅ Authors
     - ✅ Abstract
     - ✅ Publication Year
     - ✅ Journal
     - ✅ DOI
     - ✅ URL

6. **Test Manual Editing**
   - Edit any field (e.g., add more authors)
   - Verify changes are preserved
   - Add tags
   - Click "Save"
   - Verify paper is created successfully

---

## 📋 Test Cases

### ✅ Happy Path Tests

| Test ID | Input Type | Input Value | Expected Result |
|---------|-----------|-------------|----------------|
| TC-001 | DOI | `10.1038/nature12373` | ✅ All fields populated |
| TC-002 | DOI URL | `https://doi.org/10.1038/nature12373` | ✅ Same as TC-001 |
| TC-003 | ArXiv URL | `https://arxiv.org/abs/1706.03762` | ✅ Transformer paper data |
| TC-004 | DOI with prefix | `doi:10.1038/nature12373` | ✅ Extracts DOI correctly |

### ❌ Error Cases

| Test ID | Input Type | Input Value | Expected Result |
|---------|-----------|-------------|----------------|
| TC-101 | Invalid DOI | `invalid-doi-123` | ❌ Error: "Invalid input" |
| TC-102 | Non-existent DOI | `10.9999/fake.doi.999` | ❌ Error: "Unable to fetch metadata" |
| TC-103 | Empty input | `` | ❌ Button disabled |
| TC-104 | Random URL | `https://google.com` | ❌ Error: "Unable to extract" |

### 🔄 Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|---------|-------------------|
| TC-201 | Crossref fails, Semantic Scholar succeeds | ✅ Auto-fill works (fallback) |
| TC-202 | Both APIs fail | ❌ Error message shown |
| TC-203 | Slow network (>10s) | ⏱️ Timeout error |
| TC-204 | DOI with special characters | ✅ Handled correctly |
| TC-205 | Multiple consecutive requests | ✅ All work independently |

---

## 🧪 Test Scenarios

### Scenario 1: Nature Paper

**Input:**
```
10.1038/nature12373
```

**Expected Output:**
```
Title: Present-day constraints on the universe...
Authors: Multiple authors
Abstract: Full abstract text
Publication Year: Should be valid year
Journal: Should be "Nature" or similar
DOI: 10.1038/nature12373
URL: https://doi.org/10.1038/nature12373
```

### Scenario 2: ArXiv Paper (Attention is All You Need)

**Input:**
```
https://arxiv.org/abs/1706.03762
```

**Expected Output:**
```
Title: Attention Is All You Need
Authors: Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin
Abstract: The dominant sequence transduction models...
Publication Year: 2017
Keywords/Fields: May include "Machine Learning", "Neural Networks"
```

### Scenario 3: Recent Paper (Cell Journal)

**Input:**
```
10.1016/j.cell.2020.01.001
```

**Expected Output:**
```
Title: Should match Cell journal paper
Authors: Should be populated
Journal: Cell
Publication Year: 2020
Volume/Issue: Should be present
```

---

## 🔍 Manual Verification Checklist

### Backend Verification:

- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] Server starts without errors
- [ ] Swagger docs show new endpoint
- [ ] Endpoint requires JWT authentication
- [ ] PaperMetadataService logs appear in console
- [ ] Crossref API is called first
- [ ] Semantic Scholar fallback works

### Frontend Verification:

- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] App compiles and runs
- [ ] Auto-fill section appears on "Add Paper" page
- [ ] Auto-fill section NOT shown on edit page
- [ ] Input field has proper validation
- [ ] Button shows loading state
- [ ] Toast notifications work
- [ ] Form fields populate correctly
- [ ] Can edit auto-filled data

---

## 📊 Performance Testing

### Test Response Times:

```powershell
# Test 10 DOIs and measure time
$dois = @(
  "10.1038/nature12373",
  "10.1016/j.cell.2020.01.001",
  "10.1126/science.1234567",
  # ... add more DOIs
)

foreach ($doi in $dois) {
  $start = Get-Date
  # Make API call
  $end = Get-Date
  $duration = ($end - $start).TotalSeconds
  Write-Host "DOI: $doi - Time: $duration seconds"
}
```

**Expected:**
- Average: 2-5 seconds
- Max: 10 seconds (timeout)
- Min: 1-2 seconds (cached or fast response)

---

## 🐛 Known Issues & Workarounds

### Issue 1: Crossref Rate Limiting
**Symptom:** 429 Too Many Requests  
**Workaround:** Wait 60 seconds between requests  
**Solution:** System automatically falls back to Semantic Scholar

### Issue 2: Abstract Not Found
**Symptom:** Abstract field empty after auto-fill  
**Workaround:** Manually enter abstract or search on paper's website  
**Cause:** Some publishers don't expose abstract in API

### Issue 3: Author Name Formatting
**Symptom:** Authors show as "Last, First" instead of "First Last"  
**Workaround:** Manually reformat if needed  
**Cause:** Different APIs return different formats

---

## 🔧 Debugging Tips

### Backend Debugging:

1. **Enable Verbose Logging:**
   ```typescript
   // In paper-metadata.service.ts
   this.logger.debug(`Full response: ${JSON.stringify(data)}`);
   ```

2. **Test Individual Methods:**
   ```typescript
   // Test DOI extraction
   const doi = this.extractDOI('https://doi.org/10.1038/nature12373');
   console.log(doi); // Should be: 10.1038/nature12373
   ```

3. **Check Network Calls:**
   - Monitor terminal for axios errors
   - Check for timeout errors (>10s)
   - Verify API response structure

### Frontend Debugging:

1. **Open Browser DevTools (F12):**
   - Check Console for errors
   - Check Network tab for API calls
   - Verify request/response payloads

2. **React DevTools:**
   - Inspect component state
   - Verify `doiInput` and `isExtractingMetadata` state
   - Check form values after auto-fill

3. **Test Error Handling:**
   ```javascript
   // In browser console
   paperMetadataService.extractMetadata('invalid-doi')
     .catch(err => console.error(err));
   ```

---

## ✅ Final Acceptance Criteria

### Must Pass:

- [x] Backend builds without errors
- [x] Frontend compiles without errors
- [x] Can extract metadata from DOI
- [x] Can extract metadata from DOI URL
- [x] Can extract metadata from ArXiv URL
- [x] Error messages shown for invalid inputs
- [x] Loading state shown during extraction
- [x] Success toast after successful extraction
- [x] Form fields populated correctly
- [x] Can edit auto-filled data
- [x] Can save paper with auto-filled data
- [x] Auto-fill section only shown in create mode

### Should Pass:

- [ ] Crossref API works for most DOIs
- [ ] Semantic Scholar fallback works
- [ ] Response time < 5 seconds average
- [ ] UI responsive on mobile
- [ ] Works with proxy/VPN
- [ ] Graceful degradation if APIs down

---

## 📝 Test Report Template

```markdown
# Test Report: DOI/URL Auto-fill Feature

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Build Version:** 1.0.0

## Test Summary

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Happy Path | 4 | X | X | X |
| Error Cases | 4 | X | X | X |
| Edge Cases | 5 | X | X | X |

## Detailed Results

### TC-001: Extract from DOI
- Status: ✅ PASS / ❌ FAIL
- Notes: ...

### TC-002: Extract from DOI URL
- Status: ✅ PASS / ❌ FAIL
- Notes: ...

## Issues Found

1. **Issue #1:** Description
   - Severity: High/Medium/Low
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

## Recommendations

- [ ] Ready for production
- [ ] Needs fixes
- [ ] Requires more testing
```

---

**Happy Testing! 🎉**
