import { createAction } from "@reduxjs/toolkit";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  quantity: number;
  sizes: any[];
  customizations: Record<string, string>;
  notes: string;
  shipping_cost: number;
}

export interface CartState {
  items: CartItem[];
}

// Create typed action creators
export const updatePrice = createAction<{ productId: string; sizeId: string; price: number }>('cart/updatePrice');

export const addToCart = createAction<CartItem>("cart/addToCart");
export const removeFromCart = createAction<string>("cart/removeFromCart");
export const updateQuantity = createAction<{
  productId: string;
  quantity: number;
  sizeId: string;
}>("cart/updateQuantity");

export const updateDescription = createAction<{
  productId: string;
  description: string;
}>("cart/updateDescription");
export const clearCart = createAction("cart/clearCart");
