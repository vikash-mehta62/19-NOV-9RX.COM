import { Input } from "@/components/ui/input";
import { Search, Filter, Tag, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
}

interface CategoryConfig {
  id: string;
  category_name: string;
  size_units: string[];
  default_unit: string;
  has_rolls: boolean;
  requires_case: boolean;
}

interface SubcategoryConfig {
  id: string;
  subcategory_name: string;
  category_id: string;
}

export const SearchFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  priceRange,
  setPriceRange,
}: SearchFiltersProps) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryConfig[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<SubcategoryConfig[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  // Fetch categories and subcategories from config tables
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        console.log("🔵 Fetching categories and subcategories from config tables...");
        
        // Fetch categories from category_configs
        const { data: categoryData, error: categoryError } = await supabase
          .from("category_configs")
          .select("*")
          .order("category_name", { ascending: true });

        if (categoryError) {
          console.error("❌ Error fetching categories:", categoryError);
          throw categoryError;
        }

        console.log("✅ Fetched categories:", categoryData);

        // Fetch subcategories from subcategory_configs
        const { data: subcategoryData, error: subcategoryError } = await supabase
          .from("subcategory_configs")
          .select("*")
          .order("subcategory_name", { ascending: true });

        if (subcategoryError) {
          console.error("❌ Error fetching subcategories:", subcategoryError);
          throw subcategoryError;
        }

        console.log("✅ Fetched subcategories:", subcategoryData);

        // Get total products count
        const { count, error: countError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        if (!countError) {
          setTotalProducts(count || 0);
        }

        // Set categories with full data
        setCategories(categoryData || []);
        console.log("📁 Active categories:", categoryData?.map((c: any) => c.category_name));

        // Set subcategories with full data
        setSubcategories(subcategoryData || []);
        setFilteredSubcategories(subcategoryData || []);
        console.log("📂 Active subcategories:", subcategoryData?.map((s: any) => s.subcategory_name));

        console.log("✅ Filters loaded successfully");
        console.log(`📊 Total: ${categoryData?.length || 0} categories, ${subcategoryData?.length || 0} subcategories`);
      } catch (error) {
        console.error("❌ Error fetching filters:", error);
      }
    };

    fetchFilters();
  }, []);

  // Filter subcategories when category changes
  useEffect(() => {
    setSelectedSubcategory("all");
    
    if (selectedCategory === "all") {
      setFilteredSubcategories(subcategories);
    } else {
      // Find selected category ID
      const selectedCat = categories.find(
        (cat) => cat.category_name.toLowerCase() === selectedCategory.toLowerCase()
      );
      
      if (selectedCat) {
        // Filter subcategories by category_id
        const filtered = subcategories.filter(
          (sub) => sub.category_id === selectedCat.id
        );
        console.log(`📂 Filtered subcategories for ${selectedCat.category_name}:`, filtered.map(s => s.subcategory_name));
        setFilteredSubcategories(filtered);
      } else {
        setFilteredSubcategories([]);
      }
    }
  }, [selectedCategory, categories, subcategories]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setPriceRange("all");
  };

  const activeFiltersCount = [
    searchQuery !== "",
    selectedCategory !== "all",
    selectedSubcategory !== "all",
    priceRange !== "all",
  ].filter(Boolean).length;

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 rounded-2xl shadow-lg border border-purple-200/50 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Filter Products</h2>
            <p className="text-sm text-gray-600">
              {totalProducts} products available
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </p>
          </div>
        </div>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* SEARCH BOX */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-purple-600" />
        <Input
          placeholder="Search by product name, SKU, or description..."
          className="pl-12 py-6 rounded-xl border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* FILTERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CATEGORY */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-600" />
            Category {categories.length > 0 && <Badge variant="outline" className="text-xs">{categories.length}</Badge>}
          </label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="py-6 rounded-xl border-purple-200 text-gray-700 font-medium shadow-sm bg-white hover:border-purple-300 transition-colors">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">All Categories</span>
              </SelectItem>
              {categories.length === 0 ? (
                <SelectItem value="none" disabled>
                  <span className="text-gray-400">No categories found</span>
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.category_name.toLowerCase()}>
                    {category.category_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* SUBCATEGORY */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Tag className="h-4 w-4 text-pink-600" />
            Subcategory {filteredSubcategories.length > 0 && <Badge variant="outline" className="text-xs">{filteredSubcategories.length}</Badge>}
          </label>
          <Select 
            value={selectedSubcategory} 
            onValueChange={setSelectedSubcategory}
            disabled={selectedCategory === "all"}
          >
            <SelectTrigger className="py-6 rounded-xl border-purple-200 text-gray-700 font-medium shadow-sm bg-white hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <SelectValue placeholder={selectedCategory === "all" ? "Select category first" : "All Subcategories"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">All Subcategories</span>
              </SelectItem>
              {filteredSubcategories.length === 0 ? (
                <SelectItem value="none" disabled>
                  <span className="text-gray-400">
                    {selectedCategory === "all" ? "Select a category first" : "No subcategories for this category"}
                  </span>
                </SelectItem>
              ) : (
                filteredSubcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.subcategory_name.toLowerCase()}>
                    {subcategory.subcategory_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* PRICE RANGE */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Price Range
          </label>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="py-6 rounded-xl border-purple-200 text-gray-700 font-medium shadow-sm bg-white hover:border-purple-300 transition-colors">
              <SelectValue placeholder="All Prices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">All Prices</span>
              </SelectItem>
              <SelectItem value="0-20">Under $20</SelectItem>
              <SelectItem value="21-50">$21 - $50</SelectItem>
              <SelectItem value="51-100">$51 - $100</SelectItem>
              <SelectItem value="101+">$101 and above</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
          <span className="text-sm font-medium text-gray-600">Active Filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Search: "{searchQuery}"
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="bg-pink-100 text-pink-700">
              Category: {selectedCategory}
            </Badge>
          )}
          {selectedSubcategory !== "all" && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Subcategory: {selectedSubcategory}
            </Badge>
          )}
          {priceRange !== "all" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Price: ${priceRange}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
