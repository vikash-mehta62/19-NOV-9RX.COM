import { useState, useEffect, useMemo } from "react";
import { PharmacyFilterSidebar } from "./components/product-showcase/PharmacyFilterSidebar";
import { PharmacyProductGrid } from "./components/product-showcase/PharmacyProductGrid";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { ProductDetails } from "./types/product.types";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { useSelector } from "react-redux";
import { Loader2, Search, Filter, Package, Truck, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProductShowcaseProps {

  groupShow?: boolean;
  isEditing?: boolean;
  form?: any;

}
const ProductShowcase = ({ groupShow,isEditing=false,form={} }: ProductShowcaseProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const userProfile = useSelector(selectUserProfile);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      const userType = sessionStorage.getItem('userType');

      // Fetch Group Pricing Data
      const { data: groupData, error: fetchError } = await supabase
        .from("group_pricing")
        .select("*");

      if (fetchError) {
        console.error("Error fetching group pricing:", fetchError.message);
        return;
      }

      console.log("Fetched Group Data:", groupData);

      // Fetch Products with Sizes
      try {
        const { data: productsData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)");

        if (error) {
          throw error;
        }

        console.log("Fetched Products:", productsData);






        let ID = userProfile?.id;
 
        const mappedProducts: ProductDetails[] = productsData.map((item) => {
          return {
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: item.base_price || 0,
            base_price: item.base_price || 0,
            category: item.category || "",
            subcategory: item.subcategory || "",
            shipping_cost: item.shipping_cost || "",
            stock: item.current_stock || 0,
            minOrder: item.min_stock || 0,
            images: item.images,
            image: item.image_url || item.image || "/placeholder.svg",
            image_url: item.image_url || item.image || "/placeholder.svg",
            offer: "",
            endsIn: "",
            sku: item.sku,
            customization: {
              allowed: item.customization?.allowed || false,
              options: item.customization?.options || [],
              basePrice: item.customization?.price || 0,
            },
            key_features: item.key_features,
            squanence: item.squanence,
            productId: item.id.toString(),
            specifications: {
              safetyInfo: item.description || "",
            },
            quantityPerCase: item.quantity_per_case || 0,
         sizes: item.product_sizes
  ?.filter((size) => {
    const groupIds = size.groupIds || [];
    const disAllowGroupIds = size.disAllogroupIds || [];

    // ❌ If any group in disAllowGroupIds includes this user, skip this size
    const isDisallowed = groupData.some(
      (group) => disAllowGroupIds.includes(group.id) && group.group_ids.includes(ID)
    );
    if (isDisallowed) return false;

    // ✅ If size has no group restriction, it's public
    if (groupIds.length === 0) return true;

    // ✅ Allow if this user is part of any allowed group
    return groupData.some(
      (group) => group.group_ids.includes(ID) && groupIds.includes(group.id)
    );
  })

    .map((size) => {
      let newPrice = size.price;

      const applicableGroup = groupData.find(
        (group) =>
          group.group_ids.includes(ID) &&
          group.product_arrayjson.some((product) => product.product_id === size.id)
      );

      if (applicableGroup) {
        const groupProduct = applicableGroup.product_arrayjson.find(
          (product) => product.product_id === size.id
        );

        if (groupProduct) {
          newPrice = parseFloat(groupProduct.new_price) || size.price;
        }
      }

      return {
        id: size.id,
        size_value: size.size_value,
        size_unit: size.size_unit,
        rolls_per_case: size.rolls_per_case,
        sizeSquanence: size.sizeSquanence,
        price: newPrice,
        originalPrice: size.price === newPrice ? 0 : size.price,
        sku: size.sku || "",
        unitToggle:item?.unitToggle  ,
        key_features: size.key_features || "",
        squanence: size.squanence || "",
        quantity_per_case: size.quantity_per_case,
        pricePerCase: size.price_per_case,
        price_per_case: size.price_per_case,
        stock: size.stock,
        image: size.image || "",
        shipping_cost: Number(size.shipping_cost),
        case: size.case,
        unit: size.unit,
        groupIds: size.groupIds || [],
      };
    })
    .sort((a, b) => a.sizeSquanence - b.sizeSquanence) || [],

            tierPricing: item.enable_tier_pricing
              ? {
                  tier1: { quantity: item.tier1_name || "", price: item.tier1_price || 0 },
                  tier2: { quantity: item.tier2_name || "", price: item.tier2_price || 0 },
                  tier3: { quantity: item.tier3_name || "", price: item.tier3_price || 0 },
                }
              : undefined,
          };
        });
        

        console.log("Mapped Products with Discounts:", mappedProducts);
        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      }
    };


    fetchProducts();
  }, [userProfile]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Subcategory filter
    if (selectedSubcategory !== "all") {
      filtered = filtered.filter(
        (product) => product.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    // Price filter
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map((v) => (v === "+" ? Infinity : parseInt(v)));
      filtered = filtered.filter((product) => {
        const price = product.base_price || 0;
        return price >= min && (max === Infinity || price <= max);
      });
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedSubcategory, priceRange]);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  return (
    <div className="min-h-screen bg-gray-50/50 -m-6 p-6">
      {/* Promotional Banner - Elegant & Eye-catching */}
      {!groupShow && (
        <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 p-6 shadow-xl">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                  🎉 SPECIAL OFFER
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Premium Pharmacy Supplies
              </h2>
              <p className="text-emerald-100 text-sm md:text-base max-w-lg">
                Quality products at competitive prices. Free delivery on all orders!
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                <Package className="w-6 h-6 text-white mx-auto mb-1" />
                <div className="text-white font-bold text-lg">{filteredProducts.length}</div>
                <div className="text-emerald-100 text-xs">Products</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                <Truck className="w-6 h-6 text-white mx-auto mb-1" />
                <div className="text-white font-bold text-lg">FREE</div>
                <div className="text-emerald-100 text-xs">Delivery</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                <Star className="w-6 h-6 text-white mx-auto mb-1" />
                <div className="text-white font-bold text-lg">BULK</div>
                <div className="text-emerald-100 text-xs">Discounts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <PharmacyFilterSidebar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600">
                    <SheetTitle className="text-white">Filters</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-60px)]">
                    <div className="p-4">
                      <PharmacyFilterSidebar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        selectedSubcategory={selectedSubcategory}
                        setSelectedSubcategory={setSelectedSubcategory}
                        priceRange={priceRange}
                        setPriceRange={setPriceRange}
                      />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-emerald-600">{filteredProducts.length}</span> products
                  {selectedCategory !== "all" && (
                    <span className="hidden sm:inline text-gray-500"> in "{selectedCategory}"</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="hidden sm:flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${viewMode === "grid" ? "bg-emerald-100 text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-2 transition-colors ${viewMode === "compact" ? "bg-emerald-100 text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                  </svg>
                </button>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] text-sm h-9 border-gray-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : (
            <PharmacyProductGrid 
              products={filteredProducts} 
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductShowcase;
