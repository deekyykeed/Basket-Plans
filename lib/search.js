/**
 * AI-powered search using Claude via Supabase Edge Function.
 * Combines semantic understanding with user memory for personalized results.
 */

import { supabase } from './supabase';

/**
 * Perform an AI-powered search that considers user preferences.
 *
 * @param {string} query - The search query (natural language)
 * @param {Array} allProducts - All available products (for client-side reordering)
 * @param {Object|null} memory - The user's memory/preference profile
 * @returns {{ products: Array, reasoning: string, suggestion: string } | null}
 */
export const aiSearch = async (query, allProducts, memory) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.functions.invoke('ai-search', {
      body: { query, memory },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('AI search error:', error.message);
      return null;
    }

    if (!data?.product_ids?.length) {
      return { products: [], reasoning: data?.reasoning || '', suggestion: data?.suggestion || '' };
    }

    // Reorder allProducts based on AI-returned IDs
    const idOrder = new Map(data.product_ids.map((id, i) => [id, i]));
    const matched = allProducts
      .filter(p => idOrder.has(p.id))
      .sort((a, b) => (idOrder.get(a.id) || 0) - (idOrder.get(b.id) || 0));

    return {
      products: matched,
      reasoning: data.reasoning || '',
      suggestion: data.suggestion || '',
    };
  } catch (error) {
    console.error('AI search error:', error);
    return null;
  }
};
