import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBasket } from '../context/BasketContext';
import { useTheme } from '../context/ThemeContext';

const OrdersScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { basketProducts, total } = useBasket();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14, backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Orders</Text>

      {basketProducts.length > 0 ? (
        <View style={styles.pendingOrder}>
          <Text style={[styles.pendingLabel, { color: theme.accent }]}>Current Basket</Text>
          <View style={[styles.orderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.orderItemCount, { color: theme.text }]}>
              {basketProducts.length} {basketProducts.length === 1 ? 'item' : 'items'}
            </Text>
            <Text style={[styles.orderTotal, { color: theme.text }]}>${total.toFixed(2)}</Text>
          </View>
          <View style={[styles.itemsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {basketProducts.map((product) => (
              <View key={product.id} style={styles.itemRow}>
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={[styles.itemQty, { color: theme.textSecondary }]}>x{product.quantity}</Text>
                <Text style={[styles.itemPrice, { color: theme.text }]}>
                  ${(parseFloat(product.price) * product.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.emptySection}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {user ? 'No past orders yet' : 'Sign in to see your orders'}
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
          {user
            ? 'Your order history will appear here after your first delivery.'
            : 'Create an account to track deliveries and reorder favorites.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'FamiljenGrotesk-Bold',
    marginBottom: 24,
  },
  pendingOrder: {
    marginBottom: 24,
  },
  pendingLabel: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  orderItemCount: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Medium',
  },
  orderTotal: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
  },
  itemsList: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
  },
  itemQty: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    width: 30,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    width: 60,
    textAlign: 'right',
  },
  emptySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    textAlign: 'center',
  },
});

export default OrdersScreen;
