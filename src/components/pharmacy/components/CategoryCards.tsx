"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"
import { Package, Pill, Droplet, FileText, Syringe, Box, MoreHorizontal } from "lucide-react"

interface Category {
  id: string
  category_name: string
  icon?: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  "rx vials": <Pill className="w-6 h-6" />,
  "rx labels": <FileText className="w-6 h-6" />,
  "liquid ovals": <Droplet className="w-6 h-6" />,
  "ointment jars": <Box className="w-6 h-6" />,
  "oral syringes": <Syringe className="w-6 h-6" />,
  "rx paper bags": <Package className="w-6 h-6" />,
  "default": <Package className="w-6 h-6" />
}

const categoryColors: Record<string, string> = {
  "rx vials": "from-blue-500 to-cyan-500",
  "rx labels": "from-purple-500 to-pink-500",
  "liquid ovals": "from-amber-500 to-orange-500",
  "ointment jars": "from-emerald-500 to-teal-500",
  "oral syringes": "from-rose-500 to-red-500",
  "rx paper bags": "from-indigo-500 to-violet-500",
  "default": "from-gray-500 to-gray-600"
}

interface CategoryCardsProps {
  onCategorySelect: (category: string) => void
  selectedCategory: string
}

export const CategoryCards = ({ onCategorySelect, selectedCategory }: CategoryCardsProps) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("category_configs")
        .select("*")
        .order("category_name")
      setCategories(data || [])
    }
    fetchCategories()
  }, [])

  const displayCategories = showAll ? categories : categories.slice(0, 6)

  const getIcon = (name: string) => {
    const key = name.toLowerCase()
    for (const [k, icon] of Object.entries(categoryIcons)) {
      if (key.includes(k)) return icon
    }
    return categoryIcons.default
  }

  const getColor = (name: string) => {
    const key = name.toLowerCase()
    for (const [k, color] of Object.entries(categoryColors)) {
      if (key.includes(k)) return color
    }
    return categoryColors.default
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Quick Categories</h3>
        {categories.length > 6 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? "Show Less" : `+${categories.length - 6} More`}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {/* All Categories */}
        <button
          onClick={() => onCategorySelect("all")}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
            selectedCategory === "all"
              ? "bg-blue-100 border-2 border-blue-500 shadow-md"
              : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">All</span>
        </button>

        {displayCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategorySelect(cat.category_name.toLowerCase())}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all transform hover:scale-105 ${
              selectedCategory.toLowerCase() === cat.category_name.toLowerCase()
                ? "bg-blue-100 border-2 border-blue-500 shadow-lg scale-105"
                : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md"
            }`}
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getColor(cat.category_name)} text-white shadow-sm`}>
              {getIcon(cat.category_name)}
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight line-clamp-2 ${
              selectedCategory.toLowerCase() === cat.category_name.toLowerCase()
                ? "text-blue-700 font-bold"
                : "text-gray-700"
            }`}>
              {cat.category_name.split(' ').slice(0, 2).join(' ')}
            </span>
          </button>
        ))}

        {!showAll && categories.length > 6 && (
          <button
            onClick={() => setShowAll(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all"
          >
            <div className="p-2 rounded-lg bg-gray-200 text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-gray-500">More</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default CategoryCards
