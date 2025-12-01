"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type ProductFormValues, productFormSchema } from "./schemas/productSchema"
import { BasicInfoSection } from "./form-sections/BasicInfoSection"
import { ImageUploadField } from "./form-fields/ImageUploadField"
import { SizeOptionsField } from "./form-fields/SizeOptionsField"
import { InventorySection } from "./form-sections/InventorySection"
import { Loader2, Package, Save, X } from "lucide-react"
import { useEffect, useState } from "react"
import { CustomizationSection } from "./form-fields/Customizations"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProductFormValues) => Promise<void>
  isSubmitting?: boolean
  onProductAdded: () => void
  initialData?: Partial<ProductFormValues>
}

export function AddProductDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  onProductAdded,
  initialData,
}: AddProductDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      sku: initialData?.sku || "",
      key_features: initialData?.key_features || "",
      squanence: initialData?.squanence || "",
      ndcCode: initialData?.ndcCode || "",
      upcCode: initialData?.upcCode || "",
      lotNumber: initialData?.lotNumber || "",
      exipry: initialData?.exipry || "",
      unitToggle: initialData?.unitToggle,

      description: initialData?.description || "",
      category: initialData?.category || "",
      images: initialData?.images || [],
      sizes: initialData?.sizes
        ? [...initialData.sizes].sort((a, b) => Number(a.sizeSquanence) - Number(b.sizeSquanence))
        : [],
      base_price: initialData?.base_price || 0,
      current_stock: initialData?.current_stock || 0,
      min_stock: initialData?.min_stock || 0,
      reorder_point: initialData?.reorder_point || 0,
      quantityPerCase: initialData?.quantityPerCase || 1,
      customization: initialData?.customization || {
        allowed: false,
        options: [],
        price: 0,
      },
      trackInventory: initialData?.trackInventory ?? true,
      image_url: initialData?.image_url || "",
    },
  })


  const { watch } = form;

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log("📝 Changed field:", name);
      console.log("📦 New form values:", value);
    });

    return () => subscription.unsubscribe(); // cleanup on unmount
  }, [watch]);

  const handleSubmit = async (values: ProductFormValues) => {
    setLoading(true)
    try {
      await onSubmit(values)

      form.reset()
      onProductAdded()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting product:", error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] p-0 gap-0">
        <DialogHeader className="px-8 py-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            {initialData ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <p className="text-blue-100 text-sm mt-1">
            {initialData ? "Update product information and details" : "Fill in the details to add a new product to your inventory"}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 p-8 bg-gray-50">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                    <p className="text-sm text-gray-500">Product category, name, and description</p>
                  </div>
                </div>
                <BasicInfoSection
                  form={form}
                  generateSKU={(category) => {
                    const timestamp = Date.now().toString().slice(-4)
                    const prefix = category.slice(0, 3).toUpperCase()
                    return `${prefix}-${timestamp}`
                  }}
                />
              </div>

              <Separator className="bg-gray-300" />

              {/* Product Images */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Product Images</h3>
                    <p className="text-sm text-gray-500">Upload high-quality product images</p>
                  </div>
                </div>
                <ImageUploadField
                  form={form}
                  validateImage={(file) => {
                    const maxSize = 5 * 1024 * 1024
                    if (file.size > maxSize) {
                      return "Image size should be less than 5MB"
                    }
                    const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
                    if (!allowedTypes.includes(file.type)) {
                      return "Only JPG, PNG and GIF images are allowed"
                    }
                    return null
                  }}
                />
              </div>

              <Separator className="bg-gray-300" />

              {/* Size Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Size Options & Pricing</h3>
                    <p className="text-sm text-gray-500">Configure available sizes and their prices</p>
                  </div>
                </div>
                <SizeOptionsField form={form} isEditing={initialData ? true : false} />
              </div>

              <Separator className="bg-gray-300" />

              {/* Customization */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                    <span className="text-orange-600 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Customization Options</h3>
                    <p className="text-sm text-gray-500">Add custom options for this product</p>
                  </div>
                </div>
                <CustomizationSection form={form} />
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="px-8 py-5 border-t bg-white flex-col sm:flex-row gap-3 shadow-lg">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto h-11 border-gray-300 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            onClick={form.handleSubmit(handleSubmit)}
            className="w-full sm:w-auto h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>{initialData ? "Updating" : "Adding"} Product...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {initialData ? "Update Product" : "Add Product"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
