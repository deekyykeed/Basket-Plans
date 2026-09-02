-- ================================================
-- BASKET PLANS - SHARED BASKET CODES (WhatsApp handoff)
-- ================================================
-- Run this in your Supabase SQL Editor AFTER supabase-setup.sql
--
-- What this adds:
--   * shared_baskets  - a basket built on the web, addressable by a short code
--   * a collision-safe short code generator
--   * per-store commercial settings (fees + how far the agent may discount)
--   * RLS so an anonymous shopper can only touch their own basket
-- ================================================


-- 1. Commercial settings per store
-- ================================================
-- These drive the quote the WhatsApp agent gives, and the floor it is
-- allowed to negotiate down to.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS service_fee_pct DECIMAL(5, 2) DEFAULT 10.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS max_discount_pct DECIMAL(5, 2) DEFAULT 10.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS min_order_total DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'MWK';


-- 2. Short code generator
-- ================================================
-- Crockford-style alphabet: no 0/O, no 1/I/L, no U. Six characters gives
-- ~1.07 billion combinations, so codes stay short and unambiguous over the
-- phone while collisions stay vanishingly rare.
CREATE OR REPLACE FUNCTION generate_basket_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate TEXT;
  attempt INT := 0;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM shared_baskets WHERE code = candidate);

    attempt := attempt + 1;
    IF attempt > 20 THEN
      RAISE EXCEPTION 'Could not allocate a unique basket code after % attempts', attempt;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;


-- 3. Shared baskets
-- ================================================
CREATE TABLE IF NOT EXISTS shared_baskets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  -- Secret held by the browser that built the basket. Lets an anonymous
  -- shopper keep editing their own basket without owning an account, and
  -- stops anyone else editing it just because they know the code.
  session_token TEXT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshot of what was tapped, so the basket survives catalogue edits.
  -- [{ "product_id": uuid, "name": text, "quantity": int, "unit_price": num }]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'MWK',

  -- draft   - still being built in the browser
  -- shared  - shopper hit share/copy
  -- claimed - the WhatsApp agent has resolved the code
  -- ordered - turned into a row in orders
  -- cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  claimed_at TIMESTAMP WITH TIME ZONE,
  claimed_by_phone TEXT,
  agreed_total DECIMAL(10, 2),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',

  CONSTRAINT shared_baskets_status_check
    CHECK (status IN ('draft', 'shared', 'claimed', 'ordered', 'cancelled')),
  -- Keeps an anonymous endpoint from being used as free storage.
  CONSTRAINT shared_baskets_items_size_check
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 100)
);

ALTER TABLE shared_baskets ALTER COLUMN code SET DEFAULT generate_basket_code();

CREATE INDEX IF NOT EXISTS idx_shared_baskets_code ON shared_baskets(code);
CREATE INDEX IF NOT EXISTS idx_shared_baskets_status ON shared_baskets(status);
CREATE INDEX IF NOT EXISTS idx_shared_baskets_user ON shared_baskets(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_baskets_expires ON shared_baskets(expires_at);


-- 4. Keep updated_at honest
-- ================================================
CREATE OR REPLACE FUNCTION touch_shared_basket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shared_baskets_updated_at ON shared_baskets;
CREATE TRIGGER trg_shared_baskets_updated_at
  BEFORE UPDATE ON shared_baskets
  FOR EACH ROW EXECUTE FUNCTION touch_shared_basket();


-- 5. Row Level Security
-- ================================================
-- The shopper is anonymous, so the session_token they generated in the
-- browser is their credential. They send it back on every request as the
-- x-basket-token header; PostgREST exposes request headers to policies.
-- Reading it through a function keeps a missing or malformed header a
-- denial rather than a query error.
CREATE OR REPLACE FUNCTION current_basket_token()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw TEXT;
BEGIN
  raw := current_setting('request.headers', true);
  IF raw IS NULL OR raw = '' THEN
    RETURN NULL;
  END IF;
  RETURN raw::json ->> 'x-basket-token';
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

ALTER TABLE shared_baskets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create a basket" ON shared_baskets;
CREATE POLICY "Anyone can create a basket"
  ON shared_baskets FOR INSERT
  WITH CHECK (
    status = 'draft'
    AND length(session_token) >= 16
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Token holder reads own basket" ON shared_baskets;
CREATE POLICY "Token holder reads own basket"
  ON shared_baskets FOR SELECT
  USING (
    session_token = current_basket_token()
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Token holder edits own basket" ON shared_baskets;
CREATE POLICY "Token holder edits own basket"
  ON shared_baskets FOR UPDATE
  USING (
    (
      session_token = current_basket_token()
      OR (user_id IS NOT NULL AND user_id = auth.uid())
    )
    -- Once the agent has taken over, the browser stops being able to
    -- rewrite what was quoted.
    AND status IN ('draft', 'shared')
  )
  WITH CHECK (status IN ('draft', 'shared', 'cancelled'));

-- Note: there is deliberately no public SELECT policy keyed on `code`
-- alone. Resolving a code is done by the resolve-basket Edge Function
-- using the service role, so a stranger cannot enumerate codes.


-- 6. Housekeeping
-- ================================================
-- Expire abandoned baskets. Schedule with pg_cron if you have it, or call
-- it from a daily Edge Function.
CREATE OR REPLACE FUNCTION expire_stale_baskets()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  affected INT;
BEGIN
  DELETE FROM shared_baskets
  WHERE expires_at < NOW()
    AND status IN ('draft', 'shared');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;


-- 7. Orders placed over WhatsApp
-- ================================================
-- The original orders table assumed an authenticated app user. A shopper
-- who built a basket on the web and finished the deal in WhatsApp has no
-- account, so user_id becomes optional and the phone number identifies them.
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS basket_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_basket_code ON orders(basket_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

-- An anonymous WhatsApp order has no auth.uid() to match, so the existing
-- "Users manage own orders" policy would hide it from everyone. Those rows
-- are written and read by the Edge Function with the service role, which
-- bypasses RLS, so no extra public policy is needed here.
