"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronRight } from "lucide-react"

interface CategoryCardProps {
  categoryName: string
  image?: string
  productCount: number
  onClick: () => void
}

export const CategoryCard = ({
  categoryName,
  image,
  productCount,
  onClick,
}: CategoryCardProps) => {
  // Generate a gradient based on category name for visual variety
  const getGradient = (name: string) => {
    const gradients = [
      "from-emerald-500 to-teal-600",
      "from-blue-500 to-indigo-600",
      "from-purple-500 to-pink-600",
      "from-orange-500 to-red-600",
      "from-cyan-500 to-blue-600",
      "from-green-500 to-emerald-600",
    ]
    const index = name.length % gradients.length
    return gradients[index]
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-0"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image Section */}
        <div className={`relative h-40 bg-gradient-to-br ${getGradient(categoryName)} overflow-hidden`}>
          {image ? (
            <img
              src={image}
              alt={categoryName}
              className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-16 h-16 text-white/50" />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Product count badge */}
          <Badge className="absolute top-3 right-3 bg-white/90 text-gray-800 font-semibold px-2 py-1 text-xs">
            {productCount} Products
          </Badge>
        </div>

        {/* Content Section */}
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
              {categoryName}
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CategoryCard
