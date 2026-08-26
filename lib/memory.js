/**
 * User memory management.
 * Fetches, triggers analysis, and caches the user's AI-generated preference profile.
 */

import { supabase } from './supabase';
import { getEventCountSinceAnalysis } from './events';

const ANALYSIS_THRESHOLD = 10; // Trigger re-analysis after 10 new events
const STALE_HOURS = 24; // Re-analyze if older than 24 hours

/**
 * Fetch the user's memory/preference profile from Supabase.
 */
export const fetchUserMemory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for new users)
      console.error('Error fetching user memory:', error.message);
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching user memory:', error);
    return null;
  }
};

/**
 * Trigger a memory analysis via the Edge Function.
 * Returns the updated preferences or null on failure.
 */
export const analyzeUserMemory = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.functions.invoke('analyze-user', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error analyzing user memory:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error analyzing user memory:', error);
    return null;
  }
};

/**
 * Check if the user's memory should be refreshed.
 * Returns true if stale or enough new events have accumulated.
 */
export const shouldRefreshMemory = async (existingMemory) => {
  // No memory yet — analyze if we have events
  if (!existingMemory) {
    const count = await getEventCountSinceAnalysis();
    return count >= 3; // Need at least 3 events for first analysis
  }

  // Check if stale
  if (existingMemory.last_analyzed_at) {
    const lastAnalyzed = new Date(existingMemory.last_analyzed_at);
    const hoursSince = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    if (hoursSince >= STALE_HOURS) return true;
  }

  // Check if enough new events
  const newEventCount = await getEventCountSinceAnalysis();
  return newEventCount >= ANALYSIS_THRESHOLD;
};

/**
 * Clear the user's memory profile.
 */
export const clearUserMemory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_memory').delete().eq('user_id', user.id);
    await supabase.from('user_events').delete().eq('user_id', user.id);
  } catch (error) {
    console.error('Error clearing user memory:', error);
  }
};
