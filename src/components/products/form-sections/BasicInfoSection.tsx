"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "../schemas/productSchema"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CategorySubcategoryManager } from "./CategorySubcategoryManager"
import { PRODUCT_CATEGORIES } from "@/App"
import { supabase } from "@/integrations/supabase/client"

interface BasicInfoSectionProps {
  form: UseFormReturn<ProductFormValues>
  generateSKU: (category: string) => string
}

interface Subcategory {
  id: number
  category_name: string
  subcategory_name: string
}

export const BasicInfoSection = ({ form, generateSKU }: BasicInfoSectionProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) return;
      
      const { data, error } = await supabase
        .from('subcategory_configs')
        .select('*')
        .eq('category_name', selectedCategory)
        .order('subcategory_name');

      if (error) {
        console.error('Error fetching subcategories:', error);
        return;
      }

      setSubcategories(data || []);
    };

    fetchSubcategories();
  }, [selectedCategory]);

  return (
    <Card className="border border-gray-200 shadow-sm bg-white rounded-xl overflow-hidden">
      <CardContent className="p-8 space-y-8">
        {/* Category & Subcategory Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Category Information</h3>
            <Button 
              type="button" 
              onClick={() => setOpenDialog(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              + Manage Categories
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    Product Category 
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      setSelectedCategory(value)
                      form.setValue("subcategory", "")
                      form.setValue("name", value)
                      if (!form.getValues("sku")) {
                        form.setValue("sku", generateSKU(value))
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {PRODUCT_CATEGORIES.map((category) => (
                        <SelectItem 
                          key={category} 
                          value={category}
                          className="cursor-pointer hover:bg-blue-50"
                        >
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
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Subcategory
                  </FormLabel>
                  <Tabs defaultValue="select" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger 
                        value="select"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
                      >
                        Select
                      </TabsTrigger>
                      <TabsTrigger 
                        value="custom"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
                      >
                        Custom
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="select" className="mt-3">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedCategory}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed">
                            <SelectValue placeholder={selectedCategory ? "Choose subcategory" : "Select category first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[250px]">
                          {subcategories.length > 0 ? (
                            subcategories.map((sub) => (
                              <SelectItem 
                                key={sub.id} 
                                value={sub.subcategory_name}
                                className="cursor-pointer hover:bg-blue-50"
                              >
                                {sub.subcategory_name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              No subcategories available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="custom" className="mt-3">
                      <FormControl>
                        <Input 
                          placeholder="Enter custom subcategory name" 
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed" 
                          {...field}
                          disabled={!selectedCategory}
                        />
                      </FormControl>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Product Details Section */}
        <div className="space-y-6">
          <div className="pb-2 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Product Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    Product Name
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Premium RX Vial 30ml" 
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
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
                  <FormLabel className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    Product Code (SKU)
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., RXV-30ML-001" 
                      className="h-12 font-mono border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-6">
          <div className="pb-2 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Product Information</h3>
          </div>

          <FormField
            control={form.control}
            name="key_features"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-900">
                  Key Features
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3"
                    className="min-h-[100px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-gray-500 mt-1">List the main features of this product</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  Product Description
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a detailed description of the product, including materials, usage, and specifications..."
                    className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-gray-500 mt-1">Minimum 10 characters required</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
      <CategorySubcategoryManager
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSuccess={() => {
          // Refresh categories after changes
          window.location.reload();
        }}
      />
    </Card>
  )
}
