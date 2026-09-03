import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service role client — bypasses RLS. This is the backend, not a browser;
// it's trusted with everything, which is exactly why it never runs
// anywhere a customer's device can reach it (see README § Where this runs).
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
