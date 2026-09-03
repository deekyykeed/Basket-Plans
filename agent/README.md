# Basket Plans WhatsApp agent

This is the piece we talked through: what actually runs Claude for the
WhatsApp ordering conversation. It's a plain Node/TypeScript project, kept
separate from the Expo app on purpose — no framework lock-in, no hosted
platform's UI holding your instructions hostage. Everything here is a file
you can open, read, and edit.

**The one file you'll actually touch day to day is
[`system-prompt.md`](./system-prompt.md).** That's the agent's behavior —
tone, policy, how it talks to staff vs. customers. Edit it, restart the
process, done. No code change.

## What's here

| File | What it is |
|---|---|
| `system-prompt.md` | The instructions — edit this |
| `schema.sql` | Three Supabase tables this needs (run once) |
| `src/identity.ts` | Decides customer / staff / supplier from the phone number |
| `src/store.ts` | Decides which shop a conversation belongs to, from the WhatsApp number it arrived on |
| `src/memory.ts` | Loads recent history + long-term summary for a conversation |
| `src/summarize.ts` | Periodically compresses old history into that summary |
| `src/tools.ts` | `makeBasketTools(storeId, phone)` — search/add/remove/view/negotiate/order, all wired to `resolve-basket` |
| `src/handleMessage.ts` | The actual send-a-message-get-a-reply cycle |
| `src/webhook.ts`, `src/sendWhatsApp.ts` | Where to plug in your real WhatsApp Cloud API credentials |

## Setup

```bash
cd agent
npm install
cp .env.example .env   # fill in the real values
```

You need: an Anthropic API key, this Supabase project's URL + service role
key, the `BASKET_AGENT_KEY` from `resolve-basket`'s setup, and your
WhatsApp Cloud API credentials. Then run `schema.sql` in the Supabase SQL
editor (after `supabase-setup.sql`, `supabase-basket-codes.sql`, and
`supabase-conversational-basket.sql`), and set each shop's
`stores.whatsapp_number` to the Meta phone number id customers message —
that's what `store.ts` uses to route a conversation to the right shop.

This code isn't hosted anywhere yet — `webhook.ts` is a sketch you plug
into whatever receives your WhatsApp webhook today (a Vercel function, an
Express server, wherever). Point that endpoint at `onWhatsAppWebhook`.

## WhatsApp first — there is no basket code in the normal flow

The priority right now is chat: a customer opens WhatsApp and builds a
basket by talking, full stop. No web page, no code to type in. The web
basket picker still exists elsewhere in this repo as a second way in — a
customer who starts there ends up with a code they can paste into chat —
but it's not what this agent expects or waits for. `resolve_basket` (the
code-lookup tool) still works for that handoff case; every other tool
(`search_products`, `add_item`, `remove_item`, `view_basket`,
`negotiate_basket`, `place_order`) works purely from the store + phone the
conversation is already scoped to, so a basket can be built and ordered
without a code ever existing.

Where the order goes after `place_order` is deliberately just Supabase for
now (`orders`, `source: 'whatsapp'`) — routing confirmed orders to
something a human picks up from (Linear or otherwise) is a later decision,
not built here yet.

## The message cycle, mapped to actual files

1. Meta calls your webhook → `webhook.ts` pulls out the **business** phone
   number id the message arrived on, plus the customer's number and text.
2. `handleMessage.ts` logs the message, looks up **which shop this is**
   (`store.ts`), **who's messaging** (`identity.ts`), and **what's worth
   remembering** (`memory.ts`). No shop configured for that number → a
   plain fallback reply, nothing downstream runs.
3. It calls Claude with the frozen system prompt, `makeBasketTools(storeId, phone)`,
   recent history, and an operator note about who this is and which shop.
4. Claude replies, possibly after calling one of the basket tools — real
   HTTP calls into the `resolve-basket` Edge Function, always scoped to
   that store and phone.
5. The reply goes back out through `sendWhatsApp.ts`, from that same
   business number.
6. The turn is logged, and `summarize.ts` checks — cheaply — whether it's
   time to fold old history into the long-term summary.

## Who's messaging, and why it's safe

Covered this before, now it's actually built: `identity.ts` looks the
phone number up in the `contacts` table (add a row to mark someone staff
or a supplier — anyone not listed is a customer) and turns that into a
short note. `handleMessage.ts` sends that note as its own
`{role: "system", ...}` message, appended *after* the customer's turn —
not pasted into their message text. That's the mechanism: a message role
only your backend can produce, which nothing the customer types can forge.
Claude trusts it completely for exactly that reason.

**One thing to know:** this only works on models that support
mid-conversation system messages (Claude Opus 5, among others — not Claude
Sonnet 5). If you ever switch the model to cut costs, check that first —
losing this means falling back to a much weaker, spoofable pattern.

## History: stored vs. replayed

Every message is logged forever in `whatsapp_messages` — cheap, just rows,
kept for audit. What actually gets sent to Claude on each turn is much
smaller, and that's the real cost lever:

- **`REPLAY_WINDOW` in `memory.ts`** (currently 10) — the last N raw turns
  of *this* conversation. Bump it if the agent seems to lose the thread too
  quickly; lower it to save tokens.
- **The rolling summary in `customer_memory`** — a compact paragraph
  covering everything older than that window, refreshed by `summarize.ts`.

This is the same shape as the `user_memory` / `analyze-user` system already
in this repo for shopping behavior — same idea, applied to chat text.

**On the 30-day idea:** it's implemented as an activity trigger instead of
a calendar one — `SUMMARIZE_EVERY_N_MESSAGES` in `summarize.ts` (currently
20). A conversation that's still open doesn't get rolled up just because a
month passed; one that's been quiet or has accumulated enough turns does.
Change the threshold there, not by adding a date check.

## Model and effort

`handleMessage.ts` has two constants at the top:

```ts
const MODEL = "claude-opus-5";
const EFFORT = "medium";
```

`claude-opus-5` is the default here because it's the most capable current
model and supports the identity mechanism above. For a chat-shaped,
high-volume, latency-sensitive workload like this, effort is the cheaper
lever to pull before considering a smaller model — `medium` trades some
thoroughness for materially lower cost, and is usually the right resting
point for routine replies. Drop to `low` if replies are simple and cost
matters more than nuance; raise toward `high` only if you see the agent
being too terse or making mistakes on genuinely tricky negotiations.

If you later move to a cheaper model for cost reasons, re-check two things
that don't carry over automatically: whether it supports the
mid-conversation system message (above), and that its prompt-cache minimum
token threshold still fits your system prompt's length.

## Prompt caching

The system prompt is marked as an explicit cache breakpoint, and the
conversation tail uses automatic caching — the standard combination for an
agent loop. In practice: the first message of the day pays full price for
`system-prompt.md`; every message after that, from any customer, reads it
from cache at a fraction of the cost. This is free once it's wired up
right, which it already is here — but it silently breaks if `system-prompt.md`
gets read differently per request (it's read once at startup, not
per-message, specifically to keep this working) or if anything dynamic
gets interpolated into it. Keep dates, names, and per-customer data out of
that file — that's what the operator note in step 3 above is for.

You can check it's actually working by logging `response.usage.cache_read_input_tokens`
on a few real turns — it should be nonzero and growing after the first
message.
