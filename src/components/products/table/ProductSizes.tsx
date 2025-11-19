import type { ProductSize } from "@/types/product"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface ProductSizesProps {
  sizes: ProductSize[]
}

export const ProductSizes = ({ sizes }: ProductSizesProps) => {
  if (!sizes || sizes.length === 0) {
    return <div className="text-sm text-muted-foreground">No size variations</div>
  }
  console.log(sizes)

  // Show first 2 sizes inline, rest in popup
  const displaySizes = sizes.slice(0, 2)
  const hasMore = sizes.length > 2

  return (
    <div className="space-y-1">
      {displaySizes.map((size) => (
        <div key={size.id} className="flex items-center justify-between text-sm">
          <span>
            {size.size_value}
            {size.size_unit}
          </span>
          <span className="font-medium">${formatPrice(size.price)}</span>
        </div>
      ))}

      {hasMore && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-0 h-auto">
              +{sizes.length - 2} more sizes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>All Sizes & Prices</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {sizes.map((size) => (
                  <div key={size.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {size.size_value}
                        {size.size_unit}
                      </span>
                      <span>
                      </span>
                      <Badge variant={size.stock > 0 ? "default" : "destructive"} className="w-fit mt-1">
                        SKU: {size.sku}
                        {/* {size.stock > 0 ? `${size.stock} in stock` : "Out of stock"} */}
                      </Badge>
                    </div>
                    <span className="font-semibold text-lg">${formatPrice(size.price)}  </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
