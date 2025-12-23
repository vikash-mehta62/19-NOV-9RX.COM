import { createReducer } from '@reduxjs/toolkit';
import { CartState, addToCart, removeFromCart, updateQuantity, clearCart, updatePrice,updateDescription } from '../types/cartTypes';

// Safe localStorage access for SSR
const getInitialCartItems = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const items = JSON.parse(localStorage.getItem("cartItems") || "[]");
    
    // Migrate legacy cart items that don't have sizes array
    const migratedItems = items.map((item: any) => {
      // If item already has sizes array, return as is
      if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
        return item;
      }
      
      // Legacy format: convert sizeId, sizeValue, sizeUnit to sizes array
      if (item.sizeId || item.sizeValue) {
        return {
          ...item,
          sizes: [{
            id: item.sizeId || `${item.productId}-legacy`,
            size_value: item.sizeValue || '',
            size_unit: item.sizeUnit || '',
            price: item.price || 0,
            quantity: item.quantity || 1,
            type: item.type || 'unit',
          }],
        };
      }
      
      // If no size info at all, create empty sizes array
      return {
        ...item,
        sizes: [],
      };
    }).filter((item: any) => item.sizes && item.sizes.length > 0);
    
    // Save migrated items back to localStorage
    if (JSON.stringify(items) !== JSON.stringify(migratedItems)) {
      localStorage.setItem("cartItems", JSON.stringify(migratedItems));
    }
    
    return migratedItems;
  } catch (error) {
    console.error('Error parsing cart items from localStorage:', error);
    return [];
  }
};

// Safe localStorage save
const saveCartToStorage = (items: any[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem("cartItems", JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }
};

const initialState: CartState = {
  items: getInitialCartItems(),
};


export const cartReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(addToCart, (state, action) => {
      const existingItem = state.items.find(item => item.productId === action.payload.productId);
      
      if (existingItem) {
        // Ensure sizes array exists
        if (!existingItem.sizes || !Array.isArray(existingItem.sizes)) {
          existingItem.sizes = [];
        }
        
        // Check if this specific size AND type already exists
        const newSizes = action.payload.sizes || [];
        newSizes.forEach(newSize => {
          // Find by both id AND type to differentiate unit vs case
          const existingSize = existingItem.sizes.find(
            size => size.id === newSize.id && size.type === newSize.type
          );
          if (existingSize) {
            // Size with same type already exists, increase quantity
            existingSize.quantity += newSize.quantity;
          } else {
            // New size or different type, add to sizes array
            existingItem.sizes.push(newSize);
          }
        });
        
        // Recalculate total quantity and price
        existingItem.quantity = existingItem.sizes.reduce((total, size) => total + (size.quantity || 0), 0);
        existingItem.price = existingItem.sizes.reduce((total, size) => total + ((size.quantity || 0) * (size.price || 0)), 0);
      } else {
        // New product, ensure sizes array exists
        const newItem = {
          ...action.payload,
          sizes: action.payload.sizes || [],
        };
        state.items.push(newItem);
      }
      saveCartToStorage(state.items);
    })
    .addCase(removeFromCart, (state, action) => {
      state.items = state.items.filter(item => item.productId !== action.payload);
      saveCartToStorage(state.items);
    })
    .addCase(updateQuantity, (state, action) => {
      const { productId, sizeId, quantity } = action.payload;
      const product = state.items.find((item) => item.productId === productId);
      if (product && product.sizes && Array.isArray(product.sizes)) {
        // Find size by id
        const size = product.sizes.find((size) => size.id === sizeId);
        if (size) {
          size.quantity = +quantity;
        }
        // ✅ Recalculate product price based on all sizes
        product.price = product.sizes.reduce((total, size) => total + ((size.quantity || 0) * (size.price || 0)), 0);
        // ✅ Recalculate total quantity
        product.quantity = product.sizes.reduce((total, size) => total + (size.quantity || 0), 0);
      }
      saveCartToStorage(state.items);
    })
    .addCase(clearCart, (state) => {
      state.items = [];
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem("cartItems");
        } catch (error) {
          console.error('Error removing cart from localStorage:', error);
        }
      }
    })
    .addCase(updatePrice, (state, action) => {
      const { productId, sizeId, price } = action.payload;
      const product = state.items.find((item) => item.productId === productId);
      if (product && product.sizes && Array.isArray(product.sizes)) {
        const size = product.sizes.find((size) => size.id === sizeId);
        if (size) {
          size.price = price;
        }
        product.price = product.sizes.reduce((total, size) => total + ((size.quantity || 0) * (size.price || 0)), 0);
      }
      saveCartToStorage(state.items);
    })
    .addCase(updateDescription, (state, action) => {
  const { productId, description } = action.payload;
  const product = state.items.find(item => item.productId === productId);
  if (product) {
    product.description = description;
  }
  saveCartToStorage(state.items);
})


});
