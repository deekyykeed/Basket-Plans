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

    const { query, memory } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch available products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, price, category_id, quantity_label, store:stores(name)')
      .eq('is_available', true);

    if (productsError) throw productsError;

    // Fetch categories for context
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true);

    const categoryMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));

    // Build product catalog for Claude
    const catalog = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: categoryMap[p.category_id] || 'Other',
      quantity_label: p.quantity_label,
      store: p.store?.name,
    }));

    // Build user context from memory
    const userContext = memory?.preferences
      ? `User Profile:
- Favorite categories: ${memory.preferences.favorite_categories?.join(', ') || 'unknown'}
- Dietary signals: ${memory.preferences.dietary_signals?.join(', ') || 'none'}
- Price range: $${memory.preferences.preferred_price_range?.min || 0} - $${memory.preferences.preferred_price_range?.max || 999}
- Shopping style: ${memory.preferences.shopping_style || 'unknown'}
- Flavor preferences: ${memory.preferences.flavor_profile?.join(', ') || 'unknown'}
- Summary: ${memory.preferences.summary || 'No profile yet'}`
      : 'No user profile available yet.';

    // Call Claude API
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
          content: `You are a smart grocery search assistant. A user searched for: "${query}"

${userContext}

Available products:
${JSON.stringify(catalog, null, 2)}

Based on the search query and the user's preferences/history, return ONLY valid JSON with:
{
  "product_ids": ["id1", "id2", ...],
  "reasoning": "Brief explanation of why these products match",
  "suggestion": "A short, friendly message to show the user (e.g., 'Based on your love for organic produce...')"
}

Rules:
- Return product IDs in relevance order (best match first)
- Consider semantic meaning, not just keyword matching (e.g., "movie night snacks" → popcorn, chips, drinks)
- Use the user's preferences to personalize results (e.g., if they prefer organic, rank organic items higher)
- If no products match, return an empty product_ids array
- Maximum 20 products in results
- The suggestion should feel natural and helpful, not robotic`,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0].text;

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Claude search response');
      }
    }

    return new Response(JSON.stringify(result), {
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
