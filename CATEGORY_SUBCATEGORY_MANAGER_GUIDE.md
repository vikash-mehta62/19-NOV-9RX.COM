# Category & Subcategory Manager - Complete Guide

## 🎯 Overview
Ek complete management system jo category aur subcategory ko manage karta hai with tabs.

## ✨ Features

### 📑 Tab-Based Interface
- **Category Tab**: Categories add aur edit karein
- **Subcategory Tab**: Subcategories add aur edit karein

### 🏷️ Category Management

#### Add Category
1. "Manage Categories" button click karein
2. "Categories" tab select karein
3. Form mein details bharein:
   - **Category Name**: e.g., "CONTAINERS & CLOSURES"
   - **Size Units**: Multiple units select karein (checkboxes)
   - **Custom Units**: Apne custom units add karein
   - **Default Unit**: Selected units mein se ek choose karein
   - **Configuration**: Has Rolls aur Requires Case options

#### Edit Category
1. Categories list mein hover karein
2. Edit icon (pencil) click karein
3. Form mein changes karein
4. "Update Category" click karein

### 📂 Subcategory Management

#### Add Subcategory
1. "Manage Categories" button click karein
2. "Subcategories" tab select karein
3. Category select karein dropdown se
4. Subcategory name enter karein
5. "Add Subcategory" click karein

#### Edit Subcategory
1. Category select karein
2. Subcategory list mein hover karein
3. Edit icon click karein
4. Name change karein
5. "Update Subcategory" click karein

## 🎨 UI Features

### Category Tab
- **Left Side**: Add/Edit form
  - Category name input
  - Size units selection (scrollable grid)
  - Custom unit input
  - Default unit dropdown
  - Configuration checkboxes
  - Add/Update button

- **Right Side**: Categories list
  - All categories display
  - Hover to show edit button
  - Shows units for each category

### Subcategory Tab
- **Left Side**: Add/Edit form
  - Category dropdown
  - Subcategory name input
  - Add/Update button

- **Right Side**: Subcategories list
  - Filtered by selected category
  - Hover to show edit button
  - Empty state when no category selected

## 🎨 Design Highlights

### Colors
- **Purple Theme**: Categories (Purple-600)
- **Green Theme**: Subcategories (Green-600)
- **Gradient Header**: Purple to Indigo

### Interactive Elements
- ✅ Hover effects on list items
- ✅ Edit button appears on hover
- ✅ Smooth transitions
- ✅ Loading states
- ✅ Success/Error toasts
- ✅ Form validation

### Layout
- **Responsive**: 2-column on desktop, 1-column on mobile
- **Scrollable**: Lists have max height with scroll
- **Cards**: Clean card-based design
- **Badges**: Selected units shown as badges

## 🔧 Technical Details

### Component Location
```
src/components/products/form-sections/CategorySubcategoryManager.tsx
```

### Usage in BasicInfoSection
```tsx
<CategorySubcategoryManager
  open={openDialog}
  onOpenChange={setOpenDialog}
  onSuccess={() => {
    // Refresh categories after changes
    window.location.reload();
  }}
/>
```

### Database Tables Used
1. **category_configs**
   - id, category_name, size_units, default_unit, has_rolls, requires_case

2. **subcategory_configs**
   - id, category_name, subcategory_name

### State Management
- Categories fetched from database
- Subcategories filtered by selected category
- Form states for add/edit modes
- Loading states for async operations

## 📋 Workflow

### Adding a Category
1. Click "Manage Categories" in Add Product modal
2. Stay on "Categories" tab (default)
3. Enter category name
4. Select size units (multiple)
5. Add custom units if needed
6. Select default unit
7. Configure options (Has Rolls, Requires Case)
8. Click "Add Category"
9. Category appears in right side list

### Adding a Subcategory
1. Click "Manage Categories" in Add Product modal
2. Switch to "Subcategories" tab
3. Select a category from dropdown
4. Enter subcategory name
5. Click "Add Subcategory"
6. Subcategory appears in right side list

### Editing
1. Hover over any item in the list
2. Click the pencil icon
3. Form populates with current data
4. Make changes
5. Click "Update" button
6. Changes saved and list refreshes

## 🎯 Benefits

### For Users
- ✅ Easy to use interface
- ✅ Clear visual separation (tabs)
- ✅ Instant feedback (toasts)
- ✅ No page refresh needed
- ✅ Edit in place

### For Developers
- ✅ Clean component structure
- ✅ Reusable code
- ✅ Type-safe with TypeScript
- ✅ Proper error handling
- ✅ Loading states

## 🚀 Future Enhancements (Optional)
- [ ] Delete functionality
- [ ] Bulk operations
- [ ] Search/Filter
- [ ] Drag & drop reordering
- [ ] Import/Export
- [ ] Category icons

## 📝 Notes
- Delete functionality intentionally not included (as per requirement)
- Page refreshes after changes to update global category list
- All operations are validated before submission
- Custom units are saved with the category
- Subcategories are linked to categories via category_name
