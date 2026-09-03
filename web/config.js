// Basket Plans web basket — deployment settings.
//
// Everything here is public by design: the anon key is safe to ship, and
// row level security is what actually protects the data.
export const config = {
  supabaseUrl: 'https://czgmwmnorwqhnvutwzej.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z213bW5vcndxaG52dXR3emVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzOTI1MzcsImV4cCI6MjA3OTk2ODUzN30.RL4hxb1KqZHHnv25TezwET0IAOmYlBw18entlZO8mmA',

  // The number the WhatsApp agent answers on, in international format,
  // digits only. This is where "Send to WhatsApp" opens a chat.
  whatsappNumber: '265000000000',

  // Fallback when a store has no currency set.
  currency: 'MWK',
};
