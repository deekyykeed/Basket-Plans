import React, { useMemo, useState, forwardRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PlusIcon, MinusIcon, CloseIcon } from '../lib/icons';
import SimpleSheet from './SimpleSheet';

const ProductDetailsSheet = forwardRef(({ product, onAddToBasket, onClose }, ref) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleQuantityChange = (change) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newQuantity = Math.max(1, quantity + change);
    setQuantity(newQuantity);
  };

  const handleAddToBasket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Add product with specified quantity
    for (let i = 0; i < quantity; i++) {
      onAddToBasket(product);
    }
    setQuantity(1); // Reset quantity
    ref.current?.close();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity(1); // Reset quantity
    onClose();
  };

  return (
    <SimpleSheet ref={ref} onClose={handleClose}>
      <View style={styles.contentContainer}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <CloseIcon size={24} color="#000" strokeWidth={2} />
        </TouchableOpacity>

        {/* Product Image */}
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>

          {product.store?.name && (
            <Text style={styles.storeLabel}>by {product.store.name}</Text>
          )}

          {product.quantity_label && (
            <Text style={styles.quantityLabel}>{product.quantity_label}</Text>
          )}

          <Text style={styles.productPrice}>
            ${parseFloat(product.price).toFixed(2)}
          </Text>

          {(product.ai_description || product.description) && (
            <Text style={styles.productDescription}>
              {product.ai_description || product.description}
            </Text>
          )}

          {product.stock_quantity && (
            <Text style={styles.stockInfo}>
              {product.stock_quantity} in stock
            </Text>
          )}
        </View>

        {/* Quantity Controls */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <MinusIcon
                size={20}
                color={quantity <= 1 ? '#ccc' : '#000'}
                strokeWidth={2}
              />
            </TouchableOpacity>

            <Text style={styles.quantityValue}>{quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(1)}
            >
              <PlusIcon size={20} color="#000" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add to Basket Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToBasket}
        >
          <Text style={styles.addButtonText}>
            Add to Basket • ${(parseFloat(product.price) * quantity).toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </SimpleSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#f0ede7',
    borderRadius: 20,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  productInfo: {
    marginBottom: 24,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 8,
  },
  storeLabel: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#d97655',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  stockInfo: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#999',
  },
  quantityContainer: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0ede7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 24,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    minWidth: 40,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
});

export default ProductDetailsSheet;
