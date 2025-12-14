import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState } from '@/store/store';
import { addToCart as addToCartAction, removeFromCart as removeFromCartAction, updateQuantity as updateQuantityAction, clearCart as clearCartAction, updateCartDescription as updateDescriptionAction,} from '@/store/actions/cartActions';
import { CartItem } from '@/store/types/cartTypes';

export const useCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const addToCart = async (item: CartItem) => {
    try {
      dispatch(addToCartAction(item));
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      dispatch(removeFromCartAction(productId));
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  };

  const updateQuantity = async (productId: string, quantity: number,sizeId: string) => {
    try {
      if (quantity < 1) return false;
      dispatch(updateQuantityAction(productId, quantity,sizeId));
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  };

  const clearCart = async () => {
    try {
      dispatch(clearCartAction());
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  };
const updateDescription = async (productId: string, description: string) => {
  try {
    dispatch(updateDescriptionAction(productId, description));
    return true;
  } catch (error) {
    console.error("Error updating description:", error);
    return false;
  }
};

  // Calculate cart total with memoization for performance
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      // If item has sizes array, calculate total from all sizes
      if (item.sizes && Array.isArray(item.sizes)) {
        return total + item.sizes.reduce((sizeTotal, size) => {
          return sizeTotal + ((size.price || 0) * (size.quantity || 0));
        }, 0);
      }
      // Fallback to item price
      return total + (item.price || 0);
    }, 0);
  }, [cartItems]);

  // Calculate total items count with memoization (count all sizes)
  const totalItems = useMemo(() => {
    return cartItems.reduce((total, item) => {
      // If item has sizes array, count all size quantities
      if (item.sizes && Array.isArray(item.sizes)) {
        return total + item.sizes.reduce((sizeTotal, size) => {
          return sizeTotal + (size.quantity || 0);
        }, 0);
      }
      // Fallback to item quantity
      return total + (item.quantity || 0);
    }, 0);
  }, [cartItems]);

  // Debug function to log cart structure (remove in production)
  const debugCart = () => {
    console.log('Cart Items:', cartItems);
    console.log('Total Items:', totalItems);
    console.log('Cart Total:', cartTotal);
  };

  return {
    cartItems,
    cartTotal,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateDescription,
    debugCart
  };
};