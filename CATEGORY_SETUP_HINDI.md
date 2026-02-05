# Category aur Subcategory System - Setup Guide

## Kya Kiya Gaya Hai

### 1. Database Tables
- **subcategory_configs** table banaya gaya hai
- Categories aur subcategories ke liye data insert kiya gaya hai
# up
### 2. Add Product Modal
- Category select karne ke baad subcategory field show hota hai
- Do tabs hain:
  - **Select Tab**: Database se subcategories select kar sakte hain
  - **Custom Tab**: Khud ka subcategory naam likh sakte hain

### 3. Category Management Page
- Admin Settings mein category aur subcategory manage kar sakte hain
- Add aur Edit dono kar sakte hain (Delete nahi hai jaise aapne bola)

## Setup Kaise Karein

### Step 1: SQL Queries Run Karein
1. Supabase dashboard mein jaayein
2. SQL Editor open karein
3. `SQL_QUERIES.sql` file ki saari queries copy karein
4. Run karein

Ye queries:
- `subcategory_configs` table banayengi
- 6 main categories insert karengi
- Har category ke subcategories insert karengi

### Step 2: Categories Structure

#### CONTAINERS & CLOSURES
- PUSH DOWN & TURN
- THUMB – CLICK
- LIQUID BOTTLES
- OINTMENT JARS

#### RX LABELS
- DIRECT THERMAL RX LABELS
- LASER LABELS

#### COMPLIANCE PACKAGING
- HEAT SEAL CARDS – SINGLE DOSE
- COLD SEAL CARDS – SINGLE DOSE
- BLISTERS – SINGLE DOSE
- COLD SEAL LABELS – MULTI DOSE
- BLISTERS – MULTI DOSE
- COLD SEAL BLISTER & CARDS COMBO – MULTI DOSE

#### RX PAPER BAGS
- FLAT BOTTOM STOCK RX BAGS
- SQUARE BOTTOM STOCK RX BAGS

#### ORAL SYRINGES & ACCESSORIES
- ORAL SYRINGES
- FITMENTS & ADAPTERS

#### OTHER SUPPLY
- MEDICINE SHIPPING SUPPLY
- CORRUGATED BOXES

## Kaise Use Karein

### Product Add Karte Waqt
1. **Category** select karein
2. **Subcategory** field mein:
   - **Select tab** se predefined subcategory choose karein
   - Ya **Custom tab** se apna subcategory naam type karein
3. Baaki details bharein aur save karein

### Category/Subcategory Manage Karne Ke Liye
1. Admin Settings page par jaayein
2. Neeche "Category & Subcategory Management" section milega
3. Yahaan se:
   - Naya category add kar sakte hain
   - Category edit kar sakte hain
   - Naya subcategory add kar sakte hain
   - Subcategory edit kar sakte hain

## Important Files

1. **SQL_QUERIES.sql** - Database setup queries
2. **src/components/products/form-sections/BasicInfoSection.tsx** - Product form with category/subcategory
3. **src/components/admin/CategoryManagement.tsx** - Category management component
4. **src/pages/admin/Settings.tsx** - Settings page with category management
5. **CATEGORY_SUBCATEGORY_GUIDE.md** - Detailed English guide

## Notes
- Subcategory optional hai (zaruri nahi)
- Category select karne ke baad hi subcategory field enable hoga
- Custom subcategory database mein save nahi hoti, sirf product ke saath save hoti hai
- Delete functionality nahi hai jaise aapne request kiya tha
