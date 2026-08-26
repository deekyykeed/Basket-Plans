import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent user events (last 200)
    const { data: events, error: eventsError } = await supabase
      .from('user_events')
      .select('event_type, event_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (eventsError) throw eventsError;

    if (!events || events.length < 3) {
      return new Response(JSON.stringify({
        message: 'Not enough data to analyze yet',
        event_count: events?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build a summary of events for Claude
    const eventSummary = events.map(e => ({
      type: e.event_type,
      data: e.event_data,
      when: e.created_at,
    }));

    // Call Claude API to analyze user behavior
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are analyzing a grocery app user's behavior to build their preference profile. Based on the following activity data, generate a JSON preference profile.

Activity data (most recent first):
${JSON.stringify(eventSummary, null, 2)}

Return ONLY valid JSON with this exact structure (no other text):
{
  "favorite_categories": ["category names they browse/buy most"],
  "preferred_price_range": { "min": number, "max": number },
  "dietary_signals": ["any dietary patterns detected, e.g. organic, gluten-free, vegan"],
  "purchase_frequency": "daily/weekly/biweekly/monthly/unknown",
  "brand_preferences": ["preferred store/brand names"],
  "typical_basket_size": number,
  "search_patterns": ["common search terms or themes"],
  "flavor_profile": ["sweet/savory/spicy/etc preferences detected"],
  "shopping_style": "quick_essentials/browse_and_explore/deal_hunter/bulk_buyer/unknown",
  "summary": "A 2-3 sentence natural language summary of this shopper's profile and habits."
}`,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0].text;

    // Parse the JSON response
    let preferences;
    try {
      preferences = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        preferences = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Claude response as JSON');
      }
    }

    const rawSummary = preferences.summary || '';

    // Upsert user memory
    const { error: upsertError } = await supabase
      .from('user_memory')
      .upsert({
        user_id: user.id,
        preferences,
        raw_summary: rawSummary,
        last_analyzed_at: new Date().toISOString(),
        event_count_at_analysis: events.length,
      }, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      preferences,
      raw_summary: rawSummary,
      events_analyzed: events.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
