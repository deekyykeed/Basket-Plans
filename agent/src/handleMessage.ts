import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { identify, roleBrief } from "./identity.js";
import { loadMemory, logMessage } from "./memory.js";
import { maybeSummarize } from "./summarize.js";
import { makeBasketTools } from "./tools.js";
import { resolveStore } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read once at startup, not per-request — it's the frozen, cacheable part
// of the prompt (see README § Prompt caching). Restarting the process is
// what "an edit to system-prompt.md takes effect" means here.
const SYSTEM_PROMPT = readFileSync(join(__dirname, "..", "system-prompt.md"), "utf8");

// Edit this one line to change model or cost/quality tradeoff — see
// README § Model and effort before touching it.
const MODEL = "claude-opus-5";
const EFFORT = "medium";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

/**
 * The whole send-and-reply cycle for one inbound WhatsApp message.
 * Call this from whatever receives the webhook (see webhook.ts and the
 * README for wiring this into an actual WhatsApp Cloud API endpoint).
 *
 * businessPhoneNumberId is the shop's own WhatsApp number the message
 * arrived on (Meta's metadata.phone_number_id) — it's how we know which
 * shop's catalog and baskets this conversation is scoped to, with no
 * "which shop?" question ever asked. See store.ts.
 */
export async function handleIncomingMessage(
  businessPhoneNumberId: string,
  phone: string,
  text: string,
): Promise<string> {
  await logMessage(phone, "in", text);

  // Identity, memory, and the shop this number belongs to are all looked
  // up here, server-side, from our own database — never derived from the
  // message text itself. This is what makes the operator note below
  // non-spoofable.
  const [identity, memory, store] = await Promise.all([
    identify(phone),
    loadMemory(phone),
    resolveStore(businessPhoneNumberId),
  ]);

  if (!store) {
    // No shop is configured for this number yet — nothing downstream
    // (search, basket, pricing) has anywhere to point. Fail loudly rather
    // than guessing a store, since guessing wrong would quote someone
    // else's prices.
    const reply = "Sorry, this number isn't set up for ordering yet — a human will follow up.";
    await logMessage(phone, "out", reply);
    return reply;
  }

  const operatorNote = [
    roleBrief(identity),
    `This conversation is with ${store.name}.`,
    memory.summary ? `Long-term notes on this contact: ${memory.summary}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...memory.recentTurns,
    { role: "user", content: text },
  ];

  // TypeScript's tool runner resolves directly to the final message when
  // awaited (no separate .until_done() call — that's the Python SDK).
  const finalMessage = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    // Explicit breakpoint on the frozen instructions — this is the large,
    // never-changing part, shared across every customer and every turn.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    // Automatic caching for the growing message tail (recent turns +
    // this turn) — the robust combination for an agent loop like this one.
    cache_control: { type: "ephemeral" },
    tools: makeBasketTools(store.id, phone),
    messages: [
      ...messages,
      // Appended AFTER the user turn, as its own operator-only message —
      // never as text inside the user's turn, which anything writing to
      // that field could spoof. This is the mechanism the identity
      // question from earlier in the project actually resolves to.
      { role: "system", content: operatorNote },
    ],
  });

  const reply = finalMessage.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  await logMessage(phone, "out", reply);
  // Fire-and-forget: cheap no-op most turns, a small summarization call
  // only once the threshold in summarize.ts is crossed.
  void maybeSummarize(phone);

  return reply;
}
