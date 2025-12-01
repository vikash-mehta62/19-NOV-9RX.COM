import { OrderSummaryCard } from "./OrderSummaryCard";
import { CartItem } from "@/store/types/cartTypes";

/**
 * Demo component to showcase OrderSummaryCard in different states
 * This can be used for visual testing and development
 */
export const OrderSummaryCardDemo = () => {
  // Sample cart items for testing
  const sampleItems: CartItem[] = [
    {
      productId: "1",
      name: "Medical Vial - 10ml",
      price: 25.99,
      image: "/placeholder.svg",
      quantity: 2,
      sizes: [],
      customizations: {},
      notes: "",
      shipping_cost: 5.0,
    },
    {
      productId: "2",
      name: "Prescription Bottle - 30 count",
      price: 15.5,
      image: "/placeholder.svg",
      quantity: 5,
      sizes: [],
      customizations: {},
      notes: "",
      shipping_cost: 3.0,
    },
    {
      productId: "3",
      name: "Syringe Set - Sterile",
      price: 45.0,
      image: "/placeholder.svg",
      quantity: 1,
      sizes: [],
      customizations: {},
      notes: "",
      shipping_cost: 7.5,
    },
  ];

  const emptyItems: CartItem[] = [];

  // Calculate totals
  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.08; // 8% tax
    const shipping = items.reduce((sum, item) => sum + item.shipping_cost, 0);
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total };
  };

  const { subtotal, tax, shipping, total } = calculateTotals(sampleItems);
  const emptyTotals = calculateTotals(emptyItems);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Order Summary Card Demo
        </h1>

        {/* Desktop Layout Demo */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Desktop Layout (Sidebar)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 min-h-[500px]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Main Content Area
              </h3>
              <p className="text-gray-600">
                This represents the main wizard content. The Order Summary Card
                appears as a sticky sidebar on the right.
              </p>
            </div>
            <div className="lg:col-span-1">
              <OrderSummaryCard
                items={sampleItems}
                subtotal={subtotal}
                tax={tax}
                shipping={shipping}
                total={total}
                onEditItems={() => alert("Edit items clicked")}
              />
            </div>
          </div>
        </section>

        {/* Mobile Layout Demo */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Mobile Layout (Bottom)
          </h2>
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Main Content Area
              </h3>
              <p className="text-gray-600">
                On mobile, the Order Summary Card appears below the main
                content.
              </p>
            </div>
            <OrderSummaryCard
              items={sampleItems}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              total={total}
              onEditItems={() => alert("Edit items clicked")}
            />
          </div>
        </section>

        {/* Empty State Demo */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Empty Cart State
          </h2>
          <div className="max-w-md mx-auto">
            <OrderSummaryCard
              items={emptyItems}
              subtotal={emptyTotals.subtotal}
              tax={emptyTotals.tax}
              shipping={emptyTotals.shipping}
              total={emptyTotals.total}
            />
          </div>
        </section>

        {/* Free Shipping Demo */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Free Shipping
          </h2>
          <div className="max-w-md mx-auto">
            <OrderSummaryCard
              items={sampleItems}
              subtotal={subtotal}
              tax={tax}
              shipping={0}
              total={subtotal + tax}
              onEditItems={() => alert("Edit items clicked")}
            />
          </div>
        </section>

        {/* Without Edit Button */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Without Edit Button (Review Step)
          </h2>
          <div className="max-w-md mx-auto">
            <OrderSummaryCard
              items={sampleItems}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              total={total}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
