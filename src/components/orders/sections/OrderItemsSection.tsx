import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../schemas/orderSchema";
import { OrderItemRow } from "./components/OrderItemRow";
import { supabase } from "@/supabaseClient";

interface OrderItemsSectionProps {
  orderItems: { id: number }[];
  form: UseFormReturn<OrderFormValues>;
  setIsCus?: React.Dispatch<React.SetStateAction<boolean>>;
  poIs?: boolean;
  isCus?: boolean;
}

export function OrderItemsSection({ orderItems, form, setIsCus, isCus, isEditing, poIs }) {
  const [products, setProducts] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } else {
        setProducts(data);
      }
    };

    fetchProducts();
  }, [toast]);

  const allValues = form.getValues();
  console.log("All Order Values:", allValues);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Order Items</h2>

        <label
          className={` items-center hidden cursor-pointer p-3 rounded-lg transition 
              ${isCus ? "bg-green-200" : "bg-gray-200"}`}
        >
          <div className="relative">
            <input
              type="checkbox"
              checked={isCus}
              onChange={() => { setIsCus?.((prev) => !prev); form.setFieldValue("customization", isCus); }}
              className="sr-only"
            />
            {/* Switch Background */}
            <div className={`block w-14 h-8 rounded-full transition 
                    ${isCus ? "bg-green-500" : "bg-gray-400"}`}></div>

            {/* Moving Circle */}
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition 
                  ${isCus ? "translate-x-6 bg-green-700" : "bg-gray-500"}`}
            ></div>
          </div>

          <span className="ml-3 text-sm font-medium text-gray-700">
            {isCus ? "Customization Enabled" : "Customization Disabled"}
          </span>
        </label>



      </div>

      {allValues?.items?.map((item, index) => (
        <OrderItemRow
          key={item.id}
          index={index}
          form={form}
          products={products}
          isEditing={isEditing}
          poIs={poIs}
        />
      ))}
    </div>
  );
}
