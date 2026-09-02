import type Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase.js";

// How many of the most recent raw messages get replayed into the prompt.
// This is the real cost lever: it's independent of when summarize.ts runs,
// and it's what stops a long chat from growing the bill turn over turn.
// Edit this one number to change the tradeoff.
const REPLAY_WINDOW = 10;

export interface Memory {
  /** Compact rolling profile — see summarize.ts. null for a brand-new contact. */
  summary: string | null;
  /** Last REPLAY_WINDOW raw turns, oldest first, ready to send to Claude. */
  recentTurns: Anthropic.Beta.BetaMessageParam[];
}

export async function loadMemory(phone: string): Promise<Memory> {
  const [{ data: memoryRow }, { data: messages }] = await Promise.all([
    supabase.from("customer_memory").select("summary").eq("phone", phone).maybeSingle(),
    supabase
      .from("whatsapp_messages")
      .select("direction, body")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(REPLAY_WINDOW),
  ]);

  const recentTurns: Anthropic.Beta.BetaMessageParam[] = (messages ?? [])
    .reverse()
    .map((m) => ({ role: m.direction === "in" ? "user" : "assistant", content: m.body }));

  return { summary: memoryRow?.summary ?? null, recentTurns };
}

export async function logMessage(phone: string, direction: "in" | "out", body: string) {
  await supabase.from("whatsapp_messages").insert({ phone, direction, body });
}
