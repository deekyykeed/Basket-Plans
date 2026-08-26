# Test Coverage Analysis — Basket Plans

## Current State

**Test coverage: 0%** — The project has no test framework installed, no test files, no test scripts in `package.json`, and no CI/CD pipeline running tests.

---

## Priority Areas for Testing

### Priority 1 (Critical) — Pure Business Logic

These functions contain the core business rules of the app and can be unit-tested without any React Native mocking. They should be extracted into a `lib/` utility module and tested directly.

#### 1. Bundle Size Extraction (`App.js:160-173`, `ProductCard.js:12-19`)

The `getBundleSize()` function parses `quantity_label` strings (e.g., `"x6"`, `"6 pack"`, `"Bunch of 5"`) using regex to determine how many items are in a bundle. This logic is **duplicated** between `App.js` and `ProductCard.js` — a refactor opportunity.

**Suggested tests:**
- `"x6"` → 6
- `"6 pack"` → 6
- `"Bunch of 12"` → 12
- `""` / `null` / `undefined` → 1 (default)
- `"no digits here"` → 1
- Already-stored numeric `bundleSize` property takes precedence

#### 2. Basket Quantity Management (`App.js:176-245`)

`addToBasket`, `decreaseQuantity`, and `removeFromBasket` form the core shopping cart logic. Bugs here directly impact revenue.

**Suggested tests:**
- Adding a new product sets quantity to `bundleSize`
- Adding an existing product increments quantity by `bundleSize`
- Decreasing a product reduces quantity by `bundleSize`
- Decreasing when quantity equals `bundleSize` removes the product
- Removing a product filters it out entirely
- Basket remains stable with concurrent add/remove operations

#### 3. Price Calculation (`App.js:248-252`)

`calculateTotal()` sums `price * quantity` across all basket items.

**Suggested tests:**
- Empty basket → 0
- Single product: `price=2.50, quantity=6` → 15.0
- Multiple products summed correctly
- Non-numeric price strings handled via `parseFloat`
- Products with `price=0` don't break the calculation

#### 4. Search & Category Filtering (`App.js:255-279`)

The `filteredProducts` memo combines text search and category filtering.

**Suggested tests:**
- No filters → returns all products
- Category filter alone returns matching `category_id`
- Search alone matches on `name` (case-insensitive)
- Search matches on `description` (case-insensitive)
- Combined category + search narrows results correctly
- Empty search string (whitespace only) is treated as no filter
- Missing `name`/`description` fields don't crash

#### 5. Price Formatting (`SearchBar.js:7-12`)

`formatPrice()` converts numbers to display strings (e.g., `1500` → `"1.5k"`).

**Suggested tests:**
- `0` → `"0.0"`
- `999` → `"999.0"`
- `1000` → `"1.0k"`
- `1500` → `"1.5k"`
- `10000` → `"10.0k"`

#### 6. Discount Percentage Generation (`ProductCard.js:38-49`)

Hash-based pseudo-random percentage that must be stable per product ID.

**Suggested tests:**
- Same `product.id` always produces the same percentage
- Different `product.id` values produce different percentages (most of the time)
- Result is always in the `+0.5%` to `+1.2%` range
- Missing `product.id` doesn't crash (falls back to `Math.random()`)

---

### Priority 2 (High) — Data Layer & Persistence

#### 7. Auth Functions (`lib/auth.js`)

All 9 exported functions wrap Supabase calls and should be tested with a mocked Supabase client.

**Suggested tests:**
- `signUp` returns `{ data, error: null }` on success
- `signUp` returns `{ data: null, error }` on failure
- `signIn` returns proper structure on success/failure
- `signOut` returns `{ error: null }` on success
- `getCurrentUser` / `getSession` handle missing sessions
- `resetPassword` calls Supabase with the correct email
- Each function catches and logs errors without throwing

#### 8. Basket Persistence (`App.js:138-157`)

`loadBasket` and `saveBasket` use `AsyncStorage` for local persistence.

**Suggested tests (with mocked AsyncStorage):**
- `loadBasket` parses valid JSON and sets state
- `loadBasket` handles missing key (first launch)
- `loadBasket` handles corrupted/invalid JSON gracefully
- `saveBasket` serializes current basket to storage
- Save is triggered on every basket change (via `useEffect`)

---

### Priority 3 (Medium) — Component Behavior

#### 9. AuthSheet Form Validation (`AuthSheet.js:27-78`)

The sign-in and sign-up forms have inline validation logic.

**Suggested tests (React Native Testing Library):**
- Sign-in with empty email/password shows "Please enter email and password"
- Sign-up with empty fields shows "Please fill in all fields"
- Sign-up with password < 6 chars shows "Password must be at least 6 characters"
- Successful sign-in calls `onAuthSuccess` and closes sheet
- Failed sign-in displays error message
- Toggle between sign-in/sign-up modes resets errors

#### 10. ProductCard Display Logic (`ProductCard.js:4-49`)

Complex conditional rendering based on basket state.

**Suggested tests:**
- `product=null` renders nothing
- Non-numeric `price` defaults to 0
- When `basketQuantity > 0`, price reflects `numberOfPacks * basePrice`
- `quantity_label` shows bundle size when not in basket
- `quantity_label` shows basket quantity when in basket

#### 11. Basket Component States (`Basket.js`)

The Basket component has distinct collapsed, expanded, and empty states.

**Suggested tests:**
- Empty basket shows "Tap products to add to your basket"
- Non-empty basket shows product thumbnails in horizontal scroll
- Expand button appears only when products exist
- Toggling expand switches between horizontal and grid layouts
- Quantity badge only appears when `quantity > 1`

---

### Priority 4 (Lower) — Edge Cases & Robustness

#### 12. Supabase Data Fetching (`App.js:107-135`)

**Suggested tests:**
- Successful fetch sets products array
- Error response sets products to `[]`
- Non-array response coerced to `[]`
- Missing table error logs setup hint

#### 13. Theme System (`theme.js`)

**Suggested tests:**
- Both `light` and `dark` themes have all required color keys
- Color values are valid CSS color strings

---

## Recommended Test Infrastructure Setup

### 1. Install Jest + React Native Testing Library

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native \
  react-test-renderer @types/jest babel-jest
```

### 2. Add test script to `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 3. Configure Jest for React Native (`jest.config.js`)

```js
module.exports = {
  preset: 'react-native',
  setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@supabase|@gorhom|@hugeicons)/)',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
};
```

### 4. Suggested file structure

```
__tests__/
  lib/
    basketUtils.test.js     # getBundleSize, calculateTotal, formatPrice
    auth.test.js             # All auth functions (mocked Supabase)
    filterProducts.test.js   # Search + category filtering
  components/
    ProductCard.test.js      # Rendering and display logic
    AuthSheet.test.js        # Form validation
    Basket.test.js           # Component states
    SearchBar.test.js        # Price formatting display
__mocks__/
  svgMock.js                 # Mock for SVG imports
  expo-haptics.js            # Mock haptic feedback
  @react-native-async-storage/
    async-storage.js         # Mock AsyncStorage
```

### 5. Refactoring recommendation

Extract pure business logic from `App.js` into a dedicated `lib/basketUtils.js`:
- `getBundleSize(product)`
- `calculateTotal(basketProducts)`
- `addProductToBasket(basket, product)`
- `decreaseProductQuantity(basket, productId)`
- `filterProducts(products, searchQuery, activeCategory)`

This makes the logic independently testable without rendering components or mocking React Native.

---

## Summary

| Priority | Area | Files | Estimated Tests |
|----------|------|-------|-----------------|
| P1 | Bundle size extraction | App.js, ProductCard.js | 6 |
| P1 | Basket quantity management | App.js | 6 |
| P1 | Price calculation | App.js | 5 |
| P1 | Search & category filtering | App.js | 7 |
| P1 | Price formatting | SearchBar.js | 5 |
| P1 | Discount percentage | ProductCard.js | 4 |
| P2 | Auth functions | lib/auth.js | 12 |
| P2 | Basket persistence | App.js | 5 |
| P3 | AuthSheet validation | AuthSheet.js | 6 |
| P3 | ProductCard display | ProductCard.js | 5 |
| P3 | Basket component states | Basket.js | 5 |
| P4 | Data fetching | App.js | 4 |
| P4 | Theme system | theme.js | 2 |
| **Total** | | | **~72 tests** |

Starting with Priority 1 items gives the highest value for the lowest effort, since they test pure functions with no mocking required (after the refactor to extract them from components).
