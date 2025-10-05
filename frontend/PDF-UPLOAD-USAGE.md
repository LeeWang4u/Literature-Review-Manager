# PDF Upload & Viewer - User Guide

## 📖 How to Use PDF Upload and Viewer

This guide explains how to upload, view, download, and manage PDF files for your research papers.

---

## 🎯 Overview

The PDF Upload & Viewer feature allows you to:
- Upload PDF files for each research paper
- Preview PDFs directly in the browser
- Download PDFs to your computer
- Delete PDFs you no longer need
- Track upload progress in real-time

---

## 📤 Uploading PDF Files

### Method 1: Drag and Drop (Recommended)

1. **Navigate to Paper**: Click on any paper to open its detail page
2. **Open Uploader**: Click the **"Upload PDF"** button in the PDF section
3. **Drag Files**: Drag one or more PDF files from your computer
4. **Drop**: Release the files over the upload zone (the zone will highlight)
5. **Watch Progress**: See upload progress for each file
6. **Success**: Green checkmark appears when upload completes
7. **Auto-Refresh**: The uploader closes and your PDF list updates automatically

### Method 2: Click to Browse

1. **Navigate to Paper**: Click on any paper to open its detail page
2. **Open Uploader**: Click the **"Upload PDF"** button
3. **Click Upload Zone**: Click anywhere in the dashed box
4. **Select Files**: Choose PDF file(s) from your file browser
   - Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
5. **Upload**: Files upload automatically after selection
6. **Watch Progress**: See upload progress for each file

### Upload Limits
- **File Type**: PDF files only (`.pdf`)
- **File Size**: Maximum 50MB per file
- **Multiple Files**: You can upload multiple files at once

### What Happens During Upload
```
1. File validation (type + size)
   ↓
2. Upload starts (progress: 0%)
   ↓
3. File uploaded to server (progress: 50%)
   ↓
4. Server processes file (progress: 100%)
   ↓
5. Success checkmark appears
   ↓
6. PDF list refreshes automatically
   ↓
7. Uploader closes after 2 seconds
```

---

## 👁️ Previewing PDF Files

### Preview Workflow

1. **Find Your PDF**: Scroll to the PDF section on the paper detail page
2. **Click Preview Icon**: Click the **eye icon** (👁️) on the PDF you want to view
3. **Modal Opens**: A large preview window opens with the PDF
4. **View PDF**: 
   - Scroll to navigate pages
   - Use browser zoom controls (Ctrl + / Ctrl -)
   - Use browser PDF controls (if available)
5. **Close Preview**: 
   - Click the **X** button in the top-right corner
   - Click the **"Close"** button at the bottom
   - Press **Escape** key on keyboard

### Preview Features
- ✅ Full-screen view (90% of browser height)
- ✅ Native browser PDF rendering (zoom, scroll, search)
- ✅ Responsive design (works on desktop and tablet)
- ✅ Download button in preview (quick download)

### Browser Compatibility
- **Chrome/Edge**: Full PDF support ✅
- **Firefox**: Full PDF support ✅
- **Safari**: Full PDF support ✅
- **Mobile Browsers**: May vary (some require PDF app)

---

## 💾 Downloading PDF Files

### Quick Download

1. **Locate PDF**: Find the PDF in the list on paper detail page
2. **Click Download Icon**: Click the **download icon** (⬇️)
3. **Save File**: Browser download starts automatically
4. **Check Downloads**: File saved in your browser's download folder

### Download from Preview

1. **Open Preview**: Click the eye icon to preview PDF
2. **Click Download Button**: Click **"Download"** in the bottom-right
3. **Save File**: Browser download starts automatically

### Download Details
- **Filename**: Original filename preserved
- **Format**: PDF format maintained
- **Location**: Your browser's default download folder
- **Feedback**: Success toast notification appears

---

## 🗑️ Deleting PDF Files

### Delete Workflow

1. **Find PDF**: Locate the PDF you want to delete
2. **Click Delete Icon**: Click the **red delete icon** (🗑️)
3. **Confirm Deletion**: A confirmation dialog appears:
   > "Are you sure you want to delete this PDF? This action cannot be undone."
4. **Confirm or Cancel**:
   - Click **OK** to delete
   - Click **Cancel** to keep the PDF
5. **Processing**: Loading spinner appears on the button
6. **Success**: 
   - PDF removed from list
   - Success toast notification appears
   - Page data refreshes automatically

### Important Notes
- ⚠️ **Deletion is permanent** - cannot be undone
- ⚠️ **Only your PDFs** - you can only delete PDFs you uploaded
- ✅ **Confirmation required** - prevents accidental deletion
- ✅ **Instant update** - list refreshes immediately

---

## 📊 Understanding the PDF List

### PDF Card Information

Each PDF card shows:
1. **PDF Icon**: Red PDF file icon (📄)
2. **Filename**: Original name of the file
3. **File Size**: Size in KB, MB, or GB
4. **Upload Date**: When the file was uploaded (e.g., "Jan 15, 2024")
5. **Action Buttons**: Three icons:
   - 👁️ **Preview**: View PDF in browser
   - ⬇️ **Download**: Save PDF to computer
   - 🗑️ **Delete**: Remove PDF (with confirmation)

### Empty State

When no PDFs are uploaded yet, you'll see:
```
📄 [PDF Icon]
No PDF files uploaded yet
```

### Loading State

While fetching PDFs, you'll see:
```
⏳ [Loading Spinner]
```

---

## ⚠️ Error Messages & Solutions

### Upload Errors

**Error**: "File type not accepted"
- **Cause**: You tried to upload a non-PDF file
- **Solution**: Only upload `.pdf` files

**Error**: "File is too large"
- **Cause**: File exceeds 50MB limit
- **Solution**: Compress PDF or split into smaller files

**Error**: "Failed to upload PDF"
- **Cause**: Network issue or server error
- **Solution**: 
  1. Check internet connection
  2. Try uploading again
  3. Contact support if issue persists

### Preview Errors

**Error**: PDF doesn't load in preview
- **Cause**: Browser doesn't support PDF preview
- **Solution**: Download the PDF and open in desktop app

### Download Errors

**Error**: "Failed to download PDF"
- **Cause**: Network issue or file not found
- **Solution**:
  1. Check internet connection
  2. Refresh page and try again
  3. Contact support if file is missing

### Delete Errors

**Error**: "Failed to delete PDF"
- **Cause**: Network issue or permission denied
- **Solution**:
  1. Check internet connection
  2. Ensure you own the PDF
  3. Refresh page and try again

---

## 💡 Tips & Best Practices

### Uploading
- ✅ **Name files clearly**: Use descriptive filenames before uploading
- ✅ **Organize by paper**: Upload all related PDFs to the same paper
- ✅ **Check file size**: Compress large PDFs before uploading
- ✅ **Upload multiple**: Drag multiple PDFs at once to save time
- ✅ **Wait for completion**: Let uploads finish before closing browser

### Organizing
- ✅ **One paper, multiple PDFs**: Upload main paper + supplementary materials
- ✅ **Delete outdated versions**: Remove old versions when uploading new ones
- ✅ **Use consistent naming**: E.g., "Smith_2024_Main.pdf", "Smith_2024_Supplement.pdf"

### Performance
- ✅ **Stable internet**: Use reliable connection for large uploads
- ✅ **Close uploader**: Close uploader when not in use (saves screen space)
- ✅ **Modern browser**: Use latest Chrome, Firefox, or Edge for best experience

---

## 🎓 Common Workflows

### Workflow 1: Upload Paper PDF
```
1. Add new paper to database (Papers page)
2. Click paper to open detail page
3. Click "Upload PDF" button
4. Drag paper PDF onto upload zone
5. Wait for green checkmark
6. Uploader closes automatically
7. PDF appears in list
```

### Workflow 2: Replace PDF
```
1. Open paper with outdated PDF
2. Download old PDF (for backup)
3. Click delete icon on old PDF
4. Confirm deletion
5. Click "Upload PDF" button
6. Upload new PDF version
7. Verify new PDF uploaded correctly
```

### Workflow 3: Read and Annotate
```
1. Open paper detail page
2. Click preview icon on PDF
3. Read PDF in preview modal
4. Take notes separately (Notes feature)
5. Download PDF for offline annotation
6. Upload annotated version if needed
```

### Workflow 4: Share Paper
```
1. Open paper detail page
2. Click download icon on PDF
3. Send downloaded PDF to colleague
4. Colleague can upload to their own account
```

---

## 🔒 Privacy & Security

### Your Data
- ✅ **Private**: Only you can see your uploaded PDFs
- ✅ **Secure**: PDFs stored on secure server
- ✅ **JWT Authentication**: All requests require login
- ✅ **Ownership**: Can only delete your own PDFs

### Best Practices
- ✅ **Don't share credentials**: Keep your login secure
- ✅ **Copyright compliance**: Only upload papers you have rights to
- ✅ **Sensitive data**: Be cautious with proprietary research
- ✅ **Logout after use**: On shared computers, always logout

---

## 🆘 Troubleshooting

### Issue: Upload button doesn't appear
- **Check**: Are you logged in?
- **Check**: Are you on a paper detail page?
- **Solution**: Login and navigate to a specific paper

### Issue: Upload zone doesn't highlight
- **Check**: Are you dragging a PDF file?
- **Check**: Is the file smaller than 50MB?
- **Solution**: Ensure file meets requirements

### Issue: Preview shows blank page
- **Check**: Is your browser up to date?
- **Check**: Does browser support PDF preview?
- **Solution**: Update browser or download PDF instead

### Issue: Download doesn't start
- **Check**: Are browser downloads blocked?
- **Check**: Is download folder accessible?
- **Solution**: Check browser settings, unblock downloads

### Issue: Can't delete PDF
- **Check**: Did you upload this PDF?
- **Check**: Are you logged in as correct user?
- **Solution**: Only owners can delete PDFs

---

## 📱 Mobile Usage

### Mobile-Friendly Features
- ✅ Responsive design adapts to screen size
- ✅ Touch-friendly buttons
- ✅ Drag-drop may not work (use click to browse)
- ✅ Preview works in most mobile browsers

### Mobile Limitations
- ⚠️ Drag-drop may not be supported
- ⚠️ Preview may open in external PDF app
- ⚠️ Large uploads may timeout on slow connections
- ⚠️ Smaller screen makes preview less useful

### Mobile Recommendations
- ✅ Use "click to browse" instead of drag-drop
- ✅ Download PDFs for offline reading
- ✅ Use WiFi for large uploads
- ✅ Use desktop for best experience

---

## ❓ FAQ

**Q: How many PDFs can I upload per paper?**
A: Unlimited (subject to storage quota if implemented)

**Q: Can I upload the same PDF to multiple papers?**
A: Yes, upload independently to each paper

**Q: What if my PDF is larger than 50MB?**
A: Compress using online tools or split into parts

**Q: Can I edit PDFs after uploading?**
A: No, download, edit, then upload new version

**Q: Can I share PDFs with other users?**
A: No, each user manages their own PDFs

**Q: What happens if I delete a paper?**
A: Associated PDFs should be deleted (check backend logic)

**Q: Can I rename PDFs after uploading?**
A: No, upload with desired filename initially

**Q: Are PDFs backed up?**
A: Check with system administrator

---

## 📞 Support

If you encounter issues not covered in this guide:
1. Refresh the page and try again
2. Clear browser cache and cookies
3. Try a different browser
4. Check internet connection
5. Contact your system administrator

---

**Last Updated**: 2025-10-04  
**Version**: 1.0  
**Status**: Production Ready ✅
