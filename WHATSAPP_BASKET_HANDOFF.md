# Web basket → WhatsApp handoff

A shopper who doesn't know exactly what they want opens the web page, taps
product images until the basket looks right, and gets a six-character code.
They paste that code into WhatsApp. The agent resolves the code into the
full basket, quotes a price, negotiates within a set range, and places the
order.

```
  web page                 Supabase                 WhatsApp agent
 ─────────────────────────────────────────────────────────────────
  tap tap tap   ──insert──▶  shared_baskets
                             code: K7M4QP
  "K7M4QP"      ──paste──▶  ................▶  resolve-basket
                                                   ↓
                                              itemised basket
                                              + quote + floor
                                                   ↓
                                              negotiate → order
```

## The pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Basket page | `web/` | Shop picker, product grid, floating basket, code |
| `shared_baskets` | `supabase-basket-codes.sql` | The basket behind a code |
| `resolve-basket` | `supabase/functions/resolve-basket/` | The only way to turn a code into a basket |

## Setup

**1. Database**

Run `supabase-basket-codes.sql` in the Supabase SQL editor (after
`supabase-setup.sql`). Optionally run `web/sample-data.sql` to seed a
Shoprite shelf so the page has something to show.

**2. Edge Function**

```bash
supabase secrets set BASKET_AGENT_KEY="$(openssl rand -hex 24)"
supabase functions deploy resolve-basket --no-verify-jwt
```

`--no-verify-jwt` is deliberate: the WhatsApp agent authenticates with
`x-agent-key`, not with a Supabase user token. The function refuses every
request without that header, and refuses to start if the secret is unset.

**3. Web page**

Set `whatsappNumber` in `web/config.js` to the number your agent answers on
(international format, digits only). Then deploy `web/` as static files:

```bash
cd web && vercel deploy --prod     # or netlify deploy, or any static host
```

There is no build step. `web/index.html` is the entry point.

The repo-root `vercel.json` points the connected `basket-plans` Vercel
project at `web/` as a static site, so a push deploys the basket page. It
also turns off framework detection — the project was set to the Next.js
preset, which fails against this repo because there is no Next.js in it.

## The code

Six characters from `23456789ABCDEFGHJKMNPQRSTVWXYZ` — no `0`/`O`, no
`1`/`I`/`L`, so nothing is ambiguous when read off a screen. About 1.07
billion combinations.

A code is allocated on the first tap and the basket row is updated as the
shopper keeps shopping, so the code stays the same while its contents grow.
Emptying the basket cancels the row. Unclaimed baskets expire after 7 days
(`expire_stale_baskets()`).

Codes are short and therefore guessable, which is why resolving one requires
the agent key. Never put `BASKET_AGENT_KEY` in the web page.

## Agent API

`POST https://<project>.supabase.co/functions/v1/resolve-basket`

Headers: `x-agent-key: <BASKET_AGENT_KEY>`, `Content-Type: application/json`

### `resolve` — what's in the basket, and what it costs

```json
{ "action": "resolve", "code": "K7M4QP", "phone": "265991234567" }
```

The `code` field is forgiving: `k7m4qp`, `K7M4QP`, and `BSKT-K7M4QP` all work.

```json
{
  "found": true,
  "code": "K7M4QP",
  "status": "claimed",
  "store": { "name": "Shoprite", "currency": "MWK" },
  "item_count": 7,
  "currency": "MWK",
  "lines": [
    { "name": "Fresh milk", "quantity": 2, "unit_price": 2200, "line_total": 4400,
      "available": true, "price_changed": false }
  ],
  "unavailable": [],
  "repriced": [],
  "quote": {
    "subtotal": 24500,
    "service_fee": 2450,
    "service_fee_pct": 10,
    "delivery_fee": 3500,
    "total": 30450,
    "negotiable_floor": 28010,
    "max_discount": 2440,
    "min_order_total": 10000,
    "meets_minimum": true
  },
  "summary_text": "Basket K7M4QP — Shoprite\n\n• 2 × Fresh milk — MWK 4,400.00\n…"
}
```

Prices are re-read from the live catalogue every time, so a basket built
last week is quoted at today's prices. Anything now out of stock lands in
`unavailable` and is left out of the totals. `summary_text` is ready to send
straight back into the chat.

Resolving marks the basket `claimed`, which locks the shopper's browser out
of editing it — the quote can't move under the agent mid-conversation.

### `negotiate` — can we do this price?

```json
{ "action": "negotiate", "code": "K7M4QP", "offer": 28000 }
```

```json
{ "decision": "counter", "counter_total": 28005, "floor": 28010 }
```

`decision` is `accept` or `counter`. The floor is whichever binds first: the
store's `max_discount_pct` off the total, or the cost of the goods plus
delivery — the agent can give away its own margin, never the shop's price.
A counter always lands inside the allowed range, so the agent can offer it
without checking anything else.

### `place_order` — done deal

```json
{ "action": "place_order", "code": "K7M4QP", "agreed_total": 28500, "phone": "265991234567" }
```

```json
{
  "ordered": true,
  "order_id": "5f2c…",
  "agreed_total": 28500,
  "confirmation_text": "Order confirmed 🎉\n\nBasket K7M4QP — 7 items\nTotal agreed: MWK 28,500.00\nOrder ref: 5F2C8A1B"
}
```

Writes `orders` + `order_items` and marks the basket `ordered`. Below the
floor it returns `409` rather than the order. Calling it twice returns the
same order with `"duplicate": true`, so a retry can't double-order.

## Wiring it into the agent

Give the agent one tool per action and this instruction:

> When a message contains a six-character basket code (letters and digits,
> often on its own line after the word "Basket"), call `resolve_basket` with
> it. Read the items back to the customer and give them the total. If they
> ask for a better price, call `negotiate_basket` with their number — accept
> what it accepts, and offer the counter it returns. Never invent a price
> below the floor. When they agree, call `place_order` and send them the
> confirmation. If a code isn't found or has expired, say so and offer them
> the shop link to build a new basket.

Because the shared message already lists the items in plain text, the agent
can also confirm what it found against the message the customer pasted.

## Tuning the commercial terms

Per store, in the `stores` table:

| Column | Meaning | Default |
| --- | --- | --- |
| `service_fee_pct` | Your margin on top of shop prices | 10% |
| `delivery_fee` | Flat delivery charge | 0 |
| `max_discount_pct` | How far the agent may come down | 10% |
| `min_order_total` | Below this, don't take the order | 0 |
| `currency` | Currency shown everywhere | MWK |

## Security notes

- Anonymous shoppers can create baskets. A random `session_token` held in
  the browser is what lets them keep editing their own, enforced by RLS
  through the `x-basket-token` header. There is no public read policy keyed
  on the code alone, so codes cannot be enumerated with the anon key.
- A basket is capped at 100 lines so the open endpoint can't be used as
  free storage. Supabase's own rate limits handle the rest; add a stricter
  limit at your CDN if the page gets abused.
- `orders.user_id` is now nullable, because a WhatsApp customer has no
  account. Those rows are written by the service role and identified by
  `customer_phone` and `basket_code`.
