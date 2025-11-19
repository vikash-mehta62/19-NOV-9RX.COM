import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../../schemas/orderSchema";
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "react-router-dom";

interface OrderItemRowProps {
  index: number;
  isEditing?: boolean;
  poIs?: boolean;
  form: UseFormReturn<OrderFormValues>;
  products: any[];
}

export const OrderItemRow = ({
  index,
  form,
  products,
  isEditing,
  poIs
}: OrderItemRowProps) => {
  const allValues = form.getValues();
  const selectedProductId = form.getValues(`items.${index}`);
  const selectedProduct = products.find(
    (p) => p.id === selectedProductId.productId
  );
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateDescription,
  } = useCart();

  const [showDialog, setShowDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState(
    selectedProductId.description || ""
  );


  console.log(form.getValues())
  const handleRemove = async () => {
    const productId = selectedProductId.productId;

    const updatedItems = allValues.items.filter((_, i) => i !== index);
    form.setValue("items", updatedItems);
    form.trigger("items");

    if (!isEditing) {
      await removeFromCart(String(productId));
    }
  };

  const handleSaveDescription = async () => {
    form.setValue(`items.${index}.description`, tempDescription);
    form.trigger(`items.${index}.description`);
    setShowDialog(false);
    await updateDescription(selectedProductId.productId, tempDescription);
  };

    const location = useLocation();
  
  const [poIsEdit, setPoIsEdit] = useState(false);

  useEffect(() => {
   
    if (location.pathname.startsWith('/admin/po')) {
      setPoIsEdit(true);
    } else {
      setPoIsEdit(false);
    }
  }, [location.pathname]);
  

  console.log(poIsEdit,"poIsEdit")
  return (
    <div className="flex flex-col p-4 border rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Product Name & Description */}
        <div>
          <FormLabel className="text-gray-700 font-semibold">Product</FormLabel>
          <p className="text-gray-900 font-medium">
            {selectedProduct?.name || selectedProductId?.name || "Custom"}
          </p>

          {selectedProductId.description && (
            <p className="mt-1 text-sm text-gray-600 italic">
              {selectedProductId.description}
            </p>
          )}

          {<Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => setShowDialog(true)}
          >
            {selectedProductId.description ? "Edit" : "Add"} Description
          </Button>}

        </div>

        {/* Quantity */}
        <div>
          <FormLabel className="text-gray-700 font-semibold">Quantity</FormLabel>
          <p className="text-gray-900 font-medium">
            {form.getValues(`items.${index}.quantity`) || "0"}
          </p>
        </div>

        {/* Sizes */}
        <div>
          <FormLabel className="text-gray-700 font-semibold">Sizes</FormLabel>
          <div className="text-gray-900 font-medium">
            {Array.isArray(form.getValues(`items.${index}.sizes`))
              ? form
                .getValues(`items.${index}.sizes`)
                .map((size, i) => (
                  <div key={i} className="mb-1">
                    {size.size_value} {" "}
                    {size.size_unit?.toUpperCase()}
                    ({size.quantity}{" "}
                    {size.type === "unit" ? "unit" : ""})
                  </div>
                ))
              : "N/A"}
          </div>
        </div>

        {/* Price */}
        <div>
          <FormLabel className="text-gray-700 font-semibold">Price</FormLabel>
          <p className="text-gray-900 font-medium">
            ${form.getValues(`items.${index}.price`)?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex justify-end mt-4">
        <button
          type="button"
          className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg"
          onClick={handleRemove}
        >
          Remove
        </button>
      </div>

      {/* Description Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add/Edit Description</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-700 font-medium mb-1">
            Product: {selectedProduct?.name || selectedProductId?.name}
          </p>

          <Textarea
            value={tempDescription}
            onChange={(e) => setTempDescription(e.target.value)}
            placeholder="Enter description..."
            className="mt-2"
          />

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDescription}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
