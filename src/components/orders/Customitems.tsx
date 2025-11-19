import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { v4 as uuidv4 } from "uuid";
import { useCart } from "@/hooks/use-cart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const validationSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  price: yup.number().required("Price is required").positive("Price must be positive"),
  sizes: yup.array().of(
    yup.object().shape({
      size: yup.string().required("Size is required"),
      price: yup.number().required("Size price is required").positive("Must be positive"),
      quantity: yup.number().required("Quantity is required").min(1, "Min quantity is 1"),
    })
  ),
});

const CustomProductForm = ({ isOpen, onClose, isEditing, form }) => {
  const { addToCart } = useCart();

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      price: 0,
      sizes: [{ size: "", price: 0, quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sizes",
  });

  const onSubmit = async () => {
    const data = getValues();
    const totalPrice = data.sizes.reduce(
      (sum, size) => sum + Number(size.price) * Number(size.quantity),
      0
    );
    try {
      const cartItem = {
        productId: uuidv4(),
        name: data.name,
        price: Number(totalPrice),
        image: "https://via.placeholder.com/150",
        shipping_cost: 0,
        sizes: data.sizes.map((size) => ({
          id: uuidv4(),
          price: Number(size.price),
          quantity: Number(size.quantity),
          size_value: size.size,
          size_unit: " ",
        })),
        quantity: data.sizes.reduce((total, size) => total + Number(size.quantity), 0),
        customizations: {},
        notes: "",
      };

      if (isEditing) {
        form.setValue("items", [...form.getValues("items"), cartItem]);
      } else {
        await addToCart(cartItem);
      }
      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-6 bg-white shadow-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Add Custom Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block font-medium"> Name</label>
            <input
              type="text"
              {...register("name")}
              className="w-full p-2 border rounded"
              placeholder="Enter custom name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium">Size</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="flex space-x-2 items-center">
                <input
                  type="text"
                  placeholder="Name At least 2 words"
                  {...register(`sizes.${index}.size`)}
                  className="p-2 border border-gray-300 rounded w-1/3"
                />
                <label>Price</label>
                <input
                  type="number"
                  placeholder="Price"
                  {...register(`sizes.${index}.price`)}
                  className="p-2 border border-gray-300 rounded w-1/3"
                />
                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="Quantity"
                  {...register(`sizes.${index}.quantity`)}
                  className="p-2 border border-gray-300 rounded w-1/3"
                />
                <button type="button" onClick={() => remove(index)} className="text-red-500">
                  X
                </button>
              </div>
            ))}
          </div>

          <DialogFooter className="flex justify-between">
            <p
              onClick={onSubmit}
              className="p-2 bg-green-500 text-white rounded cursor-pointer"
            >
              Add to Cart
            </p>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-gray-500 text-white rounded"
            >
              Close
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomProductForm;
