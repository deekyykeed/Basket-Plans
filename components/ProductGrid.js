import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import ProductCard from './ProductCard';

const ProductGrid = ({
  theme,
  loading,
  refreshing,
  onRefresh,
  products,
  searchQuery,
  onClearSearch,
  onAddToBasket,
  onProductLongPress,
  basketProducts = [],
  sectionTitle,
}) => {
  // Helper to get basket quantity for a product
  const getBasketQuantity = (productId) => {
    const basketItem = basketProducts.find(p => p.id === productId);
    return basketItem ? basketItem.quantity : 0;
  };

  // Section header component
  const renderHeader = () => {
    if (!sectionTitle) return null;
    return (
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      </View>
    );
  };
  const renderEmpty = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? 'No products found' : 'No products available'}
      </Text>
      <Text style={styles.emptyMessage}>
        {searchQuery ? `Try searching for something else` : 'Check back later for new products'}
      </Text>
      {searchQuery && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClearSearch();
          }}
        >
          <Text style={styles.clearSearchText}>Clear search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={products && products.length > 0 ? styles.columnWrapper : undefined}
        data={products || []}
        numColumns={3}
        keyExtractor={(item, index) => (item?.id ? String(item.id) : `product-${index}`)}
        renderItem={({ item, index }) => (
          <View style={styles.productCardWrapper}>
            <ProductCard
              product={item}
              theme={theme}
              index={index}
              onPress={() => onAddToBasket(item)}
              onLongPress={() => onProductLongPress(item)}
              basketQuantity={getBasketQuantity(item.id)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 0,
    margin: 0,
  },
  columnWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  productCardWrapper: {
    width: '33.33%',
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
  },
  emptyContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  clearSearchText: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
  sectionTitleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 14,
    paddingRight: 14,
    paddingLeft: 14,
    overflow: 'hidden',
    alignContent: 'center',
    flexWrap: 'nowrap',
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontWeight: '500',
    fontStyle: 'normal',
    fontFamily: 'FamiljenGrotesk-Medium',
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 20 * 1.2,
  },
});

export default ProductGrid;