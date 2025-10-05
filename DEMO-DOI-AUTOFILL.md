# 🎬 Demo DOI Auto-fill - Live Test

## Test với paper nổi tiếng: "Attention Is All You Need"

### DOI thật để test:

1. **ArXiv Paper - Transformer Model**
   - ArXiv: `1706.03762`
   - URL: `https://arxiv.org/abs/1706.03762`
   - Title: "Attention Is All You Need"
   - Authors: Vaswani et al.
   - Year: 2017
   - Impact: 100,000+ citations

2. **Nature Paper**
   - DOI: `10.1038/nature12373`
   - Classic astronomy paper

3. **Cell Journal**
   - DOI: `10.1016/j.cell.2020.01.001`

## 📋 Step-by-step Demo

### Step 1: Open Application
```
http://localhost:5173
```

### Step 2: Login
- Use your existing account
- Or register a new one

### Step 3: Navigate to Add Paper
1. Click "Papers" in sidebar
2. Click "Add Paper" button
3. You should see the auto-fill section at top

### Step 4: Try Auto-fill
Enter one of these:
```
https://arxiv.org/abs/1706.03762
```
OR
```
10.1038/nature12373
```

### Step 5: Click "Auto-fill"
Watch the magic happen! 🪄

## 🎯 Expected Results

### For ArXiv (1706.03762):
```
Title: Attention Is All You Need
Authors: Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin
Abstract: The dominant sequence transduction models...
Year: 2017
Keywords: Machine Learning, Neural Networks, Transformers
```

### For Nature DOI (10.1038/nature12373):
```
Title: Observational Evidence from Supernovae...
Authors: Adam G. Riess, Alexei V. Filippenko, et al.
Abstract: We present spectral and photometric...
Year: 1998
Journal: The Astronomical Journal
```

## 🔧 If Testing Backend API Directly

You can also test using Swagger UI:

1. Open: http://localhost:3000/api/docs
2. Find: `POST /papers/extract-metadata`
3. Click "Try it out"
4. Enter request body:
```json
{
  "input": "https://arxiv.org/abs/1706.03762"
}
```
5. Click "Execute"
6. See the response!

## 📸 What You Should See

### In Frontend:
1. ℹ️ Blue info alert with instructions
2. 🪄 Input field with magic wand icon
3. "Auto-fill" button (purple/primary color)
4. When clicked:
   - Button shows "Extracting..." with spinner
   - After 2-5 seconds: Success toast
   - All form fields populated
   - DOI input cleared

### In Backend Console:
```
[PaperMetadataService] Extracting metadata from: https://arxiv.org/abs/1706.03762
[PaperMetadataService] Processing URL: https://arxiv.org/abs/1706.03762
[PaperMetadataService] Fetching from Semantic Scholar: arXiv:1706.03762
```

## ✅ Success Indicators

- ✅ Loading spinner appears
- ✅ Success toast: "Metadata extracted successfully!"
- ✅ Title field filled
- ✅ Authors field filled (comma-separated)
- ✅ Abstract field filled
- ✅ Publication Year filled
- ✅ Journal/Venue field filled (if available)
- ✅ DOI field filled
- ✅ URL field filled

## ❌ If Something Goes Wrong

### Error: "Invalid input"
- Check DOI/URL format
- Make sure no extra spaces

### Error: "Unable to fetch metadata"
- Paper might not be in databases
- Try a different DOI
- Check internet connection

### Network Tab Shows Error
- Open DevTools (F12) → Network tab
- Check the API call to `/papers/extract-metadata`
- Look at response body for error details

### Backend Not Responding
- Check backend terminal for errors
- Make sure port 3000 is not blocked
- Restart backend if needed

## 🎓 More DOIs to Try

### Computer Science:
- `10.1145/3357384.3357799` - ACM paper
- `https://arxiv.org/abs/2010.11929` - BERT paper

### Biology:
- `10.1038/nature09534` - Nature genetics
- `10.1016/j.cell.2019.01.001` - Cell biology

### Physics:
- `10.1103/PhysRevLett.116.061102` - Gravitational waves
- `10.1126/science.aaa1668` - Science magazine

## 📊 Performance Metrics to Observe

Watch for:
- ⏱️ Response time: Should be 2-5 seconds
- 🔄 Fallback: If Crossref fails, should try Semantic Scholar
- ✅ Success rate: Should work for most valid DOIs
- 🎨 UI feedback: Loading states should be smooth

---

**Ready to test? Go to http://localhost:5173 and try it now!** 🚀
