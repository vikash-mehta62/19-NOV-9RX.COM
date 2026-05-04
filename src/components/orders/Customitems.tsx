import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Package2, ReceiptText } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CartItem } from "@/store/types/cartTypes";
import { cn } from "@/lib/utils";

interface CustomProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing?: boolean;
  form?: {
    getValues?: (name?: string) => unknown;
    setValue?: (name: string, value: unknown) => void;
  } | null;
  onAdded?: (item: CartItem) => void;
  variant?: "dialog" | "inline";
  compact?: boolean;
}

interface ManualItemFormState {
  name: string;
  sku: string;
  sizeName: string;
  sizeValue: string;
  sizeUnit: string;
  quantity: string;
  unitPrice: string;
  shippingCost: string;
  description: string;
  notes: string;
}

const createInitialState = (): ManualItemFormState => ({
  name: "",
  sku: "",
  sizeName: "",
  sizeValue: "Standard",
  sizeUnit: "",
  quantity: "1",
  unitPrice: "",
  shippingCost: "0",
  description: "",
  notes: "",
});

const buildManualCartItem = (values: ManualItemFormState): CartItem => {
  const productId = `manual-order-${uuidv4()}`;
  const sizeId = `${productId}-size`;
  const quantity = Math.max(1, Number(values.quantity || 1));
  const unitPrice = Number(values.unitPrice || 0);
  const shippingCost = Math.max(0, Number(values.shippingCost || 0));
  const resolvedName = values.name.trim();
  const resolvedSku = values.sku.trim() || `MANUAL-${Date.now()}`;
  const resolvedSizeName = values.sizeName.trim() || resolvedName;
  const resolvedSizeValue = values.sizeValue.trim() || "Standard";
  const resolvedSizeUnit = values.sizeUnit.trim();
  const resolvedDescription = values.description.trim();
  const resolvedNotes = values.notes.trim();

  return {
    productId,
    name: resolvedName,
    sku: resolvedSku,
    isManualItem: true,
    source: "sales_manual",
    price: Number((quantity * unitPrice).toFixed(2)),
    image: "/placeholder.svg",
    description: resolvedDescription,
    quantity,
    sizes: [
      {
        id: sizeId,
        size_name: resolvedSizeName,
        size_value: resolvedSizeValue,
        size_unit: resolvedSizeUnit,
        price: Number(unitPrice.toFixed(2)),
        quantity,
        type: "manual",
        source: "sales_manual",
        isManualItem: true,
        sku: resolvedSku,
        shipping_cost: shippingCost,
      },
    ],
    customizations: {},
    notes: resolvedNotes,
    shipping_cost: shippingCost,
  };
};

const CustomProductForm = ({
  isOpen,
  onClose,
  isEditing = false,
  form = null,
  onAdded,
  variant = "dialog",
  compact = false,
}: CustomProductFormProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [values, setValues] = useState<ManualItemFormState>(createInitialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(createInitialState());
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const quantity = Math.max(0, Number(values.quantity || 0));
  const unitPrice = Math.max(0, Number(values.unitPrice || 0));
  const shippingCost = Math.max(0, Number(values.shippingCost || 0));
  const lineTotal = useMemo(
    () => Number((quantity * unitPrice).toFixed(2)),
    [quantity, unitPrice]
  );

  const updateField = (field: keyof ManualItemFormState, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const parsedQuantity = Number(values.quantity);
    const parsedUnitPrice = Number(values.unitPrice);
    const parsedShipping = Number(values.shippingCost || 0);

    if (!trimmedName) {
      toast({
        title: "Manual item name required",
        description: "Enter a product or charge name before adding it to the order.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      toast({
        title: "Invalid unit price",
        description: "Unit price must be 0 or greater.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedShipping) || parsedShipping < 0) {
      toast({
        title: "Invalid shipping amount",
        description: "Shipping cost must be 0 or greater.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const cartItem = buildManualCartItem(values);

      if (isEditing && form?.getValues && form?.setValue) {
        const existingItems = Array.isArray(form.getValues("items"))
          ? (form.getValues("items") as CartItem[])
          : [];
        form.setValue("items", [...existingItems, cartItem]);
      } else {
        const added = await addToCart(cartItem);
        if (!added) {
          toast({
            title: "Unable to add manual item",
            description: "Manual sales items do not use inventory stock. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      onAdded?.(cartItem);

      toast({
        title: "Manual item added",
        description: `${cartItem.name} was added to the order.`,
      });

      onClose();
    } catch (error) {
      console.error("Failed to add manual order item:", error);
      toast({
        title: "Unable to add manual item",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const formBody = (
    <>
      <div
        className={cn(
          "grid py-2",
          compact ? "gap-2 md:grid-cols-6" : "gap-4 md:grid-cols-6"
        )}
      >
        <div className={cn("space-y-2", compact ? "md:col-span-4" : "md:col-span-4")}>
          <Label htmlFor="manual-item-name" className={cn(compact && "text-xs")}>Name</Label>
          <Input
            id="manual-item-name"
            value={values.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Manual delivery charge, custom tray, special item..."
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        <div className={cn("space-y-2", compact ? "md:col-span-2" : "md:col-span-2")}>
          <Label htmlFor="manual-item-sku" className={cn(compact && "text-xs")}>SKU</Label>
          <Input
            id="manual-item-sku"
            value={values.sku}
            onChange={(e) => updateField("sku", e.target.value)}
            placeholder="Optional"
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        <div className={cn("space-y-2", compact ? "md:col-span-2" : "md:col-span-2")}>
          <Label htmlFor="manual-item-size-unit" className={cn(compact && "text-xs")}>Size Unit</Label>
          <Input
            id="manual-item-size-unit"
            value={values.sizeUnit}
            onChange={(e) => updateField("sizeUnit", e.target.value)}
            placeholder="box, fee, set, each..."
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        <div className={cn("space-y-2", compact ? "md:col-span-2" : "md:col-span-2")}>
          <Label htmlFor="manual-item-quantity" className={cn(compact && "text-xs")}>Quantity</Label>
          <Input
            id="manual-item-quantity"
            type="number"
            min="1"
            step="1"
            value={values.quantity}
            onChange={(e) => updateField("quantity", e.target.value)}
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        <div className={cn("space-y-2", compact ? "md:col-span-2" : "md:col-span-2")}>
          <Label htmlFor="manual-item-unit-price" className={cn(compact && "text-xs")}>Unit Price ($)</Label>
          <Input
            id="manual-item-unit-price"
            type="number"
            min="0"
            step="0.01"
            value={values.unitPrice}
            onChange={(e) => updateField("unitPrice", e.target.value)}
            placeholder="0.00"
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        

        <div className={cn("space-y-2", compact ? "md:col-span-3" : "md:col-span-2")}>
          <Label htmlFor="manual-item-description" className={cn(compact && "text-xs")}>Description</Label>
          <Textarea
            id="manual-item-description"
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Short customer-facing description"
            className={cn(compact ? "min-h-[56px] text-xs" : "min-h-[84px]")}
          />
        </div>

        
      </div>

      {/* <div className={cn("rounded-xl border border-slate-200 bg-slate-50", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ReceiptText className="h-4 w-4 text-slate-500" />
          Preview
        </div>
        <div className={cn("mt-3 grid text-slate-600 md:grid-cols-2", compact ? "gap-1.5 text-xs" : "gap-2 text-sm")}>
          <p>Name: <span className="font-medium text-slate-900">{values.name.trim() || "Not set"}</span></p>
          <p>SKU: <span className="font-medium text-slate-900">{values.sku.trim() || "Auto-generated"}</span></p>
          <p>Quantity: <span className="font-medium text-slate-900">{quantity || 0}</span></p>
          <p>Unit Price: <span className="font-medium text-slate-900">${unitPrice.toFixed(2)}</span></p>
          <p>Shipping Cost: <span className="font-medium text-slate-900">${shippingCost.toFixed(2)}</span></p>
          <p>Line Total: <span className="font-semibold text-blue-700">${lineTotal.toFixed(2)}</span></p>
        </div>
      </div> */}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2.5">
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Package2 className="h-3.5 w-3.5 text-blue-600" />
            Add Manual Item
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            Add a custom charge or one-off product line without leaving this review step.
          </p>
        </div>
        {formBody}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm" className="h-8 px-3 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="sm" className="h-8 px-3 text-xs">
            {isSubmitting ? "Adding..." : "Add Manual Item"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-blue-600" />
            Add Manual Item
          </DialogTitle>
          <DialogDescription>
            Create a one-off charge or product line with a manual name, SKU, quantity, price, and notes.
          </DialogDescription>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Manual Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomProductForm;
