import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { supabase } from "./supabase.js";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

// Fold raw history into the rolling summary once this many new messages
// have piled up since the last summary. This is the knob that replaces
// "every 30 days" — it triggers on activity, not the calendar, so a still-
// open conversation never gets rolled up mid-negotiation.
const SUMMARIZE_EVERY_N_MESSAGES = 20;

const SUMMARY_SYSTEM_PROMPT = `You maintain a short rolling profile of a WhatsApp customer for an
ordering agent. Merge the new messages into the existing summary. Keep it
under 150 words, factual, no chit-chat. Note ordering habits, negotiation
style, standing preferences, and anything that helps serve them well next
time. Drop one-off details that won't matter again. Output only the updated
summary text — nothing else.`;

/**
 * Call this after logging an inbound message. It's a no-op most of the
 * time (cheap read, no Claude call) and only spends tokens once the
 * threshold above is crossed.
 */
export async function maybeSummarize(phone: string): Promise<void> {
  const { data: memoryRow } = await supabase
    .from("customer_memory")
    .select("summary, last_summarized_at, message_count_at_summary")
    .eq("phone", phone)
    .maybeSingle();

  const summary = memoryRow?.summary ?? null;
  const lastSummarizedAt = memoryRow?.last_summarized_at ?? null;
  const countAtSummary = memoryRow?.message_count_at_summary ?? 0;

  const { count: totalMessages } = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone);

  if (!totalMessages || totalMessages - countAtSummary < SUMMARIZE_EVERY_N_MESSAGES) return;

  let newMessagesQuery = supabase
    .from("whatsapp_messages")
    .select("direction, body")
    .eq("phone", phone)
    .order("created_at", { ascending: true });
  if (lastSummarizedAt) newMessagesQuery = newMessagesQuery.gt("created_at", lastSummarizedAt);
  const { data: newMessages } = await newMessagesQuery;

  const transcript = (newMessages ?? [])
    .map((m) => `${m.direction === "in" ? "Customer" : "Agent"}: ${m.body}`)
    .join("\n");

  // A separate, cheap call — low effort, no tools, nothing shared with the
  // chat-turn request (see README § Model and effort for why this stays
  // deliberately unoptimized for caching: it runs rarely, and forcing it
  // onto the chat model's cache prefix would only complicate both).
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 512,
    output_config: { effort: "low" },
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Existing summary:\n${summary ?? "(none yet — this is a new contact)"}\n\nNew messages:\n${transcript}`,
      },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const updatedSummary = textBlock?.text ?? summary;

  await supabase.from("customer_memory").upsert({
    phone,
    summary: updatedSummary,
    last_summarized_at: new Date().toISOString(),
    message_count_at_summary: totalMessages,
  });
}
