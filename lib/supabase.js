import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project credentials
// You can find these in your Supabase project settings
const SUPABASE_URL = 'https://czgmwmnorwqhnvutwzej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z213bW5vcndxaG52dXR3emVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzOTI1MzcsImV4cCI6MjA3OTk2ODUzN30.RL4hxb1KqZHHnv25TezwET0IAOmYlBw18entlZO8mmA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});