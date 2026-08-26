/**
 * User event tracking system.
 * Tracks searches, product views, cart actions, category browsing, and purchases.
 * Events are batched and sent to Supabase in the background.
 */

import { supabase } from './supabase';

// Event types
export const EVENT_TYPES = {
  SEARCH: 'search',
  PRODUCT_VIEW: 'product_view',
  CART_ADD: 'cart_add',
  CART_REMOVE: 'cart_remove',
  CATEGORY_BROWSE: 'category_browse',
  PURCHASE: 'purchase',
};

// In-memory event queue for batching
let eventQueue = [];
let flushTimer = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 20;

/**
 * Get the current user ID from Supabase auth.
 * Returns null if not authenticated.
 */
const getUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Queue an event to be sent to Supabase.
 * Events are batched for performance.
 */
export const trackEvent = async (eventType, eventData = {}) => {
  const userId = await getUserId();
  if (!userId) return; // Don't track anonymous users

  eventQueue.push({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
  });

  // Flush if batch is full
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
    return;
  }

  // Set up debounced flush
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
};

/**
 * Flush all queued events to Supabase.
 */
export const flushEvents = async () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  try {
    const { error } = await supabase.from('user_events').insert(batch);
    if (error) {
      console.error('Error flushing events:', error.message);
      // Re-queue failed events (but don't grow indefinitely)
      if (eventQueue.length < 100) {
        eventQueue = [...batch, ...eventQueue];
      }
    }
  } catch (error) {
    console.error('Error flushing events:', error);
  }
};

// Convenience tracking functions

export const trackSearch = (query, resultsCount) => {
  if (!query?.trim()) return;
  trackEvent(EVENT_TYPES.SEARCH, {
    query: query.trim().toLowerCase(),
    results_count: resultsCount,
  });
};

export const trackProductView = (product, durationMs = 0) => {
  if (!product?.id) return;
  trackEvent(EVENT_TYPES.PRODUCT_VIEW, {
    product_id: product.id,
    product_name: product.name,
    category_id: product.category_id,
    price: product.price,
    store_name: product.store?.name,
    duration_ms: durationMs,
  });
};

export const trackCartAdd = (product, quantity) => {
  if (!product?.id) return;
  trackEvent(EVENT_TYPES.CART_ADD, {
    product_id: product.id,
    product_name: product.name,
    category_id: product.category_id,
    price: product.price,
    quantity,
  });
};

export const trackCartRemove = (product) => {
  if (!product?.id) return;
  trackEvent(EVENT_TYPES.CART_REMOVE, {
    product_id: product.id,
    product_name: product.name,
    category_id: product.category_id,
  });
};

export const trackCategoryBrowse = (category) => {
  if (!category?.id) return;
  trackEvent(EVENT_TYPES.CATEGORY_BROWSE, {
    category_id: category.id,
    category_name: category.name,
  });
};

export const trackPurchase = (orderId, items, total) => {
  trackEvent(EVENT_TYPES.PURCHASE, {
    order_id: orderId,
    item_count: items.length,
    total,
  });
};

/**
 * Get the count of events since last memory analysis.
 */
export const getEventCountSinceAnalysis = async () => {
  const userId = await getUserId();
  if (!userId) return 0;

  try {
    // Get last analysis timestamp
    const { data: memory } = await supabase
      .from('user_memory')
      .select('last_analyzed_at')
      .eq('user_id', userId)
      .single();

    let query = supabase
      .from('user_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (memory?.last_analyzed_at) {
      query = query.gt('created_at', memory.last_analyzed_at);
    }

    const { count } = await query;
    return count || 0;
  } catch {
    return 0;
  }
};
