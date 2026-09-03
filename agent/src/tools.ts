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
//
// Every tool here closes over the store and phone the conversation is
// already scoped to (see handleMessage.ts) — the customer never types a
// basket code. The one exception is resolve_basket's optional `code`,
// kept for a customer who arrives from the web basket page and pastes one
// in; leave it out and it falls back to whatever basket that phone is
// already building at this store.

export function makeBasketTools(storeId: string, phone: string) {
  const scoped = (extra: Record<string, unknown>) => ({ store_id: storeId, phone, ...extra });

  const searchProductsTool = betaZodTool({
    name: "search_products",
    description:
      "Search this shop's products by name or description. Call this " +
      "whenever a customer mentions something they want, before adding it " +
      "— you need the real product_id and current price, never guess them.",
    inputSchema: z.object({
      query: z.string().describe("What the customer said they want, e.g. 'milk' or 'cooking oil'"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "search_products", ...input }))),
  });

  const addItemTool = betaZodTool({
    name: "add_item",
    description:
      "Add a product to this customer's basket, or increase the quantity " +
      "if it's already in there. This is how a basket gets built — there " +
      "is no separate 'create a basket' step. Always search first to get " +
      "a real product_id.",
    inputSchema: z.object({
      product_id: z.string().describe("The product's id, from search_products"),
      quantity: z.number().int().positive().optional().describe("How many to add — defaults to 1"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "add_item", ...input }))),
  });

  const removeItemTool = betaZodTool({
    name: "remove_item",
    description:
      "Remove a product from the basket entirely, or reduce its quantity. " +
      "Call this when a customer says they don't want something anymore " +
      "or want less of it.",
    inputSchema: z.object({
      product_id: z.string().describe("The product's id"),
      quantity: z.number().int().positive().optional().describe("How many to remove — omit to remove the whole line"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "remove_item", ...input }))),
  });

  const viewBasketTool = betaZodTool({
    name: "view_basket",
    description:
      "Get the current contents and price of this customer's basket, " +
      "without changing anything. Call this whenever a customer asks " +
      "what's in their basket, how much it costs, or before confirming an " +
      "order — never recite totals from memory.",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(await callResolveBasket(scoped({ action: "view_basket" }))),
  });

  const resolveBasketTool = betaZodTool({
    name: "resolve_basket",
    description:
      "Look up a basket by a six-character code a customer pasted in " +
      "(e.g. from the web basket page). Only use this when they've " +
      "actually given you a code — for the normal conversational flow, " +
      "use view_basket instead, which needs no code at all.",
    inputSchema: z.object({
      code: z.string().describe("The six-character basket code, in whatever form the customer sent it"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "resolve", ...input }))),
  });

  const negotiateBasketTool = betaZodTool({
    name: "negotiate_basket",
    description:
      "Check whether a customer's price offer on their basket can be " +
      "accepted. Call this whenever a customer proposes a specific lower " +
      "total — never decide yourself whether to accept or what to counter " +
      "with; the tool enforces the real floor.",
    inputSchema: z.object({
      offer: z.number().positive().describe("The customer's proposed total"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "negotiate", ...input }))),
  });

  const placeOrderTool = betaZodTool({
    name: "place_order",
    description:
      "Place the order once a total has been explicitly agreed with the " +
      "customer — either the resolved price or a negotiated one. Call this " +
      "exactly once per basket; calling it again safely returns the " +
      "existing order instead of creating a duplicate.",
    inputSchema: z.object({
      agreed_total: z.number().positive().describe("The exact total the customer agreed to pay"),
      notes: z.string().optional().describe("Anything about the order worth recording"),
    }),
    run: async (input) => JSON.stringify(await callResolveBasket(scoped({ action: "place_order", ...input }))),
  });

  return [
    searchProductsTool,
    addItemTool,
    removeItemTool,
    viewBasketTool,
    resolveBasketTool,
    negotiateBasketTool,
    placeOrderTool,
  ];
}
