import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState, store } from '@/store/store';
import { addToCart as addToCartAction, removeFromCart as removeFromCartAction, updateQuantity as updateQuantityAction, clearCart as clearCartAction, updateCartDescription as updateDescriptionAction,} from '@/store/actions/cartActions';
import { CartItem } from '@/store/types/cartTypes';
import { assertCartStock } from '@/services/stockValidationService';

export const useCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
const lastActionAt = useSelector((state: RootState) => state.cart.lastActionAt);

  const getCurrentCartItems = () => store.getState().cart.items;

  const buildNextCartItemsForAdd = (currentItems: CartItem[], item: CartItem) => {
    const existingItem = currentItems.find((currentItem) => currentItem.productId === item.productId);

    if (!existingItem) {
      return [...currentItems, item];
    }

    return currentItems.map((currentItem) => {
      if (currentItem.productId !== item.productId) {
        return currentItem;
      }

      const nextSizes = (currentItem.sizes || []).map((size) => ({ ...size }));
      for (const incomingSize of item.sizes || []) {
        const matchingSize = nextSizes.find(
          (size: { id?: string; type?: string; quantity?: number }) =>
            size.id === incomingSize.id && size.type === incomingSize.type
        );

        if (matchingSize) {
          matchingSize.quantity = Number(matchingSize.quantity || 0) + Number(incomingSize.quantity || 0);
        } else {
          nextSizes.push({ ...incomingSize });
        }
      }

      return {
        ...currentItem,
        sizes: nextSizes,
      };
    });
  };

  const addToCart = async (item: CartItem) => {
    try {
      if (Array.isArray(item?.sizes) && item.sizes.length > 0) {
        await assertCartStock(buildNextCartItemsForAdd(getCurrentCartItems(), item));
      }
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
      const nextCartItems = getCurrentCartItems().map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        return {
          ...item,
          sizes: (item.sizes || []).map((size: { id?: string; quantity?: number }) =>
            size.id === sizeId ? { ...size, quantity } : size
          ),
        };
      });
      await assertCartStock(nextCartItems);
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
    lastActionAt,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateDescription,
    debugCart
  };
};
