# 🎨 Custom SVG Icons Setup Guide

Your app is now configured to use custom SVG icons instead of emojis!

## ✅ What's Been Set Up

1. **Icon folder created**: `/assets/icons/`
2. **SVG support configured**: Metro bundler configured with `react-native-svg-transformer`
3. **Icon loader configured**: Safely loads SVG icons with emoji fallbacks
4. **App.js updated**: Renders SVG components for categories and header
5. **Dependencies installed**: `react-native-svg` and `react-native-svg-transformer`

## 📋 Required Icon Files

Add these 7 SVG files to the `/assets/icons/` folder:

### Category Icons (viewBox="0 0 24 24" recommended)
```
assets/icons/grocery.svg       - Shopping cart icon
assets/icons/restaurant.svg    - Fork/knife or restaurant icon
assets/icons/alcohol.svg        - Wine glass icon
assets/icons/express.svg        - Truck/delivery icon
assets/icons/retail.svg         - Store/shop icon
```

### Header Icons (viewBox="0 0 20 20" recommended)
```
assets/icons/profile.svg        - User/profile icon
assets/icons/orders.svg         - Clipboard/orders icon
```

## 🎯 Quick Start

### Option 1: Use Free Icon Libraries

Download icons from these free resources:

1. **[Feather Icons](https://feathericons.com/)** (Recommended)
   - Clean, simple line icons
   - Download as PNG or SVG
   - Suggested icons:
     - `shopping-cart` → grocery.png
     - `coffee` → restaurant.png
     - `wine` → alcohol.png
     - `truck` → express.png
     - `shopping-bag` → retail.png
     - `user` → profile.png
     - `clipboard` → orders.png

2. **[Heroicons](https://heroicons.com/)**
   - Beautiful outline and solid variants
   - MIT license (free to use)

3. **[Phosphor Icons](https://phosphoricons.com/)**
   - Flexible icon family with 6 weights

### Option 2: Export from Design Tools

If you're using Figma, Sketch, or Adobe XD:

1. Design or find your icons
2. Export each icon as SVG:
   - Frame size: 24x24px (categories) or 20x20px (header)
   - Color: Black (#000000) or use `currentColor` for theme support
   - Format: SVG
   - Settings:
     - Include viewBox
     - Remove unnecessary groups/IDs
     - Outline strokes (convert to paths)
3. Clean up the SVG file (remove metadata)
4. Rename to match required names
5. Place in `/assets/icons/`

## 📦 Installation Steps

### Step 1: Download/Create Icons
Get your 7 icon files ready (see resources above)

### Step 2: Add to Project
```bash
# On your computer, navigate to project folder
cd /path/to/basket-plans

# Place your icon files in assets/icons/
# Copy:
#   grocery.png
#   restaurant.png
#   alcohol.png
#   express.png
#   retail.png
#   profile.png
#   orders.png
```

### Step 3: Verify File Names
Ensure exact names (lowercase, no spaces):
- ✅ `grocery.svg`
- ❌ `Grocery.svg`
- ❌ `shopping-cart.svg`

### Step 4: Restart App with Cache Clear
```bash
# Stop the current server (Ctrl+C)
# IMPORTANT: Clear cache when adding SVG files
npx expo start -c
```

## 🎨 SVG Icon Specifications

### ViewBox Guidelines
- **Category icons**: `viewBox="0 0 24 24"`
- **Header icons**: `viewBox="0 0 20 20"`
- SVGs scale perfectly, so use viewBox instead of fixed width/height

### Design Guidelines for SVG
- **Color**: Use `currentColor` for dynamic theming, or black (#000000)
- **Stroke Width**: 1.5-2px for line icons
- **Style**: Line icons or simple filled shapes
- **ViewBox**: Always include viewBox attribute
- **Clean Code**: Remove unnecessary groups, IDs, metadata
- **Path Only**: Convert text and strokes to paths

### Example SVG Structure
```xml
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
</svg>
```

### Example Export Settings (Figma)
1. Select icon frame (24x24px or 20x20px)
2. Export settings:
   - Format: SVG
   - Include "id" attribute: ❌ (uncheck)
   - Outline strokes: ✓ (check)
3. Download and clean up if needed
4. Rename to match required name

## 🔄 Current Behavior

**Right now (without custom SVG icons):**
- App shows emoji fallbacks (🛒, 🍴, 🍷, etc.)
- Everything works normally
- No crashes or errors

**After adding custom SVG icons:**
- App automatically uses your SVG icons as React components
- Perfect scaling at any size
- Styled with proper containers and spacing
- Consistent look across the app
- Support for theme colors (if using `currentColor`)

## ⚙️ Technical Details

### How SVG Loading Works
1. `metro.config.js` configures Metro bundler to handle SVG files
2. `react-native-svg-transformer` converts SVG files to React components
3. `lib/icons.js` safely loads icons with try/catch
4. `App.js` renders SVG components using `React.createElement`
5. Falls back to emoji if SVG file is missing

### Metro Configuration
The project includes `metro.config.js` with:
- SVG files treated as source files (not assets)
- Babel transformer configured for SVG processing
- Proper resolver configuration

## 🐛 Troubleshooting

### Icons not appearing
**Problem**: Still seeing emojis after adding SVG files

**Solutions**:
1. Check file names match exactly (case-sensitive, must be `.svg`)
2. Ensure files are in `/assets/icons/` folder
3. **CRITICAL**: Clear Metro cache and restart: `npx expo start -c`
4. Verify SVG files are valid (open in browser or code editor)
5. Check `metro.config.js` exists in project root

### Metro bundler errors
**Problem**: Errors about SVG files or transformer

**Solutions**:
1. Verify `react-native-svg-transformer` is installed: `npm list react-native-svg-transformer`
2. Check `metro.config.js` configuration
3. Delete `node_modules/.cache` folder
4. Restart: `npx expo start -c`

### SVG renders but looks wrong
**Problem**: Icon displays but appears broken or incorrectly sized

**Solutions**:
1. Remove fixed `width` and `height` from `<svg>` tag (use viewBox only)
2. Ensure viewBox matches design: `viewBox="0 0 24 24"`
3. Check path data is valid
4. Simplify SVG (remove unnecessary groups, transforms)
5. Use `currentColor` for stroke/fill instead of hard-coded colors

### Icons have wrong color or don't support theming
**Problem**: Icons show wrong colors or don't adapt to theme

**Solutions**:
1. Use `stroke="currentColor"` or `fill="currentColor"` in SVG
2. Remove hard-coded color values from SVG paths
3. App will inject proper theme colors automatically

## 📱 Testing Checklist

After adding icons, verify:
- [ ] All 5 category icons display correctly
- [ ] Both header icons (profile & orders) display correctly
- [ ] Icons have proper spacing and sizing
- [ ] Icons look good in both light and dark mode
- [ ] Icons load quickly without flickering
- [ ] No console errors in terminal

## 🎓 Next Steps

Once icons are working:
1. ✅ Complete Supabase setup (add credentials)
2. ✅ Test data fetching from database
3. ✅ Customize colors and styling
4. 🚀 Add more features!

## 📞 Need Help?

If you're stuck:
1. Check the `/assets/icons/README.md` file
2. Verify icon files are in correct folder
3. Review console for error messages
4. Share error message for troubleshooting

---

**Current Status**: SVG icon infrastructure fully configured! Add your 7 SVG files to `/assets/icons/` and restart with `npx expo start -c`
