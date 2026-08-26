import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  addProductToBasket,
  decreaseProductQuantity,
  removeProduct,
  calculateTotal,
} from '../lib/basketUtils';
import { trackCartAdd, trackCartRemove } from '../lib/events';

const BASKET_STORAGE_KEY = '@basket_products';

const BasketContext = createContext(null);

export const BasketProvider = ({ children }) => {
  const [basketProducts, setBasketProducts] = useState([]);

  // Load basket from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(BASKET_STORAGE_KEY);
        if (saved) {
          setBasketProducts(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading basket:', error);
      }
    };
    load();
  }, []);

  // Save basket whenever it changes
  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basketProducts));
      } catch (error) {
        console.error('Error saving basket:', error);
      }
    };
    save();
  }, [basketProducts]);

  const addToBasket = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBasketProducts(prev => {
      const next = addProductToBasket(prev, product);
      const item = next.find(p => p.id === product.id);
      trackCartAdd(product, item?.quantity || 1);
      return next;
    });
  };

  const decreaseQuantity = (productId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBasketProducts(prev => {
      const next = decreaseProductQuantity(prev, productId);
      const removed = !next.find(p => p.id === productId);
      if (removed) {
        const product = prev.find(p => p.id === productId);
        if (product) trackCartRemove(product);
      }
      return next;
    });
  };

  const removeFromBasket = (productId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const product = basketProducts.find(p => p.id === productId);
    if (product) trackCartRemove(product);
    setBasketProducts(prev => removeProduct(prev, productId));
  };

  const total = calculateTotal(basketProducts);

  return (
    <BasketContext.Provider
      value={{
        basketProducts,
        addToBasket,
        decreaseQuantity,
        removeFromBasket,
        total,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
};
