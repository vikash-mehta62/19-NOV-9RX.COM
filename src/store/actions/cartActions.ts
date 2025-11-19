import { CartItem, addToCart as addToCartAction, removeFromCart as removeFromCartAction, updateQuantity as updateQuantityAction, clearCart as clearCartAction,updatePrice ,updateDescription as updateDescriptionAction} from '../types/cartTypes';

export const addToCart = (item: CartItem) => addToCartAction(item);

export const removeFromCart = (productId: string) => removeFromCartAction(productId);

export const updateQuantity = (productId: string, quantity: number,sizeId: string) => 
  updateQuantityAction({ productId, quantity, sizeId});


export const updateCartPrice = (productId: string, sizeId: string, price: number) => 
  updatePrice({ productId, sizeId, price });

export const updateCartDescription = (productId: string, description: string) =>
  updateDescriptionAction({ productId, description });

export const clearCart = () => clearCartAction();