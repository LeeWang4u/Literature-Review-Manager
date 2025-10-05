# Note Management - User Guide

## 📖 How to Use Note Management

This guide explains how to create, view, edit, and manage notes for your research papers.

---

## 🎯 Overview

The Note Management feature allows you to:
- Create detailed notes about research papers
- Reference specific pages and highlighted text
- Search through all your notes
- Edit and update notes as your understanding evolves
- Delete notes you no longer need
- Organize insights by paper

---

## 📝 Creating Notes

### Method 1: From Paper Detail Page

1. **Open Paper**: Navigate to any paper detail page
2. **Find Notes Section**: Scroll down to the "Notes" section
3. **Click Button**: Click "Add Your First Note" (or "View All N Notes")
4. **On Notes Page**: Click the blue "Add Note" button
5. **Fill Form**:
   - **Title** (required): Short, descriptive title (e.g., "Key Methodology", "Research Gap")
   - **Content** (required): Your detailed note (min 10 characters)
   - **Highlighted Text** (optional): Copy text from the paper you want to reference
   - **Page Number** (optional): Reference page (e.g., 15)
6. **Submit**: Click "Create Note"
7. **Success**: Note appears in the grid

### Method 2: Direct Access

1. Navigate directly to `/papers/:paperId/notes`
2. Click "Add Note" button
3. Follow steps 5-7 above

### Example Note
```
Title: "Interesting Use of Machine Learning"

Content: "The authors use a novel approach to feature engineering 
that reduces dimensionality by 40% while maintaining 95% accuracy. 
This could be applicable to our current project on customer 
segmentation."

Highlighted Text: "We propose a hybrid feature selection method 
combining filter and wrapper approaches..."

Page Number: 8
```

---

## 👀 Viewing Notes

### Notes Grid
- **Layout**: Responsive grid (1/2/3 columns based on screen size)
- **Card Content**:
  - 📄 Note icon + Title
  - Content preview (first 200 characters)
  - Highlighted text (if provided) with yellow background
  - Page number chip badge (if provided)
  - Created and Updated timestamps
  - Edit and Delete action buttons

### From Paper Detail Page
1. Open any paper
2. Scroll to "Notes" section
3. See note count badge (e.g., "5 notes")
4. Click "View All N Notes" button
5. Navigate to NotesPage with all notes for that paper

### Note Count Badge
- Shows total number of notes for the paper
- Updates in real-time as you add/delete notes
- Displayed in both PaperDetailPage and NotesPage header

---

## 🔍 Searching Notes

### Search Functionality
1. **Find Search Bar**: Top of NotesPage in action bar
2. **Type Query**: Enter any keyword or phrase
3. **Instant Results**: Notes filter as you type
4. **Search Scope**: Searches in:
   - Note titles
   - Note content
   - Highlighted text
5. **Clear Search**: Delete text or click X to show all notes

### Search Tips
- Search is **case-insensitive** ("machine learning" = "Machine Learning")
- Searches **all fields** simultaneously
- Partial matches work ("mach" finds "machine learning")
- Use specific keywords for better results

### Example Searches
- "methodology" → Finds all notes about methodology
- "page 15" → Finds notes referencing page 15
- "research gap" → Finds notes about research gaps

---

## ✏️ Editing Notes

### Edit Workflow
1. **Find Note**: Locate the note in the grid
2. **Click Edit Icon**: Click the blue pencil icon
3. **Dialog Opens**: Form pre-filled with existing values
4. **Modify Fields**: Change any field you want
5. **Save Changes**: Click "Update Note"
6. **Dialog Closes**: Note updates in grid
7. **Success Toast**: "Note updated successfully!"

### What You Can Edit
- ✅ Title
- ✅ Content
- ✅ Highlighted Text
- ✅ Page Number

### Edit Tips
- All validation rules still apply
- Updated timestamp changes automatically
- Can't change which paper the note belongs to
- Can clear optional fields (highlighted text, page number)

---

## 🗑️ Deleting Notes

### Delete Workflow
1. **Find Note**: Locate the note you want to delete
2. **Click Delete Icon**: Click the red trash icon
3. **Confirm**: Confirmation dialog appears
   > "Are you sure you want to delete this note? This action cannot be undone."
4. **Choose**:
   - Click **OK** to delete permanently
   - Click **Cancel** to keep the note
5. **Success**: Note removed from grid
6. **Toast Notification**: "Note deleted successfully!"

### Important Notes
- ⚠️ **Deletion is permanent** - cannot be undone
- ⚠️ **Confirmation required** - prevents accidents
- ✅ Note count updates automatically
- ✅ Search results update if note was in filtered view

---

## 📋 Understanding Note Cards

### Card Layout
```
┌─────────────────────────────────────┐
│ 📄 [Note Title]                     │
│                                     │
│ [Content preview...]                │
│                                     │
│ Highlighted:                        │
│ "[Highlighted text...]"             │
│                                     │
│ [Page 15]                          │
│                                     │
│ Created: Jan 15, 2024, 10:30 AM    │
│ Updated: Jan 16, 2024, 2:45 PM     │
│                                     │
│                    [Edit] [Delete]  │
└─────────────────────────────────────┘
```

### Card Elements

**1. Title** (with 📄 icon)
- Bold, prominent text
- Your descriptive note title

**2. Content Preview**
- First 200 characters of your note
- "..." indicates truncation
- Click Edit to see full content

**3. Highlighted Text** (if provided)
- Yellow background for visibility
- Truncated to 100 characters in card
- Full text visible in edit dialog

**4. Page Number** (if provided)
- Blue chip badge
- Format: "Page N"
- Helps locate information quickly

**5. Timestamps**
- Created: When note was first created
- Updated: When note was last modified (only shows if different from created)
- Format: "Month Day, Year, HH:MM AM/PM"

**6. Action Buttons**
- **Edit** (blue pencil): Open edit dialog
- **Delete** (red trash): Delete with confirmation

---

## 🎯 Best Practices

### Note Taking Tips
✅ **Use Descriptive Titles**: "Key Finding on p.8" not just "Note 1"
✅ **Be Specific**: Include context so you understand it later
✅ **Reference Pages**: Always include page numbers when possible
✅ **Quote Accurately**: Copy highlighted text exactly from paper
✅ **Update Notes**: Edit notes as your understanding evolves
✅ **One Idea Per Note**: Keep notes focused on single concepts

### Organization Strategies
✅ **Categorize by Type**: 
   - "Methodology - [description]"
   - "Results - [description]"
   - "Gap - [description]"
   - "Question - [description]"

✅ **Use Keywords**: Include searchable terms in title/content
✅ **Link to PDFs**: Reference specific pages where you found info
✅ **Regular Review**: Periodically review and update notes

### Example Note Structure
```
Title: "Methodology - Hybrid Feature Selection Approach"

Content: "The paper introduces a two-stage feature selection:
1. Filter stage: Remove low-variance features (40% reduction)
2. Wrapper stage: Use genetic algorithm for final selection
Result: 95% accuracy with 60% fewer features.
Could apply this to our customer segmentation project."

Highlighted Text: "We propose a hybrid feature selection method 
combining filter and wrapper approaches to achieve both 
computational efficiency and high accuracy."

Page Number: 8
```

---

## 💡 Common Workflows

### Workflow 1: Reading and Annotating
```
1. Open paper PDF
2. Read section
3. Find important quote
4. Copy quote text
5. Create new note
6. Paste quote in "Highlighted Text"
7. Add your thoughts in "Content"
8. Note the page number
9. Save note
10. Continue reading
```

### Workflow 2: Reviewing Literature
```
1. Open paper detail page
2. Click "View All Notes"
3. Review existing notes
4. Identify gaps in understanding
5. Add new notes for clarifications
6. Update existing notes with new insights
7. Delete outdated notes
```

### Workflow 3: Writing Paper
```
1. Search notes for topic (e.g., "methodology")
2. Review filtered results
3. Open relevant notes
4. Copy highlighted text for citations
5. Reference page numbers in your writing
6. Create new notes for synthesis ideas
```

### Workflow 4: Study Group
```
1. Take notes during paper discussion
2. Include questions as notes
3. Add insights from group discussion
4. Update notes with answers found later
5. Share page numbers for discussion points
```

---

## ⚠️ Error Messages & Solutions

### Create/Edit Errors

**Error**: "Title is required"
- **Cause**: Left title field empty
- **Solution**: Enter a title (min 3 characters)

**Error**: "Title must be at least 3 characters"
- **Cause**: Title too short
- **Solution**: Make title more descriptive

**Error**: "Title must not exceed 200 characters"
- **Cause**: Title too long
- **Solution**: Shorten title or move text to content

**Error**: "Content is required"
- **Cause**: Left content field empty
- **Solution**: Write your note content

**Error**: "Content must be at least 10 characters"
- **Cause**: Content too brief
- **Solution**: Add more detail to your note

**Error**: "Highlighted text must not exceed 1000 characters"
- **Cause**: Highlighted text too long
- **Solution**: Shorten quote or split into multiple notes

**Error**: "Page number must be at least 1"
- **Cause**: Entered 0 or negative number
- **Solution**: Enter valid page number (1 or higher)

**Error**: "Page number must not exceed 10000"
- **Cause**: Unrealistic page number
- **Solution**: Check page number and correct

### Network Errors

**Error**: "Failed to create note"
- **Cause**: Network issue or server error
- **Solution**: 
  1. Check internet connection
  2. Try again
  3. Contact support if persists

**Error**: "Failed to load notes"
- **Cause**: Server unreachable
- **Solution**:
  1. Refresh page
  2. Check connection
  3. Try again later

---

## 🎨 Interface Features

### Empty State (No Notes)
When you haven't created any notes yet:
```
┌─────────────────────────────────────┐
│                                     │
│        No notes yet                 │
│                                     │
│  Start taking notes about this      │
│  paper to keep track of important   │
│  insights, questions, and           │
│  observations.                      │
│                                     │
│    [Create Your First Note]         │
│                                     │
└─────────────────────────────────────┘
```

### Search Empty State
When search finds no matches:
```
┌─────────────────────────────────────┐
│                                     │
│  No notes found matching your       │
│  search                             │
│                                     │
│  Try a different search term        │
│                                     │
└─────────────────────────────────────┘
```

### Loading State
While fetching notes:
```
┌─────────────────────────────────────┐
│                                     │
│          ⏳ [Spinner]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 📱 Mobile Usage

### Mobile-Friendly Features
- ✅ Responsive grid (1 column on mobile)
- ✅ Touch-friendly buttons
- ✅ Swipe-friendly cards
- ✅ Full-width form fields
- ✅ Large tap targets

### Mobile Tips
- Use portrait orientation for best experience
- Tap and hold for context (tooltips)
- Use search to quickly find notes
- Longer content may require scrolling in edit dialog

---

## 🔐 Privacy & Security

### Your Notes
- ✅ **Private**: Only you can see your notes
- ✅ **Secure**: Stored on secure server with authentication
- ✅ **Isolated**: Notes separated by user and paper
- ✅ **Protected**: Requires login to access

### Best Practices
- ✅ Don't share credentials
- ✅ Logout on shared computers
- ✅ Be cautious with sensitive information
- ✅ Keep notes professional and appropriate

---

## ❓ FAQ

**Q: How many notes can I create per paper?**
A: Unlimited (subject to reasonable usage)

**Q: Can I see notes from other papers?**
A: No, notes are filtered by paper automatically

**Q: Can I move a note to a different paper?**
A: No, notes are permanently tied to one paper

**Q: Can I export my notes?**
A: Not yet (coming in future update)

**Q: Can I add images to notes?**
A: Not yet (text only for now)

**Q: Can I share notes with collaborators?**
A: Not yet (notes are private to your account)

**Q: Are notes backed up?**
A: Check with your system administrator

**Q: Can I recover deleted notes?**
A: No, deletion is permanent

**Q: Can I sort notes?**
A: Currently sorted by creation date (newest first)

**Q: Do notes sync across devices?**
A: Yes, stored on server so accessible from any device

---

## 🆘 Troubleshooting

### Issue: Notes not loading
**Solution**: 
1. Refresh page
2. Check internet connection
3. Verify you're logged in
4. Try different browser

### Issue: Can't create note
**Solution**:
1. Check all required fields filled
2. Verify field validation rules
3. Check internet connection
4. Try again

### Issue: Search not working
**Solution**:
1. Clear search and try again
2. Check spelling
3. Try broader search terms
4. Refresh page

### Issue: Can't edit note
**Solution**:
1. Verify you own the note
2. Check internet connection
3. Refresh page and try again

### Issue: Delete doesn't work
**Solution**:
1. Confirm deletion in dialog
2. Check internet connection
3. Verify you own the note
4. Refresh and try again

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
