import { createReducer } from '@reduxjs/toolkit';
import { CartState, addToCart, removeFromCart, updateQuantity, clearCart, updatePrice,updateDescription } from '../types/cartTypes';

// Safe localStorage access for SSR
const getInitialCartItems = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem("cartItems") || "[]");
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
        // Check if this specific size already exists
        const newSizes = action.payload.sizes || [];
        newSizes.forEach(newSize => {
          const existingSize = existingItem.sizes.find(size => size.id === newSize.id);
          if (existingSize) {
            // Size already exists, increase quantity
            existingSize.quantity += newSize.quantity;
          } else {
            // New size, add to sizes array
            existingItem.sizes.push(newSize);
          }
        });
        
        // Recalculate total quantity and price
        existingItem.quantity = existingItem.sizes.reduce((total, size) => total + size.quantity, 0);
        existingItem.price = existingItem.sizes.reduce((total, size) => total + (size.quantity * size.price), 0);
      } else {
        // New product, add to cart
        state.items.push(action.payload);
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
      if (product) {
        const size = product.sizes.find((size) => size.id === sizeId);
        if (size) {
          size.quantity = +quantity;
        }
        // ✅ Recalculate product price based on all sizes
        product.price = product.sizes.reduce((total, size) => total + (size.quantity * size.price), 0);
        // ✅ Recalculate total quantity
        product.quantity = product.sizes.reduce((total, size) => total + size.quantity, 0);
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
      if (product) {
        const size = product.sizes.find((size) => size.id === sizeId);
        if (size) {
          size.price = price; // ✅ Size price update karo

        }
        product.price = product.sizes.reduce((total, size) => total + (size.quantity * size.price), 0);

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
