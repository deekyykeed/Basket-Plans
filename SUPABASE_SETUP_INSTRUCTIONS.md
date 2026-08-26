# 🚀 Supabase Setup Instructions for Basket Plans

## Step 1: Get Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a new account
3. Create a new project (or select an existing one)
4. Once the project is ready, go to **Settings** (gear icon) → **API**
5. Copy these two values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 2: Update Your Supabase Configuration

1. Open `/lib/supabase.js`
2. Replace the placeholder values with your actual credentials:

```javascript
const SUPABASE_URL = 'https://your-actual-project.supabase.co';  // ← Paste your URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← Paste your key here
```

**Important:** Keep the quotes ('') around the values!

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase-setup.sql` in this project
4. Copy ALL the SQL code from that file
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Wait for "Success. No rows returned" message

## Step 4: Verify the Setup

### Check Tables Were Created:
1. Go to **Table Editor** in Supabase dashboard
2. You should see two tables:
   - ✅ `categories` (5 rows)
   - ✅ `products` (6 rows)

### Test a Query:
In the SQL Editor, run:
```sql
SELECT * FROM categories;
```
You should see: Grocery, Restaurants, Alcohol, Express, Retail

```sql
SELECT * FROM products WHERE featured = true;
```
You should see 6 products: Banana, Orange, Grapes, Lettuce, Bread, Apple

## Step 5: (Optional) Set Up Storage for Product Images

If you want to upload your own product images:

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Name it: `product-images`
4. Make it **Public bucket** (check the box)
5. Click **Create bucket**

### Upload Images:
1. Click on the `product-images` bucket
2. Click **Upload files**
3. Upload your product images (PNG, JPG, WebP)
4. Copy the public URL of each image
5. Update product image URLs in the database

## Step 6: Test in Your App

Once everything is set up:

```bash
# Make sure dependencies are installed
npm install

# Start the development server
npx expo start
```

The app will now fetch real data from Supabase instead of using mock data!

---

## 📊 Database Schema Overview

### Categories Table
- `id` - UUID (Primary Key)
- `name` - Category name (e.g., "Grocery")
- `icon` - Emoji icon (e.g., "🛒")
- `slug` - URL-friendly name (e.g., "grocery")
- `display_order` - Order to display categories
- `is_active` - Show/hide category
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

### Products Table
- `id` - UUID (Primary Key)
- `name` - Product name (e.g., "Banana")
- `description` - Product description
- `price` - Product price (decimal)
- `quantity_label` - Display label (e.g., "x5", "Bunch of 5")
- `image_url` - Product image URL
- `category_id` - Foreign key to categories
- `stock_quantity` - Available stock
- `is_available` - In stock or not
- `featured` - Show in "Fresh Finds"
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

---

## 🔒 Security (Row Level Security)

Both tables have RLS enabled with public read access:
- Anyone can **read** categories and products
- Only authenticated users (when you add auth) can **modify** data

---

## 🆘 Troubleshooting

### Error: "Invalid URL"
- Make sure your URL starts with `https://` and ends with `.supabase.co`
- Check that you wrapped it in quotes ('')

### Error: "Invalid API Key"
- Make sure you copied the **anon key**, not the service_role key
- Check that you wrapped it in quotes ('')
- The key should start with `eyJ`

### No Data Showing in App
- Verify tables exist in Table Editor
- Check that products have `is_available = true` and `featured = true`
- Look at console/terminal for error messages

### Images Not Loading
- Make sure image URLs are publicly accessible
- Test image URLs in a browser first
- Consider using Supabase Storage (Step 5)

---

## 📝 Next Steps After Setup

1. Test the app with real Supabase data
2. Add more products through the Supabase dashboard
3. Set up user authentication
4. Add shopping cart functionality
5. Implement product search and filtering

---

Need help? Check the Supabase documentation: https://supabase.com/docs
