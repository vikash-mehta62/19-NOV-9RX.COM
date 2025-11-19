"use client"

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Product } from "@/types/product"
import { Package2, DollarSign, Warehouse, Tag, ImageIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ProductPreviewProps {
  product: Product
}

export const ProductPreview = ({ product }: ProductPreviewProps) => {
  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh]">
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <Package2 className="h-6 w-6 text-blue-600" />
          {product.name}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[calc(90vh-100px)]">
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product Code</label>
                  <p className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      {product.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded">{product.description}</p>
                </div>
              )}

              {product.key_features && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Key Features</label>
                  <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded">{product.key_features}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {product.images && product.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5" />
                  Product Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`/placeholder.svg?height=200&width=200&query=product-image-${index + 1}`}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sizes and Pricing */}
          {product.sizes && product.sizes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Sizes & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.sizes.map((size, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</label>
                          <p className="text-lg font-semibold">
                            {size.size_value} {size.size_unit}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Price per Case
                          </label>
                          <p className="text-lg font-semibold text-green-600">${size.price}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Price per Unit
                          </label>
                          <p className="text-lg font-semibold text-blue-600">${size.price_per_case || 0}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</label>
                          <p className="text-lg font-semibold">{size.stock || 0}</p>
                        </div>
                      </div>
                      {size.sku && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</label>
                          <p className="text-sm font-mono bg-white px-2 py-1 rounded border inline-block">{size.sku}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Warehouse className="h-5 w-5" />
                Inventory Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{product.current_stock}</p>
                  <p className="text-sm text-gray-600">Current Stock</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{product.min_stock}</p>
                  <p className="text-sm text-gray-600">Min Stock</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{product.reorder_point}</p>
                  <p className="text-sm text-gray-600">Reorder Point</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{product.quantity_per_case || "N/A"}</p>
                  <p className="text-sm text-gray-600">Qty per Case</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </DialogContent>
  )
}
