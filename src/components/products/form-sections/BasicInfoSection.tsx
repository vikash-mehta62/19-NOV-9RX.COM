"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "../schemas/productSchema"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import CategorySelectorDialog from "./AddCategory"
import { PRODUCT_CATEGORIES } from "@/App"

interface BasicInfoSectionProps {
  form: UseFormReturn<ProductFormValues>
  generateSKU: (category: string) => string
}

export const BasicInfoSection = ({ form, generateSKU }: BasicInfoSectionProps) => {
  const [openDialog, setOpenDialog] = useState(false);

  return (
    <Card className="border-0 shadow-none bg-gray-50/50">
      <CardContent className="p-6 space-y-6">



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-4 justify-between items-center">
                  <FormLabel className="text-sm font-semibold text-gray-700">Product Category *</FormLabel>

                  {<Button onClick={() => setOpenDialog(true)}>Add Category</Button>}

                </div>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue("name", value)
                    if (!form.getValues("sku")) {
                      form.setValue("sku", generateSKU(value))
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((category) => (
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Product Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Product Code *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product code" className="h-11 font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* <FormField
            control={form.control}
            name="squanence"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Product Sequence</FormLabel>
                <FormControl>
                  <Input placeholder="Enter sequence number" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
        </div>




     

        <FormField
          control={form.control}
          name="key_features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Key Features</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter key features of the product"
                  className="min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Product Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter detailed product description"
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CategorySelectorDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onAddSuccess={() => {
          // Optional: refresh data in parent
        }}
      />
    </Card>
  )
}
