// resolve-basket
// ---------------------------------------------------------------
// The bridge between the web basket page and the WhatsApp agent.
//
// A shopper taps products on the web, gets a six-character code, and pastes
// it into WhatsApp. The agent calls this function with that code and gets
// back the itemised basket, a priced quote, and the range it is allowed to
// negotiate within.
//
// Actions:
//   resolve     { code }                          -> basket + quote
//   negotiate   { code, offer }                   -> accept / counter / reject
//   place_order { code, agreed_total?, phone? }   -> creates the order
//
// Auth: every request must carry the shared agent key.
//   x-agent-key: <BASKET_AGENT_KEY>
// Codes are short and guessable by design, so this key is what stops a
// stranger from reading other people's baskets.
// ---------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BASKET_AGENT_KEY = Deno.env.get('BASKET_AGENT_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// The code arrives inside whatever the shopper pasted, so pull it out of
// surrounding text and drop spaces, dashes and a BSKT- prefix.
// The alphabet excludes 0/O and 1/I/L, so there is no ambiguity left to fold.
const normaliseCode = (raw: string) =>
  String(raw ?? '')
    .toUpperCase()
    .replace(/^\s*BSKT[-\s]*/, '')
    .replace(/[^0-9A-Z]/g, '');

const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type BasketItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

/**
 * Re-prices the stored snapshot against the live catalogue, so a basket
 * built yesterday is quoted at today's prices and sold-out lines are
 * flagged rather than silently charged for.
 */
async function buildQuote(supabase: any, basket: any) {
  const items: BasketItem[] = Array.isArray(basket.items) ? basket.items : [];
  const productIds = items.map((i) => i.product_id).filter(Boolean);

  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, name, price, quantity_label, is_available, stock_quantity, image_url')
        .in('id', productIds)
    : { data: [] };

  const byId = new Map((products ?? []).map((p: any) => [p.id, p]));

  const lines = items.map((item) => {
    const live = byId.get(item.product_id);
    const unitPrice = live ? Number(live.price) : Number(item.unit_price);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const available = live ? live.is_available !== false : false;
    const priceChanged = live ? round2(Number(live.price)) !== round2(Number(item.unit_price)) : false;

    return {
      product_id: item.product_id,
      name: live?.name ?? item.name,
      quantity_label: live?.quantity_label ?? null,
      image_url: live?.image_url ?? null,
      quantity,
      unit_price: round2(unitPrice),
      line_total: round2(unitPrice * quantity),
      available,
      price_changed: priceChanged,
      price_when_added: round2(Number(item.unit_price)),
    };
  });

  const store = basket.store ?? {};
  const currency = store.currency ?? basket.currency ?? 'MWK';
  const servicePct = Number(store.service_fee_pct ?? 10);
  const deliveryFee = Number(store.delivery_fee ?? 0);
  const maxDiscountPct = Number(store.max_discount_pct ?? 10);
  const minOrderTotal = Number(store.min_order_total ?? 0);

  const availableLines = lines.filter((l) => l.available);
  const subtotal = round2(availableLines.reduce((sum, l) => sum + l.line_total, 0));
  const serviceFee = round2(subtotal * (servicePct / 100));
  const total = round2(subtotal + serviceFee + deliveryFee);

  // The agent may give away its own margin, never the cost of the goods or
  // the delivery. Whichever limit binds first wins.
  const discountFloor = round2(total * (1 - maxDiscountPct / 100));
  const costFloor = round2(subtotal + deliveryFee);
  const floor = round2(Math.max(discountFloor, costFloor, minOrderTotal));

  return {
    currency,
    lines,
    unavailable: lines.filter((l) => !l.available),
    repriced: lines.filter((l) => l.available && l.price_changed),
    quote: {
      subtotal,
      service_fee: serviceFee,
      service_fee_pct: servicePct,
      delivery_fee: deliveryFee,
      total,
      // What the agent is allowed to agree to without escalating.
      negotiable_floor: floor,
      max_discount: round2(Math.max(0, total - floor)),
      min_order_total: minOrderTotal,
      meets_minimum: total >= minOrderTotal,
    },
  };
}

/** A plain-text version the agent can send straight back into the chat. */
function summarise(basket: any, priced: any) {
  const { currency, lines, quote } = priced;
  const storeName = basket.store?.name ?? 'your shop';

  const body = lines
    .map((l: any) => {
      const flag = !l.available ? '  (out of stock)' : l.price_changed ? '  (price updated)' : '';
      return `• ${l.quantity} × ${l.name} — ${money(l.line_total, currency)}${flag}`;
    })
    .join('\n');

  return [
    `Basket ${basket.code} — ${storeName}`,
    '',
    body,
    '',
    `Subtotal: ${money(quote.subtotal, currency)}`,
    `Service fee (${quote.service_fee_pct}%): ${money(quote.service_fee, currency)}`,
    quote.delivery_fee > 0 ? `Delivery: ${money(quote.delivery_fee, currency)}` : null,
    `Total: ${money(quote.total, currency)}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

async function loadBasket(supabase: any, code: string) {
  const { data, error } = await supabase
    .from('shared_baskets')
    .select('*, store:stores(id, name, slug, logo_url, currency, service_fee_pct, delivery_fee, max_discount_pct, min_order_total)')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!BASKET_AGENT_KEY) {
    console.error('BASKET_AGENT_KEY is not set — refusing to serve basket data.');
    return json({ error: 'Server is not configured' }, 500);
  }

  const presentedKey = req.headers.get('x-agent-key') ?? '';
  if (presentedKey !== BASKET_AGENT_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let payload: Record<string, any> = {};
    if (req.method === 'POST') {
      payload = await req.json().catch(() => ({}));
    } else {
      payload = Object.fromEntries(new URL(req.url).searchParams);
    }

    const action = payload.action ?? 'resolve';
    const code = normaliseCode(payload.code);

    if (code.length !== 6) {
      return json({ error: 'A basket code is six characters, e.g. K7M4QP', code: payload.code ?? null }, 400);
    }

    const basket = await loadBasket(supabase, code);
    if (!basket) {
      return json({ found: false, error: `No basket found for code ${code}` }, 404);
    }

    if (basket.status === 'cancelled') {
      return json({ found: false, error: `Basket ${code} was cancelled` }, 410);
    }
    if (basket.expires_at && new Date(basket.expires_at) < new Date() && basket.status !== 'ordered') {
      return json({ found: false, error: `Basket ${code} has expired` }, 410);
    }

    const priced = await buildQuote(supabase, basket);

    // ---------------------------------------------------------------
    if (action === 'resolve') {
      // First time an agent opens the code, mark it claimed so the shopper's
      // browser stops rewriting the basket underneath the quote.
      if (basket.status === 'draft' || basket.status === 'shared') {
        await supabase
          .from('shared_baskets')
          .update({
            status: 'claimed',
            claimed_at: new Date().toISOString(),
            claimed_by_phone: payload.phone ?? null,
          })
          .eq('id', basket.id);
      }

      return json({
        found: true,
        code: basket.code,
        status: basket.status === 'ordered' ? 'ordered' : 'claimed',
        store: basket.store ?? null,
        created_at: basket.created_at,
        item_count: priced.lines.reduce((n: number, l: any) => n + l.quantity, 0),
        ...priced,
        summary_text: summarise(basket, priced),
        already_ordered: basket.status === 'ordered',
        order_id: basket.order_id ?? null,
      });
    }

    // ---------------------------------------------------------------
    if (action === 'negotiate') {
      const offer = Number(payload.offer);
      if (!Number.isFinite(offer) || offer <= 0) {
        return json({ error: 'offer must be a positive number' }, 400);
      }

      const { total, negotiable_floor } = priced.quote;

      if (offer >= total) {
        return json({ decision: 'accept', agreed_total: round2(offer), quote: priced.quote, currency: priced.currency });
      }
      if (offer >= negotiable_floor) {
        return json({
          decision: 'accept',
          agreed_total: round2(offer),
          saving: round2(total - offer),
          quote: priced.quote,
          currency: priced.currency,
        });
      }

      // Meet them between their offer and the lowest we can go, so the
      // counter always lands inside the allowed range.
      const counter = round2(Math.max(negotiable_floor, (offer + negotiable_floor) / 2));
      return json({
        decision: 'counter',
        counter_total: counter,
        floor: negotiable_floor,
        quote: priced.quote,
        currency: priced.currency,
        reason: `Offer is below the lowest price for this basket (${money(negotiable_floor, priced.currency)}).`,
      });
    }

    // ---------------------------------------------------------------
    if (action === 'place_order') {
      if (basket.status === 'ordered' && basket.order_id) {
        return json({ ordered: true, duplicate: true, order_id: basket.order_id, code: basket.code });
      }

      const sellable = priced.lines.filter((l: any) => l.available);
      if (sellable.length === 0) {
        return json({ error: 'Nothing in this basket is still available' }, 409);
      }

      const requested = payload.agreed_total != null ? Number(payload.agreed_total) : priced.quote.total;
      if (!Number.isFinite(requested) || requested < priced.quote.negotiable_floor) {
        return json(
          {
            error: 'agreed_total is below the lowest price for this basket',
            floor: priced.quote.negotiable_floor,
            quote: priced.quote,
          },
          409,
        );
      }
      const agreedTotal = round2(requested);

      const orderedUnits = sellable.reduce((n: number, l: any) => n + l.quantity, 0);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: basket.user_id ?? null,
          store_id: basket.store_id ?? null,
          total: agreedTotal,
          status: 'pending',
          customer_phone: payload.phone ?? basket.claimed_by_phone ?? null,
          basket_code: basket.code,
          source: 'whatsapp',
          notes: payload.notes ?? null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from('order_items').insert(
        sellable.map((l: any) => ({
          order_id: order.id,
          product_id: l.product_id,
          quantity: l.quantity,
          price_at_purchase: l.unit_price,
        })),
      );
      if (itemsError) throw itemsError;

      await supabase
        .from('shared_baskets')
        .update({
          status: 'ordered',
          order_id: order.id,
          agreed_total: agreedTotal,
          claimed_by_phone: payload.phone ?? basket.claimed_by_phone ?? null,
        })
        .eq('id', basket.id);

      return json({
        ordered: true,
        order_id: order.id,
        code: basket.code,
        agreed_total: agreedTotal,
        currency: priced.currency,
        item_count: orderedUnits,
        confirmation_text:
          `Order confirmed 🎉\n\nBasket ${basket.code} — ${orderedUnits} item${orderedUnits === 1 ? '' : 's'}\n` +
          `Total agreed: ${money(agreedTotal, priced.currency)}\nOrder ref: ${String(order.id).slice(0, 8).toUpperCase()}`,
      });
    }

    return json({ error: `Unknown action "${action}"` }, 400);
  } catch (error) {
    console.error('resolve-basket failed:', error);
    return json({ error: (error as Error).message ?? 'Unexpected error' }, 500);
  }
});
