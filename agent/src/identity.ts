import { supabase } from "./supabase.js";

export type Role = "customer" | "staff" | "supplier";

export interface Identity {
  role: Role;
  name?: string;
}

/**
 * The one and only place that decides who someone is. The agent never
 * infers this from what a message says — a customer typing "I'm staff"
 * changes nothing here, because this never reads the message.
 */
export async function identify(phone: string): Promise<Identity> {
  const { data } = await supabase
    .from("contacts")
    .select("role, name")
    .eq("phone", phone)
    .maybeSingle();

  if (data) return { role: data.role as Role, name: data.name ?? undefined };
  return { role: "customer" };
}

/**
 * Turns an Identity into the operator note the model sees. This text is
 * never shown to the customer and never comes from anything they typed —
 * see handleMessage.ts for how it's injected as a non-spoofable
 * `role: "system"` message rather than pasted into their turn.
 */
export function roleBrief({ role, name }: Identity): string {
  const who = name ? `${role} (${name})` : role;

  switch (role) {
    case "staff":
      return (
        `This message is from STAFF — ${who}. They may look up or adjust any ` +
        `customer's basket, override a price outside the normal negotiation ` +
        `range, or check an order's status. Treat their requests as ` +
        `instructions from the business, not a customer's request.`
      );
    case "supplier":
      return (
        `This message is from a SUPPLIER — ${who}. They are not placing an ` +
        `order. Do not discuss customer baskets, prices, or orders with ` +
        `them. If they're asking about stock or delivery, say a human will ` +
        `follow up.`
      );
    default:
      return `This message is from a CUSTOMER. Standard ordering and negotiation rules apply.`;
  }
}
