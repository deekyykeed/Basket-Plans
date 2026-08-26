import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { filterProducts } from '../lib/basketUtils';
import { useBasket } from '../context/BasketContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import ProductDetailsSheet from '../components/ProductDetailsSheet';
import Basket from '../components/Basket';
import * as Haptics from 'expo-haptics';
import { trackSearch, trackProductView, trackCategoryBrowse, flushEvents } from '../lib/events';
import { aiSearch } from '../lib/search';
import { useMemory } from '../context/MemoryContext';

const HomeScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const bottomSheetRef = useRef(null);
  const searchTimerRef = useRef(null);
  const productViewTimerRef = useRef(null);
  const { theme } = useTheme();
  const { user } = useAuth();
  const { memory } = useMemory();
  const insets = useSafeAreaInsets();

  const { basketProducts, addToBasket, decreaseQuantity, removeFromBasket, total } = useBasket();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(name, slug)')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error.message);
        setProducts([]);
        throw error;
      }
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(
    () => aiSearchResults || filterProducts(products, searchQuery, activeCategory),
    [products, searchQuery, activeCategory, aiSearchResults]
  );

  // Debounced search tracking + AI search
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);

    // Clear any pending search timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!query?.trim()) {
      setAiSearchResults(null);
      setIsAiSearch(false);
      return;
    }

    // Debounce: track and run AI search after 800ms of no typing
    searchTimerRef.current = setTimeout(async () => {
      const results = filterProducts(products, query, activeCategory);
      trackSearch(query, results.length);

      // If query looks natural language (3+ words), trigger AI search
      const wordCount = query.trim().split(/\s+/).length;
      if (wordCount >= 3 && user && memory) {
        setAiSearchLoading(true);
        setIsAiSearch(true);
        try {
          const aiResults = await aiSearch(query, products, memory);
          if (aiResults) {
            setAiSearchResults(aiResults.products);
          }
        } catch (err) {
          console.error('AI search error:', err);
        } finally {
          setAiSearchLoading(false);
        }
      } else {
        setAiSearchResults(null);
        setIsAiSearch(false);
      }
    }, 800);
  }, [products, activeCategory, user, memory]);

  // Track category browsing
  const handleCategoryPress = useCallback((categoryId) => {
    setActiveCategory((prev) => {
      const newCategory = prev === categoryId ? null : categoryId;
      if (newCategory) {
        trackCategoryBrowse({ id: newCategory, name: categoryId });
      }
      return newCategory;
    });
    setAiSearchResults(null);
    setIsAiSearch(false);
  }, []);

  // Flush events when app goes to background
  useEffect(() => {
    return () => flushEvents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchProducts();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleProductLongPress = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedProduct(product);
    productViewTimerRef.current = Date.now();
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleProductDetailClose = () => {
    if (selectedProduct && productViewTimerRef.current) {
      const duration = Date.now() - productViewTimerRef.current;
      trackProductView(selectedProduct, duration);
      productViewTimerRef.current = null;
    }
    setSelectedProduct(null);
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={handleSearchChange}
              totalPrice={total}
              isAiSearch={isAiSearch}
              aiSearchLoading={aiSearchLoading}
            />
          </View>
          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryPress={handleCategoryPress}
          />
        </View>

        {/* Product Grid */}
        <View style={[styles.body, { backgroundColor: theme.surface }]}>
          <ProductGrid
            theme={theme}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            products={filteredProducts}
            searchQuery={searchQuery}
            onClearSearch={() => { setSearchQuery(''); setAiSearchResults(null); setIsAiSearch(false); }}
            onAddToBasket={addToBasket}
            onProductLongPress={handleProductLongPress}
            basketProducts={basketProducts}
            sectionTitle="Fresh Finds"
          />
        </View>

        {/* Floating Basket */}
        <Basket
          theme={theme}
          basketProducts={basketProducts}
          onDecreaseQuantity={decreaseQuantity}
          onRemoveFromBasket={removeFromBasket}
          totalPrice={total}
        />
      </View>

      {/* Product Details Sheet */}
      <ProductDetailsSheet
        ref={bottomSheetRef}
        product={selectedProduct}
        onAddToBasket={addToBasket}
        onClose={handleProductDetailClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 1,
    gap: 14,
    borderBottomWidth: 2,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
});

export default HomeScreen;
