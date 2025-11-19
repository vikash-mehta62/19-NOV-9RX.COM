"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { Check } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ProductImage } from "./product-card/ProductImage";
import { ProductDialog } from "./product-card/ProductDialog";
import type { ProductDetails } from "../types/product.types";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProductCardProps {
  product: ProductDetails;
  isEditing?: boolean;
  form?: any;
}

export const ProductCard = ({ product, isEditing = false, form = {} }: ProductCardProps) => {
  const { toast } = useToast();
  const { addToCart, cartItems } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [customizations, setCustomizations] = useState<Record<string, string>>(
    {}
  );
  // Add state to control dialog open/close
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedSizesSKU, setSelectedSizesSKU] = useState<string[]>([]);

  const [quantity, setQuantity] = useState<{ [key: string]: number }>({});
  const navigate = useNavigate();

  const formItems = isEditing ? form.getValues()?.items || [] : cartItems;
  const [selectedTypeBySize, setSelectedTypeBySize] = useState<{
    [sizeId: string]: "case" | "unit"
  }>({})
  const isInCart = formItems.some(
    (item: any) => item.productId?.toString() === product.id?.toString()
  );
  const stockStatus =
    product.stock && product.stock < 10 ? "Low Stock" : "In Stock";

  const handleIncreaseQuantity = (id: string): void => {
    setQuantity((prev) => ({
      ...prev,
      [id]: (prev[id] || 1) + 1, // Increase quantity for specific size
    }));
  };

  const handleDecreaseQuantity = (id: string): void => {
    if (quantity[id] > 1) {
      setQuantity((prev) => ({
        ...prev,
        [id]: prev[id] - 1, // Decrease quantity for specific size
      }));
    }
  };

 const handleAddToCart = async () => {
  setIsAddingToCart(true);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    if (product.stock < 1) {
      throw new Error("Product is out of stock");
    }

    const imageUrl = product.images[0] || product.image_url;

    // 🔥 Get all selected sizes
    const updatedSizes = product.sizes
      .filter((size) =>
        selectedSizes.includes(`${size.size_value}-${size.size_unit}`)
      )
      .map((size) => {
        const quantityValue = quantity[size.id] || 1;
        const type = selectedTypeBySize[`${size.size_value}-${size.size_unit}`] || "case";
        console.log(type)
        const price =
          type === "unit" && size.price_per_case
            ? size.price_per_case
            : size.price;

        return {
          ...size,
          quantity: quantityValue,
          type: type, // ✅ Include selected type
          price: price,   // ✅ Add calculated unit price
          total_price: price * quantityValue, // ✅ Precalculate
        };
      })
      .filter((size) => size.quantity > 0);

      console.log(updatedSizes)
      const totalPrice = updatedSizes.reduce(
        (sum, size) => sum + size.price * size.quantity,
        0
      );

      const highestShippingCost = updatedSizes.reduce(
        (max, size) => (size.shipping_cost > max ? size.shipping_cost : max),
        0
      );

      console.log(highestShippingCost)
      const cartItem = {
        productId: product.id.toString(),
        name: product.name,
        price: totalPrice,
        image: imageUrl,
        shipping_cost: Number(highestShippingCost) || 0,
        sizes: updatedSizes,
        quantity: updatedSizes.reduce(
          (total, size) => total + size.quantity,
          0
        ),
        customizations,
        notes: "",
      };

      console.log("Cart Item:", cartItem);


      if (isEditing && form) {
        const currentItems = form.getValues("items") || [];
        form.setValue("items", [...currentItems, cartItem]);

        toast({
          title: "Item Added",
          description: (
            <Alert className="border-blue-500 bg-blue-50">
              <Check className="h-4 w-4 text-blue-500" />
              <AlertDescription className="ml-2">
                {product.name} has been added to the order successfully!
              </AlertDescription>
            </Alert>
          ),
        });

        setDialogOpen(false);
      } else {
        const success = await addToCart(cartItem);

        if (success) {
          toast({
            title: "Added to Cart",
            description: (
              <Alert className="border-emerald-500 bg-emerald-50">
                <Check className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="ml-2">
                  {product.name} has been added to your cart successfully!
                </AlertDescription>
              </Alert>
            ),
          });

          setDialogOpen(false);
        } else {
          throw new Error("Failed to add to cart");
        }
      }

    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <ProductImage
              image={product.images[0] || product.image}
              name={product.name}
              offer={product.offer}
              stockStatus={stockStatus}
            />

            <div className="space-y-4">
              <div>
                <h3 className="text-lg text-center font-semibold mb-1">
                  {product.name}
                </h3>

                {/* <p className="text-gray-600 text-sm">{product.description}</p> */}
              </div>

              {/* <ProductPricing
                basePrice={product.base_price || product.price}
                offer={product.offer}
                tierPricing={product.tierPricing}
              /> */}
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <ProductDialog
        product={product}
        isInCart={isInCart}
        isAddingToCart={isAddingToCart}
        customizations={customizations}
        onCustomizationChange={setCustomizations}
        onAddToCart={handleAddToCart}
        quantity={quantity}
        onIncreaseQuantity={handleIncreaseQuantity}
        onDecreaseQuantity={handleDecreaseQuantity}
        setSelectedSizes={setSelectedSizes}
        setSelectedSizesSKU={setSelectedSizesSKU}
        selectedSizes={selectedSizes}
        selectedSizesSKU={selectedSizesSKU}
         selectedTypeBySize={selectedTypeBySize}
                setSelectedTypeBySize={setSelectedTypeBySize}
      />
    </Dialog>
  );
};

export default ProductCard;
