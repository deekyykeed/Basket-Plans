# Custom Icons for Basket.W

This folder contains all the custom icons used in the Basket app.

## Required Icon Files

Please add the following SVG icon files to this folder:

### Category Icons (24x24px recommended viewBox)
- **grocery.svg** - Shopping cart/basket icon for Grocery category
- **restaurant.svg** - Fork & knife or restaurant icon for Restaurants category
- **alcohol.svg** - Wine glass or bottle icon for Alcohol category
- **express.svg** - Truck or delivery icon for Express category
- **retail.svg** - Store or shop icon for Retail category

### Header Icons (20x20px recommended viewBox)
- **profile.svg** - User profile or person icon
- **orders.svg** - Clipboard, list, or orders icon

## Icon Specifications

### Format
- **File Type**: SVG (Scalable Vector Graphics)
- **Alternative**: PNG files can also work with minor code changes

### Size Guidelines (SVG viewBox)
- **Category Icons**: viewBox="0 0 24 24" (24x24)
- **Header Icons**: viewBox="0 0 20 20" (20x20)
- SVGs scale perfectly, so exact size doesn't matter as much

### Design Guidelines for SVG
- **Style**: Line icons or simple filled icons work best
- **Color**: Black (#000000) or use `currentColor` for theme support
  - Using `currentColor` allows the app to control icon colors
  - Black works fine as default
- **Stroke Width**: 1.5-2px for line icons
- **ViewBox**: Always include a viewBox attribute
- **Clean SVG**: Remove unnecessary groups, IDs, or styling
- **Single Path**: Combine paths when possible for better performance

## Naming Convention

Keep the exact names as listed above:
- ✅ `grocery.svg`
- ✅ `restaurant.svg`
- ✅ `alcohol.svg`
- ✅ `express.svg`
- ✅ `retail.svg`
- ✅ `profile.svg`
- ✅ `orders.svg`

❌ Do not use:
- Different names (e.g., `shopping-cart.svg`)
- Spaces in names
- Capital letters

## Free Icon Resources

If you need free icons, check out:
- [Feather Icons](https://feathericons.com/) - Simple, beautiful icons
- [Heroicons](https://heroicons.com/) - Beautiful hand-crafted SVG icons
- [Phosphor Icons](https://phosphoricons.com/) - Flexible icon family
- [Iconoir](https://iconoir.com/) - Simple and definitive icon set
- [Lucide](https://lucide.dev/) - Beautiful & consistent icons

## How to Add Icons

1. Download or create your icon files
2. Ensure they match the naming convention above
3. Place them in this folder (`assets/icons/`)
4. Restart your Expo development server
5. The icons will automatically appear in the app

## Current Status

Currently using emoji placeholders. Replace with actual icon files for production.

## SVG Format Details

The app is configured to use SVG icons by default using `react-native-svg-transformer`.

### Example SVG Structure:
```xml
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
</svg>
```

### Key Points:
- Use `viewBox` instead of fixed width/height
- Use `currentColor` for strokes/fills to support theming
- Keep SVG code clean and minimal
- Remove unnecessary metadata from design tools

## Troubleshooting

### Icons not showing
- Check file names match exactly (case-sensitive, must be `.svg`)
- Ensure files are valid SVG format
- Restart Metro bundler: `npx expo start -c` (with cache clear)
- Check SVG has proper `viewBox` attribute
- Verify SVG xmlns is correct: `xmlns="http://www.w3.org/2000/svg"`

### Icons not rendering correctly
- Remove any `width` or `height` attributes from `<svg>` tag (use viewBox only)
- Simplify the SVG (remove unnecessary groups, transforms)
- Use `currentColor` instead of hard-coded colors
- Check for valid path data

### Metro bundler errors
- Make sure `metro.config.js` exists in project root
- Verify `react-native-svg` and `react-native-svg-transformer` are installed
- Clear cache and restart: `npx expo start -c`

### SVG displays but looks wrong
- Check viewBox dimensions match your design
- Ensure stroke-width is appropriate (1.5-2px works well)
- Use `stroke="currentColor"` or `fill="currentColor"` for dynamic theming
