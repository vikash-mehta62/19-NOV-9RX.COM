import { OrderFormValues } from "../schemas/orderSchema";

interface OrderItemsListProps {
  items: OrderFormValues["items"];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  console.log(items);
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Order Items</h3>
      <div className="space-y-4">
        {items?.map((item, index) => (
          <div key={index} className="border p-4 rounded shadow">
            <p className="font-medium">🛒 Product: {item.name}</p>
            <p>
                      <strong>Customizations:</strong> {item.customizations?.availble ==="yes" ? "Yes" : "No"}
                    </p>
            {/* <p className="font-medium"> Order ID: {item.id}</p> */}

            {/* Agar item ke andar sizes available hai toh */}
            {item?.sizes && item?.sizes.length > 0 ? (
              <div className="mt-2 space-y-2">
                {item.sizes.map((size, sizeIndex) => (
                  <div
                    key={sizeIndex}
                    className="border p-2 rounded bg-gray-100"
                  >
                    <p>
                      <strong>Size:</strong> {size.size_value} {size.size_unit}
                    </p>
                    <p>
                      <strong>Quantity:</strong> {size.quantity} {size.type === "unit" ? "unit" : ""}
                    </p>
                 
                    <p>
                      <strong>Price per Unit:</strong> ${size.price.toFixed(2)}
                    </p>
                    <p>
                      <strong>Total:</strong> $
                      {(size.quantity * size.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No sizes available</p>
            )}

            {item.notes && (
              <p className="text-gray-600 italic">📝 Notes: {item.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
