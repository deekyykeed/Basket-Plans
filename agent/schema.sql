-- ================================================
-- BASKET PLANS - WHATSAPP AGENT MEMORY & IDENTITY
-- ================================================
-- Run after supabase-setup.sql and supabase-basket-codes.sql.
--
-- These tables are read and written ONLY by the agent backend, using the
-- Supabase service role key. There is no anon access, so RLS is enabled
-- with no policies at all — the default-deny posture. If you ever need a
-- browser or the mobile app to read these directly, add an explicit
-- policy then; don't remove RLS to work around a missing one.
-- ================================================


-- 1. Who is messaging
-- ================================================
-- Anyone not listed here is treated as a customer. Add a row to make a
-- number staff or a supplier. This is the ONLY place that decision is
-- made — the agent trusts this table, never the message text.
CREATE TABLE IF NOT EXISTS contacts (
  phone TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('staff', 'supplier')),
  name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;


-- 2. Raw message log
-- ================================================
-- Every inbound and outbound message, kept indefinitely for audit and
-- dispute resolution. Cheap — this is storage, not something replayed
-- into every Claude call (see src/memory.ts).
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_created
  ON whatsapp_messages(phone, created_at);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;


-- 3. Rolling per-customer memory
-- ================================================
-- One short summary per phone number, refreshed periodically by
-- src/summarize.ts. This is what gets sent to Claude instead of the full
-- message history — see the README for why.
CREATE TABLE IF NOT EXISTS customer_memory (
  phone TEXT PRIMARY KEY,
  summary TEXT,
  last_summarized_at TIMESTAMP WITH TIME ZONE,
  message_count_at_summary INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customer_memory ENABLE ROW LEVEL SECURITY;
