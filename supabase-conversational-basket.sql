-- ================================================
-- BASKET PLANS - WHATSAPP-NATIVE BASKET BUILDING
-- ================================================
-- Run after supabase-setup.sql, supabase-basket-codes.sql, and agent/schema.sql.
--
-- The web basket (code you paste into WhatsApp) is one way in, but it's
-- not the priority right now — WhatsApp is. A customer should be able to
-- open a chat and build a basket by talking, with no code involved at all.
--
-- The only thing that was actually missing for that: a way to know which
-- shop a WhatsApp number belongs to. Everything else — shared_baskets,
-- the pricing/negotiation logic in resolve-basket — already works once a
-- basket exists; this is what lets one get created straight from chat.
-- ================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_stores_whatsapp_number ON stores(whatsapp_number);

COMMENT ON COLUMN stores.whatsapp_number IS
  'The Meta phone_number_id (or E.164 number) this shop''s customers message. '
  'One number per shop for now — a shared number serving multiple shops would '
  'need an explicit "which shop" step in the conversation, which this does not have.';
