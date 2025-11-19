
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Loader2 } from "lucide-react";

interface ProductActionsProps {
  isInCart: boolean;
  selectedSizesSKU: string[];
  isAddingToCart: boolean;
  onAddToCart: () => void;
  disabled?: boolean;  // Added disabled prop as optional
}

export const ProductActions = ({ 
  isInCart, 
  isAddingToCart, 
  onAddToCart,
  selectedSizesSKU,

  disabled = false  // Default to false if not provided
}: ProductActionsProps) => {
  return (
    <Button 
      className={`w-full ${isInCart ? 'bg-gray-500' : 'bg-emerald-600 hover:bg-emerald-700'} transition-all duration-300`}
      onClick={onAddToCart}
      disabled={isInCart || isAddingToCart || disabled}
    >
      {isAddingToCart ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Adding...
        </>
      ) : isInCart ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          In Cart
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </>
      )}
    </Button>
  );
};
