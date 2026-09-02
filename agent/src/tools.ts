import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { env } from "./env.js";

async function callResolveBasket(body: Record<string, unknown>) {
  const res = await fetch(`${env.supabaseUrl}/functions/v1/resolve-basket`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-key": env.basketAgentKey },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Each tool description is written to be prescriptive about *when* to call
// it, not just what it does — Claude leans on this to decide, especially
// on the current model family, which reaches for tools more conservatively
// than earlier ones. Tune the wording here if the agent hesitates to call
// a tool it should, or calls one it shouldn't.

export const resolveBasketTool = betaZodTool({
  name: "resolve_basket",
  description:
    "Look up a basket by its six-character code (e.g. K7M4QP, sometimes " +
    "written BSKT-K7M4QP). Call this as soon as a customer sends or " +
    "mentions a code, before saying anything about what's in their basket " +
    "or what it costs — the tool result is the only source of truth for " +
    "items, availability, and price.",
  inputSchema: z.object({
    code: z.string().describe("The six-character basket code, in whatever form the customer sent it"),
    phone: z.string().optional().describe("The customer's WhatsApp number, if known"),
  }),
  run: async (input) => JSON.stringify(await callResolveBasket({ action: "resolve", ...input })),
});

export const negotiateBasketTool = betaZodTool({
  name: "negotiate_basket",
  description:
    "Check whether a customer's price offer on an already-resolved basket " +
    "can be accepted. Call this whenever a customer proposes a specific " +
    "lower total — never decide yourself whether to accept or what to " +
    "counter with; the tool enforces the real floor.",
  inputSchema: z.object({
    code: z.string().describe("The basket code being negotiated"),
    offer: z.number().positive().describe("The customer's proposed total"),
  }),
  run: async (input) => JSON.stringify(await callResolveBasket({ action: "negotiate", ...input })),
});

export const placeOrderTool = betaZodTool({
  name: "place_order",
  description:
    "Place the order once a total has been explicitly agreed with the " +
    "customer — either the resolved price or a negotiated one. Call this " +
    "exactly once per basket; calling it again for the same code safely " +
    "returns the existing order instead of creating a duplicate.",
  inputSchema: z.object({
    code: z.string().describe("The basket code being ordered"),
    agreed_total: z.number().positive().describe("The exact total the customer agreed to pay"),
    phone: z.string().optional().describe("The customer's WhatsApp number"),
    notes: z.string().optional().describe("Anything about the order worth recording"),
  }),
  run: async (input) => JSON.stringify(await callResolveBasket({ action: "place_order", ...input })),
});

export const basketTools = [resolveBasketTool, negotiateBasketTool, placeOrderTool];
