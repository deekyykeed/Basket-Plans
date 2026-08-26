# 📝 How to Add Your SVG Icons

Your app now uses **inline SVG code** instead of separate SVG files. This makes it easier to paste and manage your icons!

## 🎯 Quick Start

### Step 1: Get Your SVG Code

You already have your SVG! Like this shopping bag example:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" height="24" width="24">
  <path d="M6.331 8H17.67a2 2 0 0 1 1.977 2.304l-1.255 8.152A3 3 0 0 1 15.426 21H8.574a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152A2 2 0 0 1 6.331 8z" stroke-width="2"></path>
  <path d="M9 11V6a3 3 0 0 1 6 0v5" stroke-width="2"></path>
</svg>
```

### Step 2: Convert to React Native SVG

Open `/lib/icons.js` and replace the placeholder icon code.

**Example - Grocery Icon (Already Done!):**
```javascript
export const GroceryIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="M6.331 8H17.67a2 2 0 0 1 1.977 2.304l-1.255 8.152A3 3 0 0 1 15.426 21H8.574a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152A2 2 0 0 1 6.331 8z" strokeWidth="2" />
    <Path d="M9 11V6a3 3 0 0 1 6 0v5" strokeWidth="2" />
  </Svg>
);
```

## 🔄 Conversion Rules

When converting your SVG code to React Native:

### 1. Change Tag Names (Capital Case)
- `<svg>` → `<Svg>`
- `<path>` → `<Path>`
- `<circle>` → `<Circle>`
- `<rect>` → `<Rect>`
- `<line>` → `<Line>`
- `<g>` → `<G>`

### 2. Convert Attributes (camelCase)
- `stroke-width` → `strokeWidth`
- `stroke-linecap` → `strokeLinecap`
- `stroke-linejoin` → `strokeLinejoin`
- `fill-opacity` → `fillOpacity`

### 3. Remove Fixed Sizes
- Remove `height="24"` and `width="24"` from `<svg>` tag
- Keep `viewBox` attribute
- Add `{...props}` to pass dynamic width/height

### 4. Self-Closing Tags
- Change `</path>` to `/>` for single-element paths

## 📦 Icons You Need to Add

Open `/lib/icons.js` and replace these placeholders with your SVG code:

### 1. ✅ Grocery Icon - **DONE!**
Already has the shopping bag icon you provided.

### 2. 🍴 Restaurant Icon
Find line 15-20, replace with your restaurant/fork SVG:
```javascript
export const RestaurantIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* REPLACE THIS LINE with your restaurant icon Path */}
    <Path d="YOUR_RESTAURANT_PATH_HERE" strokeWidth="2" />
  </Svg>
);
```

### 3. 🍷 Alcohol Icon
Find line 22-27, replace with your wine/alcohol SVG

### 4. 🚚 Express Icon
Find line 29-34, replace with your truck/delivery SVG

### 5. 🏪 Retail Icon
Find line 36-41, replace with your store/shop SVG

### 6. 👤 Profile Icon
Find line 44-49, replace with your user/profile SVG (viewBox="0 0 20 20")

### 7. 📋 Orders Icon
Find line 51-56, replace with your clipboard/orders SVG (viewBox="0 0 20 20")

## 💡 Example: Full Conversion

**Original SVG Code:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" height="24" width="24">
  <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
  <path d="M12 6v6l4 2" stroke-width="2"></path>
</svg>
```

**Converted React Native Code:**
```javascript
export const ClockIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Circle cx="12" cy="12" r="10" strokeWidth="2" />
    <Path d="M12 6v6l4 2" strokeWidth="2" />
  </Svg>
);
```

**Changes made:**
- ✅ `<svg>` → `<Svg>`
- ✅ `<circle>` → `<Circle>`
- ✅ `<path>` → `<Path>`
- ✅ `stroke-width` → `strokeWidth`
- ✅ `stroke-linecap` → `strokeLinecap`
- ✅ `stroke-linejoin` → `strokeLinejoin`
- ✅ Removed `height` and `width`
- ✅ Added `{...props}`
- ✅ Self-closing tags `</circle>` → `/>`

## 🎨 Tips for Better Icons

### Color Theming
Use `#000000` for stroke/fill and the app will handle dark mode automatically.

### Stroke Width
Use `strokeWidth="2"` for good visibility at small sizes.

### Clean SVG
Remove these if present:
- `id` attributes
- `<desc>` tags
- `<title>` tags
- Comments
- Unnecessary groups (`<g>`)

## 🚀 After Adding Your Icons

1. Save `/lib/icons.js`
2. The Metro bundler will auto-reload
3. Your icons will appear in the app!

No need to restart or clear cache for inline SVG changes.

## 📱 Testing

Your grocery icon (shopping bag) is already working! You should see it in:
- Category buttons (if Supabase is connected)
- Or as emoji fallback (if not connected)

Add the remaining 6 icons following the same pattern!

## 🆘 Troubleshooting

### Icon not showing / showing emoji
- Check you replaced the placeholder `Path` with your actual SVG path
- Verify all attribute names are camelCase (`strokeWidth`, not `stroke-width`)
- Ensure tags are capitalized (`<Path>`, not `<path>`)

### Syntax errors
- Make sure all tags are self-closing: `<Path ... />`
- Check for missing quotes around attribute values
- Verify commas and brackets match

### Icon looks wrong
- Check `viewBox` matches your design (24x24 for categories, 20x20 for header)
- Verify `strokeWidth` is appropriate (usually 1.5-2)
- Make sure path data (`d` attribute) is complete

---

**Ready?** Open `/lib/icons.js` and start pasting your SVG icons! The grocery icon is already done as an example. 🎉
