import { useCart } from "@/hooks/use-cart";
import { useDispatch } from "react-redux";
import { updateCartPrice } from "@/store/actions/cartActions";
import React from "react";

function CartItemsPricing() {
  const { cartItems } = useCart();
  const dispatch = useDispatch();

  const handlePriceChange = (productId: string, sizeId: string, newPrice: number) => {
    dispatch(updateCartPrice(productId, sizeId, newPrice));
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">🛒 Cart Pricing</h2>

      {cartItems.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No items in cart.</p>
      ) : (
        cartItems.map((item) => (
          <div key={item.productId} className="mb-3 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-md font-medium text-gray-900">{item.name}</h3>

            {item.sizes.map((size) => (
              <div key={size.id} className="flex justify-between items-center mt-2 text-sm bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-300">
                <p className="text-gray-700 font-medium">{size.size_value} {size.size_unit}</p>
                <input
                  type="number"
                  value={size.price}
                  onChange={(e) => handlePriceChange(item.productId, size.id, parseFloat(e.target.value))}
                  className="border border-gray-400 rounded-md px-2 py-1 w-20 text-right text-sm focus:ring focus:ring-blue-200 transition"
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default CartItemsPricing;
