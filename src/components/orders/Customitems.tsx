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

interface CustomProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing?: boolean;
  form?: {
    getValues?: (name?: string) => unknown;
    setValue?: (name: string, value: unknown) => void;
  } | null;
  onAdded?: (item: CartItem) => void;
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
        await addToCart(cartItem);
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

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="manual-item-name">Name</Label>
            <Input
              id="manual-item-name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Manual delivery charge, custom tray, special item..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-sku">SKU</Label>
            <Input
              id="manual-item-sku"
              value={values.sku}
              onChange={(e) => updateField("sku", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-size-name">Size Label</Label>
            <Input
              id="manual-item-size-name"
              value={values.sizeName}
              onChange={(e) => updateField("sizeName", e.target.value)}
              placeholder="Defaults to item name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-size-value">Size Value</Label>
            <Input
              id="manual-item-size-value"
              value={values.sizeValue}
              onChange={(e) => updateField("sizeValue", e.target.value)}
              placeholder="Standard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-size-unit">Size Unit</Label>
            <Input
              id="manual-item-size-unit"
              value={values.sizeUnit}
              onChange={(e) => updateField("sizeUnit", e.target.value)}
              placeholder="box, fee, set, each..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-quantity">Quantity</Label>
            <Input
              id="manual-item-quantity"
              type="number"
              min="1"
              step="1"
              value={values.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-unit-price">Unit Price ($)</Label>
            <Input
              id="manual-item-unit-price"
              type="number"
              min="0"
              step="0.01"
              value={values.unitPrice}
              onChange={(e) => updateField("unitPrice", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-item-shipping">Shipping Cost ($)</Label>
            <Input
              id="manual-item-shipping"
              type="number"
              min="0"
              step="0.01"
              value={values.shippingCost}
              onChange={(e) => updateField("shippingCost", e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="manual-item-description">Description</Label>
            <Textarea
              id="manual-item-description"
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Short customer-facing description"
              className="min-h-[84px]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="manual-item-notes">Internal Notes</Label>
            <Textarea
              id="manual-item-notes"
              value={values.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional internal notes for this line item"
              className="min-h-[84px]"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ReceiptText className="h-4 w-4 text-slate-500" />
            Preview
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p>Name: <span className="font-medium text-slate-900">{values.name.trim() || "Not set"}</span></p>
            <p>SKU: <span className="font-medium text-slate-900">{values.sku.trim() || "Auto-generated"}</span></p>
            <p>Quantity: <span className="font-medium text-slate-900">{quantity || 0}</span></p>
            <p>Unit Price: <span className="font-medium text-slate-900">${unitPrice.toFixed(2)}</span></p>
            <p>Shipping Cost: <span className="font-medium text-slate-900">${shippingCost.toFixed(2)}</span></p>
            <p>Line Total: <span className="font-semibold text-blue-700">${lineTotal.toFixed(2)}</span></p>
          </div>
        </div>

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
