"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type ProductFormValues, productFormSchema } from "./schemas/productSchema"
import { ImageUploadField } from "./form-fields/ImageUploadField"
import { SizeOptionsField } from "./form-fields/SizeOptionsField"
import { CustomizationSection } from "./form-fields/Customizations"
import { CategorySubcategoryManager } from "./form-sections/CategorySubcategoryManager"
import {
  Loader2, Package, Save, X, ChevronDown, ChevronUp,
  Image, Ruler, Settings, Sparkles, Info, CheckCircle2, Plus
} from "lucide-react"
import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PRODUCT_CATEGORIES } from "@/types/product"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProductFormValues) => Promise<void>
  isSubmitting?: boolean
  onProductAdded: () => void
  initialData?: Partial<ProductFormValues>
}

interface Subcategory {
  id: number
  category_name: string
  subcategory_name: string
}

// Section Component
const FormSection = ({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = true,
  badge,
  required = false
}: {
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  required?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "border transition-all duration-200",
        isOpen ? "border-gray-200 shadow-sm" : "border-gray-100 hover:border-gray-200"
      )}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", iconColor)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  {required && <span className="text-red-500 text-sm">*</span>}
                  {badge && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      {badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4">
              {children}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([])

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
      subcategory: initialData?.subcategory || "",
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
      similar_products: initialData?.similar_products || [],
    },
  })

  const selectedCategory = form.watch("category")
  const productName = form.watch("name")
  const description = form.watch("description")
  const sizes = form.watch("sizes")
  const images = form.watch("images")

  // Auto-generate SKU based on category
  const generateSKU = (category: string) => {
    const timestamp = Date.now().toString().slice(-4)
    const prefix = category.slice(0, 3).toUpperCase()
    return `${prefix}-${timestamp}`
  }

  // Fetch categories from database
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('category_configs')
      .select('category_name')
      .order('category_name')

    if (!error && data) {
      const dbCategories = data.map(c => c.category_name)
      // Merge with default categories
      const allCategories = dbCategories
      setCategories(allCategories)
    }
  }

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) return

      const { data, error } = await supabase
        .from('subcategory_configs')
        .select('*')
        .eq('category_name', selectedCategory)
        .order('subcategory_name')

      if (!error && data) {
        setSubcategories(data)
      }
    }
    fetchSubcategories()

    // Auto-fill name with category if empty
    if (selectedCategory && !productName) {
      form.setValue("name", selectedCategory)
    }

    // Auto-generate SKU
    if (selectedCategory && !form.getValues("sku")) {
      form.setValue("sku", generateSKU(selectedCategory))
    }
  }, [selectedCategory])

  // Fetch All subcategories on mount
  useEffect(() => {
    const fetchAllSubcategories = async () => {
      const { data, error } = await supabase
        .from('subcategory_configs')
        .select('*')
        .order('subcategory_name')
      if (!error && data) {
        console.log("Fetched all subcategories:", data)
        setAllSubcategories(data)
      }
    }
    fetchAllSubcategories()
  }, [])

  console.log("All Subcategories:", allSubcategories)
  
  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      form.reset({
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
        subcategory: initialData?.subcategory || "",
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
        similar_products: initialData?.similar_products || [],
      })
    }
  }, [open, initialData, form])

  // Track completed sections
  useEffect(() => {
    const completed: string[] = []

    if (selectedCategory && productName && description) {
      completed.push("basic")
    }
    if (images && images.length > 0) {
      completed.push("images")
    }
    if (sizes && sizes.length > 0) {
      completed.push("sizes")
    }

    setCompletedSections(completed)
  }, [selectedCategory, productName, description, images, sizes])

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

  const handleCategoryManagerSuccess = () => {
    fetchCategories()
  }

  const isBasicInfoComplete = selectedCategory && productName && description
  const progress = Math.round((completedSections.length / 3) * 100)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[95vh] p-0 gap-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-sm">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {initialData ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {initialData ? "Update product details" : "Fill in the essentials to get started"}
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="text-sm font-semibold text-blue-600">{progress}%</p>
                </div>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-4 bg-gray-50">

                {/* Essential Info - Always Visible */}
                <FormSection
                  title="Essential Information"
                  description="Category, name, and basic details"
                  icon={Info}
                  iconColor="bg-blue-500"
                  defaultOpen={true}
                  required
                  badge={completedSections.includes("basic") ? "✓ Complete" : undefined}
                >
                  <div className="space-y-4">
                    {/* Category & Subcategory Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-medium">
                                Category <span className="text-red-500">*</span>
                              </FormLabel>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                                onClick={() => setCategoryManagerOpen(true)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add New
                              </Button>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Subcategory</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!selectedCategory}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder={selectedCategory ? "Select subcategory" : "Select category first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subcategories.length > 0 ? (
                                  subcategories.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.subcategory_name}>
                                      {sub.subcategory_name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-sm text-gray-500 text-center">
                                    No subcategories available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Name & SKU Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Product Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Premium RX Vial 30ml"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              SKU <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Auto-generated"
                                className="h-11 font-mono"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Description <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief product description (minimum 10 characters)..."
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">Minimum 10 characters required</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FormSection>

                {/* Product Images */}
                <FormSection
                  title="Product Images"
                  description="Upload product photos"
                  icon={Image}
                  iconColor="bg-green-500"
                  defaultOpen={!!isBasicInfoComplete}
                  badge={images?.length ? `${images.length} image(s)` : undefined}
                >
                  <ImageUploadField
                    form={form}
                    validateImage={(file) => {
                      const maxSize = 5 * 1024 * 1024
                      if (file.size > maxSize) return "Image size should be less than 5MB"
                      const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
                      if (!allowedTypes.includes(file.type)) return "Only JPG, PNG and GIF images are allowed"
                      return null
                    }}
                  />
                </FormSection>

                {/* Size Options & Pricing */}
                <FormSection
                  title="Sizes & Pricing"
                  description="Configure available sizes and prices"
                  icon={Ruler}
                  iconColor="bg-purple-500"
                  defaultOpen={!!isBasicInfoComplete}
                  badge={sizes?.length ? `${sizes.length} size(s)` : undefined}
                >
                  <SizeOptionsField form={form} isEditing={!!initialData} />
                </FormSection>

                {/* Advanced Options - Collapsed by Default */}
                <FormSection
                  title="Advanced Options"
                  description="Key features, customization, and more"
                  icon={Settings}
                  iconColor="bg-gray-500"
                  defaultOpen={false}
                  badge="Optional"
                >
                  <div className="space-y-6">
                    {/* Key Features */}
                    <FormField
                      control={form.control}
                      name="key_features"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Key Features</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3"
                              className="min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">List main product features</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Display Order */}
                    <FormField
                      control={form.control}
                      name="squanence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Display Order</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 1, 2, 3..."
                              className="h-11 w-32"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">Lower numbers appear first</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Customization */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Customization Options</h4>
                      <CustomizationSection form={form} />
                    </div>
                  </div>
                </FormSection>

                {/* Add Similar Products */}
                <FormSection
                  title="Similar Products"
                  description="Link similar or related products (max 2)"
                  icon={Package}
                  iconColor="bg-blue-500"
                  defaultOpen={false}
                  badge={form.watch("similar_products")?.length ? `${form.watch("similar_products").length}/2` : undefined}
                >
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="similar_products"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Select Similar Product Categories</FormLabel>
                          <div className="space-y-3">
                            {/* First Similar Product */}
                            <Select
                              onValueChange={(value) => {
                                const selectedSub = allSubcategories.find(s => s.id === Number(value))
                                if (selectedSub) {
                                  const current = field.value || []
                                  const newItem = {
                                    id: selectedSub.id,
                                    category_name: selectedSub.category_name,
                                    subcategory_name: selectedSub.subcategory_name
                                  }
                                  field.onChange([newItem, ...current.slice(1)])
                                }
                              }}
                              value={field.value?.[0]?.id?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Select first similar product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {allSubcategories.length > 0 ? (
                                  allSubcategories
                                    .filter(sub => !field.value?.some(v => v.id === sub.id) || field.value?.[0]?.id === sub.id)
                                    .map((sub) => (
                                      <SelectItem key={sub.id} value={sub.id.toString()}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{sub.subcategory_name}</span>
                                          <span className="text-xs text-gray-500">{sub.category_name}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                ) : (
                                  <div className="p-2 text-sm text-gray-500 text-center">
                                    No subcategories available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>

                            {/* Second Similar Product */}
                            <Select
                              onValueChange={(value) => {
                                const selectedSub = allSubcategories.find(s => s.id === Number(value))
                                if (selectedSub) {
                                  const current = field.value || []
                                  const newItem = {
                                    id: selectedSub.id,
                                    category_name: selectedSub.category_name,
                                    subcategory_name: selectedSub.subcategory_name
                                  }
                                  field.onChange([...current.slice(0, 1), newItem])
                                }
                              }}
                              value={field.value?.[1]?.id?.toString() || ""}
                              disabled={!field.value?.[0]}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder={field.value?.[0] ? "Select second similar product (optional)" : "Select first product first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {allSubcategories.length > 0 ? (
                                  allSubcategories
                                    .filter(sub => !field.value?.some(v => v.id === sub.id) || field.value?.[1]?.id === sub.id)
                                    .map((sub) => (
                                      <SelectItem key={sub.id} value={sub.id.toString()}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{sub.subcategory_name}</span>
                                          <span className="text-xs text-gray-500">{sub.category_name}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                ) : (
                                  <div className="p-2 text-sm text-gray-500 text-center">
                                    No subcategories available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>

                            {/* Clear buttons */}
                            {field.value && field.value.length > 0 && (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => field.onChange([])}
                                  className="text-xs"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Choose up to 2 subcategories for similar products</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FormSection>

                {/* Quick Tips */}
                {!initialData && (
                  <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900">Quick Tips</h4>
                          <ul className="text-sm text-amber-700 mt-1 space-y-1">
                            <li>• Select a category first - it auto-fills the name and SKU</li>
                            <li>• Add at least one size with pricing</li>
                            <li>• Images help customers identify products</li>
                            <li>• Click "Add New" next to Category to create new categories</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </form>
            </Form>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-white flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {completedSections.length === 3 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600 font-medium">Ready to save</span>
                  </>
                ) : (
                  <span>Complete required sections to save</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isBasicInfoComplete}
                  onClick={form.handleSubmit(handleSubmit)}
                  className="h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {initialData ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {initialData ? "Update Product" : "Add Product"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Manager Dialog */}
      <CategorySubcategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onSuccess={handleCategoryManagerSuccess}
      />
    </>
  )
}
