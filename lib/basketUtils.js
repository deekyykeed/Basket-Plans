/**
 * Pure business logic for basket operations.
 * No React dependencies — easily testable.
 */

// Get bundle size from a product (e.g., 6 for a 6-pack of eggs)
export const getBundleSize = (product) => {
  if (product.bundleSize && typeof product.bundleSize === 'number') {
    return product.bundleSize;
  }
  if (product.quantity_label) {
    const match = product.quantity_label.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  return 1;
};

// Add a product to the basket, returning the new basket array
export const addProductToBasket = (basket, product) => {
  const bundleSize = getBundleSize(product);
  const existingIndex = basket.findIndex(p => p.id === product.id);

  if (existingIndex !== -1) {
    const updated = [...basket];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: (updated[existingIndex].quantity || bundleSize) + bundleSize,
    };
    return updated;
  }

  return [...basket, { ...product, quantity: bundleSize, bundleSize }];
};

// Decrease quantity by bundle size, or remove if at minimum
export const decreaseProductQuantity = (basket, productId) => {
  const existingIndex = basket.findIndex(p => p.id === productId);
  if (existingIndex === -1) return basket;

  const product = basket[existingIndex];
  const bundleSize = getBundleSize(product);

  if (product.quantity > bundleSize) {
    const updated = [...basket];
    updated[existingIndex] = {
      ...product,
      quantity: product.quantity - bundleSize,
    };
    return updated;
  }

  // Remove the product
  return basket.filter(p => p.id !== productId);
};

// Remove a product entirely
export const removeProduct = (basket, productId) => {
  return basket.filter(p => p.id !== productId);
};

// Calculate the total price of the basket
export const calculateTotal = (basket) => {
  return (basket || []).reduce((total, product) => {
    return total + (parseFloat(product.price) * product.quantity);
  }, 0);
};

// Filter products by search query and/or category
export const filterProducts = (products, searchQuery, activeCategory) => {
  const productList = Array.isArray(products) ? products : [];
  return productList.filter(product => {
    if (activeCategory && product.category_id !== activeCategory) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
    }
    return true;
  });
};

// Format price for display (e.g., 1500 -> "1.5k")
export const formatPrice = (price) => {
  if (price >= 1000) {
    return (price / 1000).toFixed(1) + 'k';
  }
  return price.toFixed(1);
};
