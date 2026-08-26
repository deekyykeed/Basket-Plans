import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CheckmarkIcon, ExpandIcon } from '../lib/icons';

const Basket = ({
  theme,
  basketProducts,
  onDecreaseQuantity,
  onRemoveFromBasket,
  totalPrice,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.basket, isExpanded && styles.basketExpanded]}>
      {/* Basket Header */}
      <View style={styles.basketHeader}>
        <View style={styles.basketTitleContainer}>
          <Text style={styles.basketTitle}>Basket</Text>
          {Array.isArray(basketProducts) && basketProducts.length > 0 && (
            <View style={styles.savedIndicator}>
              <CheckmarkIcon size={14} color="#22c55e" strokeWidth={2} />
              <Text style={styles.savedText}>Saved for Friday</Text>
            </View>
          )}
        </View>
        <View style={styles.basketHeaderRight}>
          <Text style={styles.basketTotal}>${totalPrice.toFixed(2)}</Text>
          {Array.isArray(basketProducts) && basketProducts.length > 0 && (
            <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
              <ExpandIcon
                size={20}
                color="#000"
                strokeWidth={2}
                style={isExpanded && styles.expandIconRotated}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Basket Products or Empty State */}
      {Array.isArray(basketProducts) && basketProducts.length > 0 ? (
        isExpanded ? (
          // Grid layout when expanded
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.basketGridContainer}
          >
            <View style={styles.basketGrid}>
              {(basketProducts || []).map((product) => {
                if (!product || !product.id) return null;
                return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.basketGridCell}
                  onPress={() => onDecreaseQuantity(product.id)}
                  onLongPress={() => onRemoveFromBasket(product.id)}
                  delayLongPress={300}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.basketGridImage}
                    resizeMode="cover"
                  />
                  {product.quantity > 1 && (
                    <View style={styles.basketQuantityBadge}>
                      <Text style={styles.basketQuantityText}>{product.quantity}</Text>
                    </View>
                  )}
                  <View style={styles.basketGridInfo}>
                    <Text style={styles.basketGridName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.basketGridPrice}>
                      ${(parseFloat(product.price) * product.quantity).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
              })}
            </View>
          </ScrollView>
        ) : (
          // Horizontal scroll when collapsed
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.basketScrollContent}
          >
            {(basketProducts || []).map((product) => {
              if (!product || !product.id) return null;
              return (
              <TouchableOpacity
                key={product.id}
                style={styles.basketProductCell}
                onPress={() => onDecreaseQuantity(product.id)}
                onLongPress={() => onRemoveFromBasket(product.id)}
                delayLongPress={300}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: product.image_url }}
                  style={styles.basketProductImage}
                  resizeMode="cover"
                />
                {product.quantity > 1 && (
                  <View style={styles.basketQuantityBadge}>
                    <Text style={styles.basketQuantityText}>{product.quantity}</Text>
                  </View>
                )}
                <View style={styles.basketItemPrice}>
                  <Text style={styles.basketItemPriceText}>
                    ${(parseFloat(product.price) * product.quantity).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      ) : (
        <View style={styles.basketEmpty}>
          <Text style={styles.basketEmptyText}>Tap products to add to your basket</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  basket: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 25,
    zIndex: 1000,
  },
  basketExpanded: {
    top: 60,
    bottom: 14,
    height: 'auto',
  },
  basketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  basketTitleContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  basketTitle: {
    fontSize: 18,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
  },
  basketHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandButton: {
    padding: 4,
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: 11,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#22c55e',
  },
  basketTotal: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
  },
  basketScrollContent: {
    gap: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  basketProductCell: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9e6dc',
    overflow: 'hidden',
    position: 'relative',
  },
  basketProductImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  basketQuantityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  basketQuantityText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-Bold',
  },
  basketItemPrice: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  basketItemPriceText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'FamiljenGrotesk-Bold',
    textAlign: 'center',
  },
  basketEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketEmptyText: {
    fontSize: 13,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#999',
  },
  basketGridContainer: {
    paddingBottom: 12,
  },
  basketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  basketGridCell: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9e6dc',
    overflow: 'hidden',
    marginBottom: 8,
  },
  basketGridImage: {
    width: '100%',
    height: 120,
    borderRadius: 16,
  },
  basketGridInfo: {
    padding: 12,
    gap: 4,
  },
  basketGridName: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#000',
    lineHeight: 18,
  },
  basketGridPrice: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
  },
});

// Default props to ensure arrays are always defined
Basket.defaultProps = {
  basketProducts: [],
};

export default Basket;
