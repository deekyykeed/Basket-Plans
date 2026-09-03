import { supabase } from "./supabase.js";

export interface Store {
  id: string;
  name: string;
}

/**
 * Maps the WhatsApp Business phone number a message arrived on to the shop
 * it belongs to. This is the one thing that has to exist before a
 * conversation can build a basket at all — see
 * supabase-conversational-basket.sql for the column this reads.
 *
 * One number per shop for now: there's no "which shop are you shopping
 * from?" step anywhere in this codebase, so a number shared by two shops
 * would silently serve the wrong one.
 */
export async function resolveStore(businessPhoneNumberId: string): Promise<Store | null> {
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("whatsapp_number", businessPhoneNumberId)
    .maybeSingle();

  return data;
}
