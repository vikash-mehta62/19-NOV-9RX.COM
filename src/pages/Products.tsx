import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, Search, ArrowRight, Package2, Filter, X, 
  Grid3X3, LayoutList, Sparkles, Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductCardSkeleton } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchMatchIndicator } from "@/components/search/SearchMatchIndicator";
import { getSearchMatches } from "@/utils/searchHighlight";
import { SizeMatchBanner } from "@/components/search/SizeMatchBanner";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  image_url: string;
  images: string[];
  sizes: any[];
  key_features: string;
}

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  onClick: () => void;
  searchQuery?: string;
}

const ProductCard = ({ product, viewMode, onClick, searchQuery = "" }: ProductCardProps) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Get search matches for highlighting
  const searchMatches = getSearchMatches(product, searchQuery);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px", threshold: 0.01 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Only load image when in view
  useEffect(() => {
    if (!isInView) return;
    
    const loadImage = async () => {
      const imagePath = product.images?.[0] || product.image_url;
      if (!imagePath || imagePath === "/placeholder.svg") {
        setImageUrl("/placeholder.svg");
        return;
      }
      try {
        if (imagePath.startsWith("http")) {
          setImageUrl(imagePath);
        } else {
          const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);
          if (data?.publicUrl) setImageUrl(data.publicUrl);
        }
      } catch {
        setImageUrl("/placeholder.svg");
      }
    };
    loadImage();
  }, [product.image_url, product.images, isInView]);

  // List view
  if (viewMode === "list") {
    return (
      <Card 
        ref={cardRef}
        className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" 
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        tabIndex={0}
        role="article"
        aria-label={`${product.name}. ${product.category || 'Product'}. ${product.sizes?.length || 0} sizes available. Login for pricing.`}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
            {/* Shimmer placeholder */}
            {(!isInView || !isImageLoaded) && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer"
                style={{ backgroundSize: "200% 100%" }}
                aria-hidden="true"
              />
            )}
            {isInView && (
              <img 
                src={imageUrl} 
                alt="" 
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className={`w-full h-full object-contain p-4 transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`} 
                onLoad={() => setIsImageLoaded(true)} 
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; setIsImageLoaded(true); }} 
              />
            )}
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              {product.category && (
                <Badge variant="secondary" className="mb-2 bg-emerald-100 text-emerald-800 border-emerald-200">
                  {product.category}
                </Badge>
              )}
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 mb-2 line-clamp-2">{product.name}</h3>
              
              {/* Search Match Indicator */}
              {searchQuery && searchMatches.length > 0 && (
                <SearchMatchIndicator 
                  matches={searchMatches} 
                  searchQuery={searchQuery}
                  className="mb-2"
                />
              )}
              
              <p className="text-gray-600 text-sm line-clamp-2 mb-4">{product.description || "Premium pharmacy supply"}</p>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                {product.sizes?.length > 0 && (
                  <span className="text-sm text-gray-600">{product.sizes.length} sizes</span>
                )}
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-xs font-medium">Login for pricing</span>
                </div>
              </div>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl min-h-[44px] px-5 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" 
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                aria-label={`View details for ${product.name}`}
              >
                View Details
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card 
      ref={cardRef}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" 
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      tabIndex={0}
      role="article"
      aria-label={`${product.name}. ${product.category || 'Product'}. ${product.sizes?.length || 0} sizes available. Login for pricing.`}
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {/* Shimmer placeholder */}
        {(!isInView || !isImageLoaded) && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
            aria-hidden="true"
          />
        )}
        {isInView && (
          <img 
            src={imageUrl} 
            alt="" 
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-contain p-6 group-hover:scale-110 transition-all duration-500 ${isImageLoaded ? "opacity-100" : "opacity-0"}`} 
            onLoad={() => setIsImageLoaded(true)} 
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; setIsImageLoaded(true); }} 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
          <Button 
            className="w-full bg-white text-gray-900 hover:bg-gray-100 rounded-xl min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500" 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={`View details for ${product.name}`}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        </div>
        {product.category && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-white/95 text-gray-800 border-0 shadow-sm">{product.category}</Badge>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 line-clamp-2 mb-3 min-h-[48px]">{product.name}</h3>
        
        {/* Search Match Indicator */}
        {searchQuery && searchMatches.length > 0 && (
          <SearchMatchIndicator 
            matches={searchMatches} 
            searchQuery={searchQuery}
            className="mb-3"
          />
        )}
        
        {product.sizes?.length > 0 && (
          <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-100">
            <span className="text-gray-600">Available sizes</span>
            <span className="font-medium text-emerald-700">{product.sizes.length} options</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-2 rounded-xl w-fit border border-amber-200">
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">Login for pricing</span>
        </div>
      </div>
    </Card>
  );
};

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setError(null);
      try {
        const { data, error: fetchError } = await supabase.from("products").select("*, product_sizes(*)").order("created_at", { ascending: false });
        if (fetchError) { 
          console.error(fetchError); 
          setError("Failed to load products. Please try again.");
          return; 
        }
        setProducts(data.map((item) => ({ id: item.id, name: item.name, description: item.description || "", category: item.category || "", subcategory: item.subcategory || "", image_url: item.image_url || "/placeholder.svg", images: item.images || [], sizes: item.product_sizes || [], key_features: item.key_features || "" })));
      } catch (e) { 
        console.error(e); 
        setError("An unexpected error occurred. Please try again.");
      } finally { 
        setLoading(false); 
      }
    };
    fetchProducts();
  }, []);

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    // Re-trigger useEffect by forcing a re-render
    setProducts([]);
    setTimeout(() => {
      const fetchProducts = async () => {
        try {
          const { data, error: fetchError } = await supabase.from("products").select("*, product_sizes(*)").order("created_at", { ascending: false });
          if (fetchError) { 
            setError("Failed to load products. Please try again.");
            return; 
          }
          setProducts(data.map((item) => ({ id: item.id, name: item.name, description: item.description || "", category: item.category || "", subcategory: item.subcategory || "", image_url: item.image_url || "/placeholder.svg", images: item.images || [], sizes: item.product_sizes || [], key_features: item.key_features || "" })));
        } catch (e) { 
          setError("An unexpected error occurred. Please try again.");
        } finally { 
          setLoading(false); 
        }
      };
      fetchProducts();
    }, 100);
  };

  const categories = useMemo(() => ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    if (selectedCategory !== "all") filtered = filtered.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (sortBy === "name-asc") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "name-desc") filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const clearFilters = () => { setSearchQuery(""); setSelectedCategory("all"); setSortBy("featured"); };
  const hasActiveFilters = searchQuery || selectedCategory !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Sign up today for exclusive wholesale pricing</span>
          <Button size="sm" variant="secondary" className="ml-2 h-7 bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}>Get Started</Button>
        </div>
      </div>

      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div 
              className="cursor-pointer shrink-0" 
              onClick={() => navigate("/")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate("/")}
              aria-label="Go to homepage"
            >
              <img src="/logo.png" alt="9RX Logo" className="h-10 w-auto" />
            </div>
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <Input 
                  placeholder="Search products, sizes, SKU, NDC codes..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-12 h-12 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                  aria-label="Search products"
                  role="searchbox"
                  title="Search in: Product name, description, category, SKU, size values, NDC/UPC codes"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                    aria-label="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a 
                href="tel:+18009696295" 
                className="hidden lg:flex items-center gap-2 text-gray-700 mr-4 hover:text-emerald-600 transition-colors min-h-[44px] px-2"
                aria-label="Call us at 1-800-969-6295"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">+1 (800) 969-6295</span>
              </a>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="min-h-[44px] rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Login
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" 
                onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
              >
                Sign Up Free
              </Button>
            </div>
          </div>
          <div className="mt-3 md:hidden relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <Input 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-12 h-11 rounded-xl bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Search products"
            />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 py-16 md:py-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6 px-4 py-2"><Package2 className="w-4 h-4 mr-2 inline" />Premium Pharmacy Supplies</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Quality Products for<span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Modern Pharmacies</span></h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">Browse our complete catalog. Sign up to unlock exclusive wholesale pricing.</p>
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 h-12" onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}>Get Wholesale Pricing<ArrowRight className="w-5 h-5 ml-2" /></Button>
        </div>
      </section>

      <div className="bg-white border-b sticky top-[73px] z-30" role="navigation" aria-label="Product categories">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by category">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  selectedCategory === cat 
                    ? "bg-emerald-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                role="tab"
                aria-selected={selectedCategory === cat}
                aria-controls="products-grid"
              >
                {cat === "all" ? "All Products" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="py-8 md:py-12" aria-label="Products catalog">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true"></div>
                <span className="text-gray-700 font-medium" aria-live="polite">{filteredProducts.length} products</span>
              </div>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters} 
                  className="text-gray-600 hover:text-gray-900 min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="Clear all filters"
                >
                  <X className="w-4 h-4 mr-1" aria-hidden="true" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="sm:hidden min-h-[44px] rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label="Open filters"
                  >
                    <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                  <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <div className="py-6">
                    <label className="text-sm font-medium mb-2 block" id="mobile-category-label">Category</label>
                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="mobile-category-label">
                      {categories.map((cat) => (
                        <button 
                          key={cat} 
                          onClick={() => { setSelectedCategory(cat); setMobileFiltersOpen(false); }} 
                          className={`px-4 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            selectedCategory === cat 
                              ? "bg-emerald-600 text-white" 
                              : "bg-gray-100 text-gray-700"
                          }`}
                          aria-pressed={selectedCategory === cat}
                        >
                          {cat === "all" ? "All" : cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="hidden sm:flex border border-gray-200 rounded-xl overflow-hidden" role="group" aria-label="View mode">
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={`p-3 min-h-[44px] min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                    viewMode === "grid" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <Grid3X3 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button 
                  onClick={() => setViewMode("list")} 
                  className={`p-3 min-h-[44px] min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                    viewMode === "list" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <LayoutList className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-11 rounded-xl focus:ring-2 focus:ring-emerald-500" aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error State */}
          {error && !loading && (
            <ErrorState
              variant="network"
              title="Failed to load products"
              description={error}
              onRetry={retryFetch}
              retryLabel="Try Again"
            />
          )}

          {/* Loading State */}
          {loading && (
            <div 
              className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
              aria-label="Loading products"
              role="status"
            >
              {[1,2,3,4,5,6,7,8].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Size Match Banner */}
          {!loading && !error && searchQuery && filteredProducts.length > 0 && (
            <SizeMatchBanner 
              searchQuery={searchQuery}
              matchingCount={filteredProducts.filter(p => p.matchingSizes && p.matchingSizes.length > 0).length}
            />
          )}

          {/* Products Grid */}
          {!loading && !error && filteredProducts.length > 0 && (
            <div 
              id="products-grid"
              className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
              role="list"
              aria-label="Products list"
            >
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  viewMode={viewMode} 
                  onClick={() => navigate(`/product/${product.id}`)} 
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredProducts.length === 0 && (
            <EmptyState
              variant={searchQuery ? "search" : "products"}
              title={searchQuery ? "No results found" : "No products found"}
              description={searchQuery ? `We couldn't find any products matching "${searchQuery}"` : "Try adjusting your filters to find what you're looking for."}
              onAction={clearFilters}
              actionLabel="Clear Filters"
            />
          )}
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Unlock Wholesale Pricing</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Join thousands of pharmacies saving on quality supplies.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-emerald-700 hover:bg-gray-100 rounded-xl px-8 min-h-[48px] font-semibold focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600" 
              onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
            >
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/40 text-white hover:bg-white/10 rounded-xl px-8 min-h-[48px] font-semibold focus-visible:ring-2 focus-visible:ring-white" 
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© {new Date().getFullYear()} 9RX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Products;
