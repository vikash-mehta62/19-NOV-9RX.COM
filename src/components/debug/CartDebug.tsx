import { useCart } from "@/hooks/use-cart";

export const CartDebug = () => {
  const { cartItems, totalItems, cartTotal, debugCart } = useCart();

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
      <h3 className="font-bold mb-2">Cart Debug Info</h3>
      <p>Cart Items: {cartItems.length}</p>
      <p>Total Items: {totalItems}</p>
      <p>Cart Total: ${cartTotal.toFixed(2)}</p>
      <button 
        onClick={debugCart}
        className="mt-2 bg-blue-500 px-2 py-1 rounded text-xs"
      >
        Log Cart
      </button>
      
      <div className="mt-2 max-h-32 overflow-y-auto">
        {cartItems.map((item, index) => (
          <div key={index} className="border-t border-gray-600 pt-1 mt-1">
            <p className="font-semibold">{item.name}</p>
            <p>Qty: {item.quantity}</p>
            <p>Price: ${item.price}</p>
            {item.sizes && (
              <div className="ml-2">
                <p className="text-yellow-300">Sizes:</p>
                {item.sizes.map((size: any, sIndex: number) => (
                  <p key={sIndex} className="ml-2">
                    {size.size_value}{size.size_unit}: {size.quantity}x ${size.price}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};