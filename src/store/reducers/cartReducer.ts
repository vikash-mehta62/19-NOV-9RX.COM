import { createReducer } from '@reduxjs/toolkit';
import {
  CartState,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  updatePrice,
  updateDescription
} from '../types/cartTypes';

/* -------------------------------------------------
   Safe localStorage helpers
------------------------------------------------- */
const getInitialCartItems = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const items = JSON.parse(localStorage.getItem('cartItems') || '[]');

    // migrate legacy sizes
    const migrated = items
      .map((item: any) => {
        if (Array.isArray(item.sizes) && item.sizes.length > 0) return item;
        if (item.sizeId || item.sizeValue) {
          return {
            ...item,
            sizes: [
              {
                id: item.sizeId || `${item.productId}-legacy`,
                size_value: item.sizeValue || '',
                size_unit: item.sizeUnit || '',
                price: item.price || 0,
                quantity: item.quantity || 1,
                type: item.type || 'unit',
              },
            ],
          };
        }
        return { ...item, sizes: [] };
      })
      .filter((item: any) => item.sizes.length > 0);

    if (JSON.stringify(items) !== JSON.stringify(migrated)) {
      localStorage.setItem('cartItems', JSON.stringify(migrated));
    }

    return migrated;
  } catch (err) {
    console.error('Cart parse error:', err);
    return [];
  }
};

const saveCartToStorage = (items: any[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cartItems', JSON.stringify(items));
  } catch (err) {
    console.error('Cart save error:', err);
  }
};

const getInitialLastActionAt = (hasItems: boolean): string | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('cartLastActionAt');
  if (stored) return stored;
  // If we have items but no timestamp, treat it as a fresh action to force sync
  return hasItems ? new Date().toISOString() : null;
};

/* -------------------------------------------------
   Initial State
------------------------------------------------- */
const initialItems = getInitialCartItems();
const initialState: CartState = {
  items: initialItems,
  lastActionAt: getInitialLastActionAt(initialItems.length > 0),
};

/* -------------------------------------------------
   Activity marker
------------------------------------------------- */
const markActivity = (state: CartState) => {
  const now = new Date().toISOString();
  state.lastActionAt = now;
  if (typeof window !== 'undefined') {
    localStorage.setItem('cartLastActionAt', now);
  }
};

/* -------------------------------------------------
   Reducer
------------------------------------------------- */
export const cartReducer = createReducer(initialState, (builder) => {
  builder

    /* ---------- ADD TO CART ---------- */
    .addCase(addToCart, (state, action) => {
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId
      );

      if (existing) {
        existing.sizes ||= [];
        action.payload.sizes?.forEach((newSize: any) => {
          const found = existing.sizes.find(
            (s: any) => s.id === newSize.id && s.type === newSize.type
          );
          if (found) found.quantity += newSize.quantity;
          else existing.sizes.push(newSize);
        });
        existing.quantity = existing.sizes.reduce(
          (t: number, s: any) => t + (s.quantity || 0),
          0
        );
        existing.price = existing.sizes.reduce(
          (t: number, s: any) => t + (s.quantity || 0) * (s.price || 0),
          0
        );
      } else {
        state.items.push({ ...action.payload, sizes: action.payload.sizes || [] });
      }

      saveCartToStorage(state.items);
      markActivity(state);
    })

    /* ---------- REMOVE ---------- */
    .addCase(removeFromCart, (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      saveCartToStorage(state.items);
      markActivity(state);
    })

    /* ---------- UPDATE QTY ---------- */
    .addCase(updateQuantity, (state, action) => {
      const { productId, sizeId, quantity } = action.payload;
      const product = state.items.find((i) => i.productId === productId);
      if (product?.sizes) {
        const size = product.sizes.find((s: any) => s.id === sizeId);
        if (size) size.quantity = +quantity;
        product.quantity = product.sizes.reduce((t: number, s: any) => t + (s.quantity || 0), 0);
        product.price = product.sizes.reduce(
          (t: number, s: any) => t + (s.quantity || 0) * (s.price || 0),
          0
        );
      }
      saveCartToStorage(state.items);
      markActivity(state);
    })

    /* ---------- UPDATE PRICE ---------- */
    .addCase(updatePrice, (state, action) => {
      const { productId, sizeId, price } = action.payload;
      const product = state.items.find((i) => i.productId === productId);
      if (product?.sizes) {
        const size = product.sizes.find((s: any) => s.id === sizeId);
        if (size) size.price = price;
        product.price = product.sizes.reduce(
          (t: number, s: any) => t + (s.quantity || 0) * (s.price || 0),
          0
        );
      }
      saveCartToStorage(state.items);
      markActivity(state);
    })

    /* ---------- UPDATE DESCRIPTION ---------- */
    .addCase(updateDescription, (state, action) => {
      const { productId, description } = action.payload;
      const product = state.items.find((i) => i.productId === productId);
      if (product) product.description = description;
      saveCartToStorage(state.items);
      markActivity(state);
    })

    /* ---------- CLEAR CART ---------- */
    .addCase(clearCart, (state) => {
      state.items = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cartItems');
      }
      markActivity(state);
    });
});
