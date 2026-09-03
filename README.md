# Basket Plans

A subscription-based grocery delivery marketplace built with React Native and Expo.

## Business Model

### Subscription Service
- **Monthly subscription fee** - Customers pay a recurring monthly charge
- **Weekly deliveries** - Products are delivered every Friday (or configurable delivery day)
- **Recurring orders** - Users select products that are automatically included in their weekly delivery

### Product Categories
- 🛒 Grocery - Fresh produce, pantry items
- 🍴 Restaurants - Prepared meals and restaurant items
- 🍷 Alcohol - Wine, beer, spirits
- 🚚 Express - Quick delivery items
- 🏪 Retail - General merchandise

## User Experience

### Product Interaction
1. **Tap to Add** - Single tap on any product immediately adds it to the basket
2. **Long Press for Details** - Press and hold to view detailed product information
3. **Multi-option Products** - Products with variants automatically show a bottom sheet with options

### The Basket Component
The basket is a floating horizontal bar at the bottom of the screen that:
- Shows all selected products in real-time
- Scrolls horizontally to display multiple items
- Floats 14px from the bottom and sides of the screen
- Provides visual feedback as products are added

### Haptic Feedback
- Products provide haptic feedback when tapped
- Confirms successful addition to basket
- Enhances the tactile shopping experience

## App Structure

### Single-Screen Marketplace
- **No tab bar** - All functionality on one screen
- **No header bar** - Clean, distraction-free interface
- **Floating basket** - Always visible at bottom
- **Scrollable content** - Product grid scrolls behind floating basket

### Technical Stack
- **Framework**: React Native 0.81.5 + Expo 54
- **UI**: React 19.1.0
- **Database**: Supabase (PostgreSQL)
- **Icons**: Hugeicons (4,400+ free icons)
- **Fonts**: FamiljenGrotesk (custom typography)

## Features

### Current Implementation
✅ Single-screen marketplace layout
✅ Category navigation (Grocery, Restaurants, Alcohol, Express, Retail)
✅ Product grid with images and prices
✅ Search functionality
✅ Floating basket component
✅ Horizontal scrolling basket
✅ Supabase data integration
✅ Custom fonts and icons
✅ Light/dark theme support

### Upcoming Features
🔜 Tap to add product functionality
🔜 Haptic feedback on tap
🔜 Long-press product details bottom sheet
🔜 Product variant selection
🔜 Basket quantity management
🔜 Checkout flow
🔜 Subscription management
🔜 Delivery day selection
🔜 User authentication

## Database Schema

### Categories Table
- Product categories with icons and ordering
- Active/inactive status
- Slug-based routing

### Products Table
- Product details (name, price, description)
- Image URLs
- Stock management
- Featured products flag
- Category relationships

## Web Basket → WhatsApp

Orders are taken over WhatsApp. For a shopper who doesn't know exactly what
they want, `web/` is a page they can browse instead: tap product images to
fill a basket, and the page gives them a six-character code.

They paste that code into WhatsApp. The agent calls the `resolve-basket`
Edge Function, which turns the code back into the itemised basket, quotes it
at today's prices, and hands back the range it may negotiate within. When
the price is agreed, the same function writes the order.

```
tap tap tap  →  code K7M4QP  →  paste in WhatsApp  →  quote → haggle → order
```

Setup, the agent API, and the commercial settings are in
[`WHATSAPP_BASKET_HANDOFF.md`](WHATSAPP_BASKET_HANDOFF.md).

## Design Philosophy

### Minimal & Focused
- Single-screen design reduces cognitive load
- No unnecessary navigation
- Direct product interaction
- Visual basket feedback

### Speed & Efficiency
- Tap to add (no confirmation dialogs)
- Horizontal basket scroll (quick review)
- Category filtering at top
- Persistent search bar

### Subscription-First
- Weekly delivery model
- Recurring product selection
- Monthly billing cycle
- Predictable shopping experience

## Development

### Running the App
```bash
npm start      # Start Expo development server
npm run android # Run on Android
npm run ios     # Run on iOS
npm run web     # Run web version
```

### Key Files
- `App.js` - Main application component with basket logic
- `lib/supabase.js` - Database client
- `lib/icons.js` - Hugeicons integration
- `theme.js` - Color scheme configuration
- `web/` - Static basket-builder page (no build step)
- `supabase/functions/resolve-basket/` - Turns a basket code into a priced basket

## Component Architecture

### Basket Component
The basket is the core interactive element:
- **Position**: Absolute, fixed to bottom with 14px spacing
- **Layout**: Horizontal ScrollView with product cells
- **Dimensions**: 140px height, 100x100px product cells
- **Styling**: Rounded (20px), elevated shadow, white background

### Product Grid
Main content area displaying available products:
- **Layout**: 2-column responsive grid
- **Cards**: Product image, price, quantity label
- **Interaction**: Tap to add, long-press for details
- **Scroll**: Vertical scroll behind floating basket

---

**Version**: 1.0.0
**License**: Private
**Platform**: iOS, Android, Web
