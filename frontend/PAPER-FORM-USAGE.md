# 📝 Paper Form Usage Guide

## How to Use the Paper Form

### ✨ Create New Paper

1. **Navigate to Papers Page**
   ```
   http://localhost:5173/papers
   ```

2. **Click "Add Paper" Button** (top-right)
   - Opens form at `/papers/new`

3. **Fill Required Fields** (marked with *)
   - **Title**: Enter paper title
   - **Authors**: Enter authors, separated by commas
     - Example: `Smith, John, Doe, Jane, Johnson, Alice`
   - **Abstract**: Enter paper abstract (multiline)
   - **Publication Year**: Enter year (1900 - 2026)

4. **Add Optional Information**
   - **Journal**: e.g., "Nature", "Science"
   - **DOI**: e.g., "10.1038/s41586-020-03057-6"
   - **URL**: e.g., "https://www.nature.com/articles/..."

5. **Select Tags**
   - Click tag dropdown
   - Select existing tags (multiple)
   - Tags appear as chips

6. **Create New Tags** (if needed)
   - Click "Create New Tag" button
   - Enter tag name
   - Click "Create" or press Enter
   - New tag instantly available

7. **Submit**
   - Click "Create Paper" button
   - Toast notification: "Paper created successfully!"
   - Auto-redirect to papers list

---

### ✏️ Edit Existing Paper

1. **Navigate to Paper Detail**
   ```
   Click any paper → View details
   ```

2. **Click Edit Button** (pencil icon, top-right)
   - Opens form at `/papers/:id/edit`

3. **Form Pre-Populated**
   - All fields filled with existing data
   - Tags already selected

4. **Make Changes**
   - Modify any field
   - Add/remove tags

5. **Submit**
   - Click "Update Paper" button
   - Toast notification: "Paper updated successfully!"
   - Auto-redirect to paper detail page

---

### 🗑️ Delete Paper

1. **Navigate to Paper Detail**
   ```
   Click any paper → View details
   ```

2. **Click Delete Button** (trash icon, top-right)

3. **Confirm Deletion**
   - Popup: "Are you sure you want to delete this paper?"
   - Click "OK" to confirm

4. **Paper Deleted**
   - Toast notification: "Paper deleted successfully!"
   - Auto-redirect to papers list

---

## 🎯 Form Validation

### Required Fields
- ❌ Empty → Error: "Field is required"
- ✅ Filled → No error

### Publication Year
- ❌ < 1900 → Error: "Year must be after 1900"
- ❌ > 2026 → Error: "Year cannot be in the future"
- ✅ 1900-2026 → Valid

### URL
- ❌ `example.com` → Error: "Please enter a valid URL"
- ❌ `www.example.com` → Error: "Please enter a valid URL"
- ✅ `http://example.com` → Valid
- ✅ `https://example.com` → Valid

---

## 🏷️ Tag Management

### Select Existing Tags
```
1. Click tag dropdown
2. Type to search
3. Click tag name
4. Tag appears as chip
5. Repeat for multiple tags
```

### Remove Selected Tag
```
Click X on tag chip
```

### Create New Tag
```
1. Click "Create New Tag"
2. Input field appears
3. Enter tag name (e.g., "Machine Learning")
4. Click "Create" or press Enter
5. Toast: "Tag 'Machine Learning' created!"
6. Tag available in dropdown
7. Input field closes
```

### Cancel Tag Creation
```
Click "Cancel" button
```

---

## 📊 Example Paper Data

### Sample Paper #1: Machine Learning
```
Title: Deep Learning for Natural Language Processing
Authors: Smith, John, Doe, Jane
Abstract: This paper explores the application of deep learning 
          techniques in natural language processing tasks...
Year: 2024
Journal: Nature Machine Intelligence
DOI: 10.1038/s42256-024-00001-x
URL: https://www.nature.com/articles/s42256-024-00001-x
Tags: Machine Learning, NLP, Deep Learning
```

### Sample Paper #2: Climate Science
```
Title: Impact of Climate Change on Global Ecosystems
Authors: Johnson, Alice, Brown, Robert
Abstract: We analyze the effects of rising temperatures on 
          biodiversity and ecosystem stability across continents...
Year: 2023
Journal: Science
DOI: 10.1126/science.abc1234
URL: https://www.science.org/doi/10.1126/science.abc1234
Tags: Climate Change, Ecology, Environmental Science
```

### Sample Paper #3: Quantum Computing
```
Title: Quantum Algorithms for Optimization Problems
Authors: Lee, David
Abstract: This work presents novel quantum algorithms that 
          achieve exponential speedup for optimization problems...
Year: 2025
Journal: Physical Review Letters
DOI: 10.1103/PhysRevLett.125.010501
URL: https://journals.aps.org/prl/abstract/...
Tags: Quantum Computing, Algorithms, Optimization
```

---

## 🚀 Quick Actions

### Keyboard Shortcuts
- **Enter** in tag name field → Create tag
- **Escape** → (Future: Close form)

### Navigation Flow
```
Papers List (/papers)
    ↓ Click "Add Paper"
New Paper Form (/papers/new)
    ↓ Submit
Back to Papers List (/papers)

Papers List (/papers)
    ↓ Click paper
Paper Detail (/papers/:id)
    ↓ Click Edit
Edit Paper Form (/papers/:id/edit)
    ↓ Submit
Back to Paper Detail (/papers/:id)
```

---

## ✅ Testing Checklist

### Create Paper Test
- [ ] Open form at `/papers/new`
- [ ] Fill all required fields
- [ ] Add 2-3 tags
- [ ] Create 1 new tag
- [ ] Click "Create Paper"
- [ ] Verify toast notification
- [ ] Verify redirect to `/papers`
- [ ] Find new paper in list
- [ ] Click paper to view details

### Edit Paper Test
- [ ] Navigate to paper detail
- [ ] Click Edit button (pencil icon)
- [ ] Form pre-populated correctly
- [ ] Modify title
- [ ] Change publication year
- [ ] Add 1 tag, remove 1 tag
- [ ] Click "Update Paper"
- [ ] Verify toast notification
- [ ] Verify redirect to detail page
- [ ] Check changes reflected

### Delete Paper Test
- [ ] Navigate to paper detail
- [ ] Click Delete button (trash icon)
- [ ] Confirmation dialog appears
- [ ] Click "OK"
- [ ] Verify toast notification
- [ ] Verify redirect to `/papers`
- [ ] Confirm paper removed from list

### Validation Test
- [ ] Try submit with empty title → Error
- [ ] Enter year 1800 → Error
- [ ] Enter year 3000 → Error
- [ ] Enter URL without http:// → Error
- [ ] Try create tag with empty name → Error

---

## 🎨 UI Elements

### Buttons
- **Create Paper** (Primary blue) - Submit new paper
- **Update Paper** (Primary blue) - Submit edits
- **Cancel** (Outlined gray) - Return without saving
- **Create New Tag** (Text button) - Open tag input
- **Create** (Tag create, small blue) - Submit new tag
- **Edit** (Icon button, pencil) - Edit paper
- **Delete** (Icon button, trash, red) - Delete paper

### Icons
- ✏️ Edit (Pencil) - Edit paper
- 🗑️ Delete (Trash) - Delete paper
- 💾 Save - Submit form
- ❌ Cancel - Cancel action
- ➕ Add - Create new tag

### Colors
- **Primary**: Blue (#1976d2) - Main actions
- **Secondary**: Pink (#dc004e) - Accents
- **Error**: Red - Delete, validation errors
- **Success**: Green - Toast notifications

---

## 💡 Tips

1. **Save often** when editing long abstracts
2. **Use consistent author format**: `Last, First`
3. **Always include DOI** if available (helps with citations)
4. **Tag early and often** for better organization
5. **Double-check year** before submitting
6. **Preview URL** to ensure correctness

---

**Ready to create papers!** 🎉

Test URL: `http://localhost:5173/papers/new`
