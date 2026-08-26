# User Memory + AI-Powered Search — Implementation Plan

## Overview
Build a system that understands users based on their full behavior (purchases, cart, searches, browsing), stores that understanding in per-user memory, and powers an AI search experience using Claude API.

---

## Phase 1: Behavior Tracking (Database + Event System)

### New Supabase Tables

**`user_events`** — raw event log
- `id` (UUID, PK)
- `user_id` (FK to auth.users)
- `event_type` (enum: 'search', 'product_view', 'cart_add', 'cart_remove', 'category_browse', 'purchase')
- `event_data` (JSONB — flexible payload per event type)
- `created_at` (timestamp)

Event data examples:
- search: `{ "query": "organic apples", "results_count": 5 }`
- product_view: `{ "product_id": "...", "duration_ms": 3200, "category": "Produce" }`
- cart_add: `{ "product_id": "...", "product_name": "...", "quantity": 2, "price": 4.99 }`
- category_browse: `{ "category_id": "...", "category_name": "Produce" }`
- purchase: `{ "order_id": "...", "items": [...], "total": 45.99 }`

**`orders`** — completed orders
- `id` (UUID, PK)
- `user_id` (FK to auth.users)
- `total` (DECIMAL)
- `status` (enum: 'pending', 'confirmed', 'delivered')
- `created_at`

**`order_items`** — line items per order
- `id` (UUID, PK)
- `order_id` (FK to orders)
- `product_id` (FK to products)
- `quantity` (INT)
- `price_at_purchase` (DECIMAL)

**`user_memory`** — AI-generated preference profile
- `id` (UUID, PK)
- `user_id` (FK to auth.users, UNIQUE)
- `preferences` (JSONB — structured AI output)
- `raw_summary` (TEXT — natural language summary from Claude)
- `last_analyzed_at` (timestamp)
- `event_count_at_analysis` (INT — how many events were analyzed)
- `updated_at`

### Files to Create/Modify
1. **`supabase-setup.sql`** — Add new table definitions + RLS policies
2. **`lib/events.js`** — Event tracking utility functions
3. **`context/BasketContext.js`** — Add event tracking on cart add/remove
4. **`components/SearchBar.js`** — Track search queries
5. **`components/ProductCard.js`** — Track product views (long-press detail open)
6. **`components/CategoryFilter.js`** — Track category browsing
7. **`screens/HomeScreen.js`** — Wire up event tracking

---

## Phase 2: User Memory (AI Analysis with Claude)

### How It Works
1. Collect recent user events (last N events or since last analysis)
2. Send to a Supabase Edge Function
3. Edge Function calls Claude API with the events
4. Claude generates a structured preference profile:
   ```json
   {
     "favorite_categories": ["Produce", "Snacks"],
     "preferred_price_range": { "min": 2, "max": 15 },
     "dietary_signals": ["organic", "gluten-free"],
     "purchase_frequency": "weekly",
     "brand_preferences": ["Nature's Best"],
     "typical_basket_size": 12,
     "search_patterns": ["healthy snacks", "fresh fruit"],
     "flavor_profile": ["sweet", "savory"],
     "summary": "Health-conscious weekly shopper who favors organic produce and snacks..."
   }
   ```
5. Store in `user_memory` table

### When to Trigger Analysis
- After every 10 new events (debounced)
- On app launch if stale (>24h since last analysis)
- Manual refresh from profile screen

### Files to Create/Modify
1. **`supabase/functions/analyze-user/index.ts`** — Edge Function that calls Claude API
2. **`lib/memory.js`** — Client-side functions to fetch/trigger memory analysis
3. **`context/AuthContext.js`** — Load user memory on login, expose via context

---

## Phase 3: AI-Powered Search

### How It Works
1. User types a search query (e.g., "something healthy for movie night")
2. Client sends query + user memory to a Supabase Edge Function
3. Edge Function calls Claude API with:
   - The search query
   - User's memory/preferences
   - Available product catalog (names, categories, descriptions, tags)
4. Claude returns:
   - Interpreted intent
   - Ranked product IDs with relevance scores
   - Optional suggestion text (e.g., "Based on your love for organic snacks...")
5. Client displays results with AI reasoning

### Search Modes
- **Standard search**: Existing text filter (fast, local)
- **AI search**: Triggered by natural language queries or a toggle
- **Hybrid**: AI results merged with text results

### Files to Create/Modify
1. **`supabase/functions/ai-search/index.ts`** — Edge Function for AI search
2. **`lib/search.js`** — Client-side AI search functions
3. **`components/SearchBar.js`** — Add AI search mode toggle/indicator
4. **`screens/HomeScreen.js`** — Handle AI search results
5. **`components/ProductGrid.js`** — Display AI-enhanced results with reasoning

---

## Phase 4: Profile Integration

### User-Facing Memory
- New section in ProfileScreen showing "Your Shopping Profile"
- Display preferences, favorite categories, dietary signals
- "Update Profile" button to re-trigger analysis
- Privacy: "Clear My Data" option

### Files to Modify
1. **`screens/ProfileScreen.js`** — Add memory display section

---

## Implementation Order
1. Database schema (tables + RLS)
2. Event tracking system (lib + context integration)
3. User memory Edge Function + client
4. AI search Edge Function + client
5. Profile integration
6. Testing & refinement

## Dependencies
- `@anthropic-ai/sdk` (for Edge Functions) or direct API calls via fetch
- Supabase Edge Functions (Deno runtime)
- No new client-side packages needed
