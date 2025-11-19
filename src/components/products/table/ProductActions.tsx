"use client"

import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ProductPreview } from "./ProductPreview"
import { useState } from "react"

interface ProductActionsProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  selectedSizesSKU?: string[]
}

export const ProductActions = ({ product, onEdit, onDelete }: ProductActionsProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setSelectedProduct(product)
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
          </DialogTrigger>
          {selectedProduct && <ProductPreview product={selectedProduct} />}
        </Dialog>

        <DropdownMenuItem onClick={() => onEdit(product)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
