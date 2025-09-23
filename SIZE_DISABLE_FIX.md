# ✅ Size Selection Disabled for Lanyard and Tela Categories

## 🎯 **What I Implemented:**

### **1. Add Product Form** (`/admin/products/add-product/add-product-form.js`)
- **Added:** `isSizeDisabled()` function to check if category is "lanyard" or "tela"
- **Updated:** Size section UI to be disabled when category is lanyard/tela
- **Modified:** Form submission to exclude sizes data when disabled
- **Added:** Visual feedback showing "Sizes are not available for this category"

### **2. Edit Product Form** (`/admin/products/edit/[id]/page.js`)
- **Added:** `isSizeDisabled()` function to check if category is "lanyard" or "tela"
- **Updated:** Size field UI to be disabled when category is lanyard/tela
- **Modified:** Update submission to exclude size data when disabled
- **Added:** Visual feedback showing "Sizes not available for this category"

## 🔧 **Key Features:**

### **Smart Category Detection:**
```javascript
const isSizeDisabled = () => {
  if (!categoryId) return false;
  const selectedCategory = categories.find(c => c.id === Number(categoryId));
  if (!selectedCategory) return false;
  
  const categoryName = selectedCategory.name.toLowerCase();
  return categoryName === 'lanyard' || categoryName === 'tela';
};
```

### **Dynamic UI Behavior:**
- **When category is "lanyard" or "tela":**
  - Size section becomes grayed out (`opacity-50 pointer-events-none`)
  - Shows message: "Sizes are not available for this category"
  - Add Size button is hidden
  - Size data is not included in form submission

- **When category is anything else:**
  - Size section works normally
  - All size controls are available
  - Size data is included in form submission

### **Form Submission Logic:**
```javascript
// Only include sizes if not disabled
let sizesData = [];
if (!isSizeDisabled()) {
  sizesData = sizes.filter(sizeItem => 
    sizeItem.size && sizeItem.stock && Number(sizeItem.stock) >= 0
  ).map(sizeItem => ({
    size: sizeItem.size,
    stock: Number(sizeItem.stock),
    price: sizeItem.price ? Number(sizeItem.price) : Number(price)
  }));
}
```

## 📋 **Pages Updated:**

- ✅ **Add Product Form** - Size section disabled for lanyard/tela
- ✅ **Edit Product Form** - Size field disabled for lanyard/tela

## 🎨 **Visual Changes:**

### **Add Product Form:**
- Size section becomes grayed out when lanyard/tela is selected
- Shows informative message instead of size controls
- Add Size button disappears

### **Edit Product Form:**
- Size dropdown becomes disabled and grayed out
- Shows "Sizes not available for this category" message
- Maintains consistent styling with disabled state

## 🚀 **Expected Behavior:**

1. **Select "Lanyard" or "Tela" category:**
   - Size section becomes disabled
   - Visual feedback shows sizes are not available
   - Form submission excludes size data

2. **Select any other category:**
   - Size section works normally
   - All size controls are available
   - Form submission includes size data

**The size selection is now properly disabled for lanyard and tela categories in both add and edit product forms!** 🎯✨
