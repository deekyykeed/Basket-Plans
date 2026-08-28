# Customer Use Case Validation

Walkthrough of the journeys a real customer would take, checked against the code
as it stands. Verdicts are from source only — the live Supabase project was not
reachable during this review, so "data exists" is assumed, not verified.

Legend: ✅ works · ⚠️ works with a defect · ❌ does not work / does not exist

---

## 1. Open the app and browse the catalogue — ✅

`screens/HomeScreen.js:47` fetches `products` with the `stores` join, filtered on
`is_available`. RLS allows anonymous reads of available products and active
stores. Grid renders, images fall back to a 📦 placeholder on error.

Setup this depends on:
- `stores` rows must exist before products (products FK to store).
- The `product-images` storage bucket is **commented out** in `supabase-setup.sql:184`.
  It has to be created before any `image_url` resolves.
- There is no admin/vendor UI. Populating products means SQL editor, a seed
  script, or the Supabase dashboard. RLS has no INSERT policy for products, so
  seeding must run as service role.

⚠️ **Row cap.** `select('*')` with no range. PostgREST caps at `db.max_rows`
(1000 by default) and truncates silently. Past ~1000 products the tail of the
catalogue simply stops existing, with no error.

## 2. Filter by category — ⚠️

Toggle logic is correct (the double-toggle between `CategoryFilter` and
`HomeScreen` cancels out).

- **Bug:** `HomeScreen.js:114` — `trackCategoryBrowse({ id: newCategory, name: categoryId })`
  passes the category **UUID** as the name. Every `category_browse` event stores
  a UUID in `category_name`, so the memory analysis sees UUIDs and will emit
  garbage in `favorite_categories`. This silently degrades the whole AI layer.
- Cosmetic: `supabase-setup.sql` seeds Snacks with `🍿`, but `lib/icons.js:101`
  maps `🥫`. Snacks falls back to a raw emoji instead of the custom icon.

## 3. Keyword search — ✅

`filterProducts` runs locally over the already-fetched list. Fast, works signed
out. Subject to the same 1000-row cap as #1.

## 4. Tap to add, long-press for detail, adjust quantity — ⚠️

Add/decrease/remove and bundle-size maths in `lib/basketUtils.js` are sound.

⚠️ `ProductDetailsSheet.js:22` adds quantity N by calling `onAddToBasket` in a
loop, which fires N haptics and N separate `cart_add` events. A customer adding
"5" writes 5 rows and skews their own profile toward that product.

⚠️ `stock_quantity` is never checked. A customer can add 50 of something with 2
in stock.

## 5. Basket survives closing the app — ⚠️

Persisted to AsyncStorage (`BasketContext.js:23`). Same device, same phone: fine.

- The basket is **never written to Supabase**. Different device, or a reinstall,
  and it's gone. For a subscription product where the basket *is* the recurring
  order, this is the wrong home for it.
- The basket is not cleared on sign-out, so the next account on that device
  inherits the previous customer's basket.

## 6. Sign up / sign in with email — ❌

`lib/auth.js` is correct, but `lib/supabase.js:7` creates the client with
`persistSession: true` and **no `storage` adapter**. In React Native there is no
`localStorage`, so supabase-js falls back to in-memory storage and the session is
lost every time the app is killed.

Consequences beyond the login screen: events stop being tracked (they require a
user), memory never loads, AI search never arms. This one bug cascades into most
of the personalisation. AsyncStorage is already a dependency — it just needs
wiring into `createClient`.

## 7. Sign in with Google / Apple — ❌

`AuthSheet.js:206` calls `signInWithOAuth` with no `redirectTo` and nothing opens
a browser. On native this returns a URL and stops. `expo-web-browser` /
`expo-auth-session` are not in `package.json`. The buttons render and do nothing.

## 8. Natural-language search ("something healthy for movie night") — ❌ for the customer who most needs it

`HomeScreen.js:88` gates AI search on `wordCount >= 3 && user && memory`.

`memory` is null until the analyse function has run, which needs ≥3 tracked
events **and** only ever fires from `MemoryContext.loadMemory` — i.e. at sign-in
or app launch. So a brand-new customer who signs in and browses 20 products still
has `memory === null` for that entire session. AI search stays off until they
restart the app. Signed-out customers never get it at all.

The plan's "re-analyse after every 10 new events" is not implemented — the
threshold in `lib/memory.js:65` is only ever evaluated at load time.

Also in this path:
- `lib/search.js` returns `reasoning` and `suggestion`; `HomeScreen.js:99` uses
  only `.products` and throws both away. Nothing in the UI ever shows AI
  reasoning. The "AI" indicator in `SearchBar.js:33` is drawn on the *clear*
  button, so tapping the AI badge wipes the search.
- When Claude returns no matches, `aiSearchResults` becomes `[]`, which is truthy
  and overrides the text results — the customer gets an empty grid with no
  explanation, worse than the keyword search they'd have had.

### Cost and latency — the thing that breaks at scale

`supabase/functions/ai-search/index.ts:56` serialises the **entire product
catalogue** into the prompt on every single search. At 500 products that is
roughly 25–40K input tokens per query; at 2000 it is four to five times that,
per keystroke-debounced search, per customer. Latency lands in the 5–15s range
before results render.

Fixes, in order of payoff:
1. **Prompt caching.** Put the catalogue in a `system` block with
   `cache_control: {type: "ephemeral", ttl: "1h"}` and the query after it. Cached
   reads are ~10% of input cost. The catalogue is the stable prefix; the query is
   the volatile suffix, so this is close to the ideal caching shape. Verify with
   `usage.cache_read_input_tokens` — any per-request variance in the catalogue
   (ordering, timestamps) silently kills the hit rate, so sort deterministically.
2. **Pre-filter.** Send Claude a keyword/category-narrowed subset (say top 100)
   rather than everything.
3. **Model ID.** Both functions pin `claude-sonnet-4-20250514`. Current IDs carry
   no date suffix — `claude-opus-5` is the current default; `claude-sonnet-5` or
   `claude-haiku-4-5` if you want to trade capability for cost on this route.
4. **Rate limiting.** Neither function limits calls. Any authenticated account
   can burn the Anthropic budget by typing. Add a per-user quota.

### Prompt injection

`ai-search` takes the `memory` object **from the client** and interpolates it
straight into the prompt. A customer can put arbitrary text in their own profile
payload and steer the model. Fetch memory server-side from `user_memory` by
`user.id` — the function already holds a service-role client.

## 9. Profile learns preferences over time — ⚠️

The pipeline is real: events batch (`lib/events.js`), `analyze-user` summarises,
`ProfileScreen` renders it nicely. Blocked in practice by #6 (no session ⇒ no
events) and degraded by #2 (UUIDs as category names).

⚠️ `trackEvent` calls `supabase.auth.getUser()` per event, which is a network
round trip each time. Use `getSession()` — it reads the cached session.

## 10. Place an order / confirm the weekly basket — ❌ does not exist

There is no checkout. Nothing anywhere writes to `orders` or `order_items`;
`trackPurchase` is defined and never called. The basket header says "Saved for
Friday" (`Basket.js:31`) but nothing is saved anywhere except the phone.

The `orders` and `order_items` tables exist and are correct. When checkout is
built: the `orders` RLS is `FOR ALL` on the user's own rows, so a client can
insert an order with any `total` it likes. Compute totals server-side in an edge
function or a trigger before real money is involved.

## 11. See past orders — ❌

`OrdersScreen.js` never queries `orders`. It shows the current basket and a
hardcoded "No past orders yet" empty state. `ProfileScreen`'s Orders and Saved
stats are literal `0`.

## 12. Subscription itself — ❌ does not exist

No monthly fee, no billing, no delivery-day selection, no payment method, no
recurring-order object. The README's business model is 0% implemented. There is
no table for a subscription and no payment provider in `package.json`.

## 13. Multi-store basket — ❌ unhandled

The catalogue is multi-vendor and the basket mixes stores freely with no
per-store split, per-store delivery, or fulfilment routing. Moot until checkout
exists, but it shapes how the order tables get used.

---

## Suggested order of work

1. **Wire AsyncStorage into the Supabase client.** One line. Unblocks auth,
   events, memory, and AI search all at once.
2. **Seed data**: create the `product-images` bucket, insert stores, then
   products. Fix the Snacks icon key while you're in there.
3. **Fix the category-name tracking bug** before you accumulate a pile of
   UUID-named events that poison the first profiles.
4. **Checkout**: orders + order_items with server-computed totals, then make
   `OrdersScreen` read from them. This is the biggest single gap.
5. **Move the basket server-side** — it's the subscription, not a shopping cart.
6. **Rework AI search**: ungate it from `memory` (personalise when a profile
   exists, still work when it doesn't), fetch memory server-side, add prompt
   caching + a pre-filter, update the model ID, add a rate limit, and actually
   render `suggestion`.
7. Add row limits/pagination to the product fetch.
