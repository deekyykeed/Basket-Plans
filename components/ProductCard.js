import React, { useMemo, useState } from 'react';
import { Image, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getBundleSize } from '../lib/basketUtils';
import { PlusIcon } from '../lib/icons';

const ProductCard = ({ product, onPress, onLongPress, basketQuantity = 0 }) => {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const priceNumber = Number(product?.price ?? 0);
  const safePrice = Number.isFinite(priceNumber) ? priceNumber : 0;

  const bundleSize = getBundleSize(product);

  const isInBasket = basketQuantity > 0;

  const numberOfPacks = isInBasket ? basketQuantity / bundleSize : 1;
  const displayPrice = safePrice * numberOfPacks;
  const price = displayPrice.toFixed(1);
  const [whole, decimals] = price.split('.');

  const showQuantityLabel = isInBasket || bundleSize > 1;
  const quantityToShow = isInBasket ? basketQuantity : bundleSize;

  // Stable pseudo-random percentage from product ID
  const randomPercentage = useMemo(() => {
    const idString = product.id ? String(product.id) : String(Math.random());
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
      hash = ((hash << 5) - hash) + idString.charCodeAt(i);
      hash = hash & hash;
    }
    const random = Math.abs(hash % 10000) / 10000;
    const percentage = 0.5 + (random * (1.2 - 0.5));
    return `+${percentage.toFixed(1)}%`;
  }, [product.id]);

  const handleAddPress = (e) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {product.image_url && !imageError ? (
          <Image
            source={{
              uri: encodeURI(product.image_url).replace(/%20/g, '%20'),
            }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
            onLoadStart={() => setImageError(false)}
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}
        <Text style={styles.discountLabel}>{randomPercentage}</Text>

        {/* Add button */}
        <TouchableOpacity
          style={[styles.addButton, isInBasket && styles.addButtonActive]}
          onPress={handleAddPress}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isInBasket ? (
            <Text style={styles.addButtonQty}>{quantityToShow}</Text>
          ) : (
            <PlusIcon size={16} color="#fff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      {/* Info: store > name > price */}
      <View style={styles.infoContainer}>
        {product.store?.name && (
          <Text style={styles.storeName} numberOfLines={1}>
            {product.store.name}
          </Text>
        )}
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.productPrice, isInBasket && styles.priceInBasket]}>
            {whole}.<Text>{decimals}</Text>
          </Text>
          {showQuantityLabel && (
            <Text style={[styles.quantityLabel, isInBasket && styles.quantityInBasket]}>
              x{quantityToShow}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: '100%',
    flexDirection: 'column',
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  discountLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 12,
    fontFamily: 'Fortnite',
    color: '#16a34a',
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonActive: {
    backgroundColor: '#D97655',
  },
  addButtonQty: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
  infoContainer: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 1,
  },
  storeName: {
    fontSize: 10,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#999',
  },
  productName: {
    fontSize: 13,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#000',
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Fortnite',
    color: '#000',
  },
  priceInBasket: {
    color: '#D97655',
  },
  quantityLabel: {
    fontSize: 14,
    fontFamily: 'Fortnite',
    color: 'rgba(0, 0, 0, 0.4)',
  },
  quantityInBasket: {
    color: '#D97655',
  },
  placeholderImage: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
});

export default ProductCard;
