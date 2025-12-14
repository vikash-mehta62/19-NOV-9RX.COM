// Debug utilities for cart troubleshooting

export const debugCart = () => {
  console.log('=== CART DEBUG ===');
  
  // Check localStorage
  const cartItems = localStorage.getItem('cartItems');
  console.log('localStorage cartItems:', cartItems);
  
  if (cartItems) {
    try {
      const parsed = JSON.parse(cartItems);
      console.log('Parsed cart items:', parsed);
      console.log('Cart items count:', parsed.length);
    } catch (error) {
      console.error('Error parsing cart items:', error);
    }
  }
  
  // Check Redux store (if available)
  const reduxState = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
  if (reduxState) {
    console.log('Redux DevTools available');
  }
  
  console.log('=== END CART DEBUG ===');
};

export const clearCartDebug = () => {
  localStorage.removeItem('cartItems');
  console.log('Cart cleared from localStorage');
};

export const addTestCartItem = () => {
  const testItem = {
    productId: 'test-123',
    name: 'Test Product',
    price: 10.99,
    quantity: 1,
    image: '/placeholder.svg',
    sizes: [{
      id: 'size-1',
      size_value: '10',
      size_unit: 'ml',
      quantity: 1,
      price: 10.99
    }],
    customizations: {},
    notes: '',
    shipping_cost: 5.00
  };
  
  const existingItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
  existingItems.push(testItem);
  localStorage.setItem('cartItems', JSON.stringify(existingItems));
  
  console.log('Test item added to cart');
  window.location.reload();
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).debugCart = debugCart;
  (window as any).clearCartDebug = clearCartDebug;
  (window as any).addTestCartItem = addTestCartItem;
}