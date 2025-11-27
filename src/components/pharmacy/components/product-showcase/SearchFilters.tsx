import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_CATEGORIES } from "@/types/product";

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
}

export const SearchFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
}: SearchFiltersProps) => {
  return (
    <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Filter Products</h2>

      {/* SEARCH BOX */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
        <Input
          placeholder="Search products..."
          className="pl-12 py-6 rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CATEGORY */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="py-6 rounded-xl border-gray-300 text-gray-700 font-medium shadow-sm bg-white">
            <Filter className="w-4 h-4 mr-2 text-purple-600" />
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category.toLowerCase()}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PRICE RANGE */}
        <Select value={priceRange} onValueChange={setPriceRange}>
          <SelectTrigger className="py-6 rounded-xl border-gray-300 text-gray-700 font-medium shadow-sm bg-white">
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="0-20">Under $20</SelectItem>
            <SelectItem value="21-50">$21 - $50</SelectItem>
            <SelectItem value="51+">$51 and above</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
