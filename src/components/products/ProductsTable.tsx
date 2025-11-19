"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaginationControls } from "@/components/ui/PaginationControls"
import type { Product } from "@/types/product"
import { TrendingUp } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ProductActions } from "./table/ProductActions"
import { ProductSizes } from "./table/ProductSizes"
import { formatPrice } from "@/lib/utils"
import { ProductThumbnail } from "./ProductThumbnail"

interface ProductsTableProps {
  products: Product[]
  currentPage: number
  totalProducts: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  groupId?: string
}

export const ProductsTable = ({
  products,
  currentPage,
  totalProducts,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  groupId,
}: ProductsTableProps) => {
  const getGroupPrice = (product: Product, groupId?: string) => {
    if (!groupId) return product.base_price
    const groupPricingRules = JSON.parse(localStorage.getItem("groupPricing") || "[]")
    const applicableRule = groupPricingRules.find(
      (rule: any) => rule.pharmacyGroups.includes(groupId) && rule.status === "active",
    )
    return applicableRule ? product.base_price * (1 - applicableRule.discountPercentage) : product.base_price
  }

  console.log(products)
  // Mobile Card View
  const MobileProductCard = ({ product }: { product: Product }) => (
    <Card className="mb-4 shadow-sm border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">{product.name}</CardTitle>
            <p className="text-sm text-gray-600 mb-2">Product Code: {product.sku}</p>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {product.category}
            </Badge>
          </div>
          <ProductActions product={product} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="space-y-2">
            {groupId && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  ${formatPrice(getGroupPrice(product, groupId))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="border-t pt-3">
          <ProductSizes sizes={product.sizes || []} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* Mobile View */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {products.map((product) => (
            <MobileProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="shadow-sm">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-gray-900">Product</TableHead>
                  <TableHead className="font-semibold text-gray-900">Product Code</TableHead>
                  <TableHead className="font-semibold text-gray-900">Sizes & Prices</TableHead>
                  {groupId && <TableHead className="font-semibold text-gray-900">Group Price</TableHead>}
                  <TableHead className="font-semibold text-gray-900">Category</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="max-w-[200px]">
                        <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                          
                               <ProductThumbnail product={product} />

                          
                          {product.name}</p>
                     
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{product.sku}</code>
                    </TableCell>
                    <TableCell>
                      <ProductSizes sizes={product.sizes || []} />
                    </TableCell>
                    {groupId && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-semibold">
                            ${formatPrice(getGroupPrice(product, groupId))}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductActions product={product} onEdit={onEdit} onDelete={onDelete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalProducts}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}
