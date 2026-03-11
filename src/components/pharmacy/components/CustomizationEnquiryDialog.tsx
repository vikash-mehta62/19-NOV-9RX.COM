import { useEffect, useMemo, useState } from "react"
import { Loader2, Palette, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/supabaseClient"

export interface CustomizationEnquiryItem {
  key: string
  productId: string
  productName: string
  sizeId: string
  sizeLabel: string
  sku?: string
  requestedQuantity: number
}

interface CatalogCustomizationOption {
  key: string
  productId: string
  productName: string
  sizeId: string
  sizeLabel: string
  sku?: string
}

interface CustomizationEnquiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CustomizationEnquiryItem[]
  instruction: string
  onInstructionChange: (value: string) => void
  onItemsChange: (items: CustomizationEnquiryItem[]) => void
  onSubmit: () => Promise<void> | void
  isSubmitting: boolean
}

export const CustomizationEnquiryDialog = ({
  open,
  onOpenChange,
  items,
  instruction,
  onInstructionChange,
  onItemsChange,
  onSubmit,
  isSubmitting,
}: CustomizationEnquiryDialogProps) => {
  const [catalogOptions, setCatalogOptions] = useState<CatalogCustomizationOption[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [selectedCatalogKey, setSelectedCatalogKey] = useState("")

  useEffect(() => {
    const loadCustomizableProducts = async () => {
      setIsCatalogLoading(true)
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, customization, product_sizes!inner(id, size_value, size_unit, sku, is_active)")
          .eq("product_sizes.is_active", true)

        if (error) throw error

        const nextOptions = (data || [])
          .filter((product: any) => product.customization?.allowed)
          .flatMap((product: any) =>
            (product.product_sizes || []).map((size: any) => ({
              key: `${product.id}:${size.id}`,
              productId: product.id,
              productName: product.name,
              sizeId: size.id,
              sizeLabel: `${size.size_value} ${size.size_unit}`,
              sku: size.sku || product.sku || "",
            }))
          )

        setCatalogOptions(nextOptions)
      } catch (error) {
        console.error("Failed to load customizable products:", error)
      } finally {
        setIsCatalogLoading(false)
      }
    }

    if (open) {
      loadCustomizableProducts()
    }
  }, [open])

  const availableOptions = useMemo(
    () => catalogOptions.filter((option) => !items.some((item) => item.key === option.key)),
    [catalogOptions, items]
  )

  const handleAddOption = () => {
    if (!selectedCatalogKey) return
    const option = availableOptions.find((entry) => entry.key === selectedCatalogKey)
    if (!option) return

    onItemsChange([
      ...items,
      {
        ...option,
        requestedQuantity: 1,
      },
    ])
    setSelectedCatalogKey("")
  }

  const handleQuantityChange = (key: string, requestedQuantity: number) => {
    onItemsChange(
      items.map((item) =>
        item.key === key
          ? { ...item, requestedQuantity: Math.max(1, requestedQuantity || 1) }
          : item
      )
    )
  }

  const handleRemoveItem = (key: string) => {
    onItemsChange(items.filter((item) => item.key !== key))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <Palette className="w-5 h-5" />
            Customization Enquiry
          </DialogTitle>
          <DialogDescription>
            Review selected customization products, add more eligible products, and set the quantity you need.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <Badge key={item.key} variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                  {item.productName} - {item.sizeLabel}
                </Badge>
              ))}
            </div>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
              {items.length} selected
            </Badge>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
            <Label className="text-sm font-semibold text-purple-700">Selected Customization Products</Label>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="grid grid-cols-1 md:grid-cols-[1fr_120px_48px] gap-3 items-center rounded-lg border border-purple-100 bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      {item.sizeLabel}
                      {item.sku ? ` | SKU: ${item.sku}` : ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`customization-qty-${item.key}`} className="text-xs text-gray-600">
                      Requested Qty
                    </Label>
                    <Input
                      id={`customization-qty-${item.key}`}
                      type="number"
                      min={1}
                      value={item.requestedQuantity}
                      onChange={(e) => handleQuantityChange(item.key, Number(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveItem(item.key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <Label htmlFor="customization-add-more" className="text-sm font-semibold text-gray-800">
              Add More Customization Products
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <select
                id="customization-add-more"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedCatalogKey}
                onChange={(e) => setSelectedCatalogKey(e.target.value)}
                disabled={isCatalogLoading || availableOptions.length === 0}
              >
                <option value="">
                  {isCatalogLoading
                    ? "Loading customization products..."
                    : availableOptions.length === 0
                    ? "No more customization products available"
                    : "Select a customization product"}
                </option>
                {availableOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.productName} - {option.sizeLabel}
                    {option.sku ? ` | SKU: ${option.sku}` : ""}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={handleAddOption} disabled={!selectedCatalogKey}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add More
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customization-instruction-modal" className="text-sm font-semibold text-purple-700">
              Customization Instruction
            </Label>
            <Textarea
              id="customization-instruction-modal"
              placeholder="Example: Print pharmacy logo and phone number in black."
              className="min-h-[110px]"
              value={instruction}
              onChange={(e) => onInstructionChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" className="bg-purple-600 hover:bg-purple-700" onClick={onSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Sending Enquiry...
              </>
            ) : (
              "Send Enquiry to Admin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
