import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, Search, ArrowRight, Package2, Filter, X, 
  Grid3X3, LayoutList, Sparkles, Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
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
}

const ProductCard = ({ product, viewMode, onClick }: ProductCardProps) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
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
  }, [product.image_url, product.images]);

  if (viewMode === "list") {
    return (
      <Card className="group bg-white rounded-2xl overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer" onClick={onClick}>
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-50 flex items-center justify-center shrink-0">
            {!isImageLoaded && <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
            <img src={imageUrl} alt={product.name} className={`w-full h-full object-contain p-4 ${isImageLoaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setIsImageLoaded(true)} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; setIsImageLoaded(true); }} />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              {product.category && <Badge variant="secondary" className="mb-2 bg-emerald-50 text-emerald-700">{product.category}</Badge>}
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 mb-2">{product.name}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-4">{product.description || "Premium pharmacy supply"}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {product.sizes?.length > 0 && <span className="text-sm text-gray-500">{product.sizes.length} sizes</span>}
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Login for pricing</span>
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full" onClick={(e) => { e.stopPropagation(); onClick(); }}>View Details<ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group bg-white rounded-2xl overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-1" onClick={onClick}>
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {!isImageLoaded && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}
        <img src={imageUrl} alt={product.name} className={`w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500 ${isImageLoaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setIsImageLoaded(true)} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; setIsImageLoaded(true); }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
          <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 rounded-full" onClick={(e) => { e.stopPropagation(); onClick(); }}>View Details<ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
        {product.category && <div className="absolute top-4 left-4"><Badge className="bg-white/90 text-gray-700 border-0 shadow-sm">{product.category}</Badge></div>}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 line-clamp-2 mb-3 min-h-[48px]">{product.name}</h3>
        {product.sizes?.length > 0 && <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-100"><span className="text-gray-500">Available sizes</span><span className="font-medium text-emerald-600">{product.sizes.length} options</span></div>}
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full w-fit"><Lock className="w-4 h-4" /><span className="text-sm font-medium">Login for pricing</span></div>
      </div>
    </Card>
  );
};

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*, product_sizes(*)").order("created_at", { ascending: false });
        if (error) { console.error(error); return; }
        setProducts(data.map((item) => ({ id: item.id, name: item.name, description: item.description || "", category: item.category || "", subcategory: item.subcategory || "", image_url: item.image_url || "/placeholder.svg", images: item.images || [], sizes: item.product_sizes || [], key_features: item.key_features || "" })));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

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
            <div className="cursor-pointer shrink-0" onClick={() => navigate("/")}><img src="/logo.png" alt="Logo" className="h-10 w-auto" /></div>
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 rounded-full border-gray-200 bg-gray-50" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-5 h-5" /></button>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href="tel:+18009696295" className="hidden lg:flex items-center gap-2 text-gray-600 mr-4"><Phone className="w-4 h-4" /><span className="text-sm">+1 (800) 969-6295</span></a>
              <Button variant="ghost" onClick={() => navigate("/login")}>Login</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6" onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}>Sign Up Free</Button>
            </div>
          </div>
          <div className="mt-3 md:hidden relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-11 rounded-full bg-gray-50" />
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

      <div className="bg-white border-b sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedCategory === cat ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{cat === "all" ? "All Products" : cat}</button>)}
          </div>
        </div>
      </div>

      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-gray-700 font-medium">{filteredProducts.length} products</span></div>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500"><X className="w-4 h-4 mr-1" />Clear</Button>}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild><Button variant="outline" size="sm" className="sm:hidden"><Filter className="w-4 h-4 mr-2" />Filters</Button></SheetTrigger>
                <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                  <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <div className="py-6"><label className="text-sm font-medium mb-2 block">Category</label><div className="flex flex-wrap gap-2">{categories.map((cat) => <button key={cat} onClick={() => { setSelectedCategory(cat); setMobileFiltersOpen(false); }} className={`px-4 py-2 rounded-full text-sm ${selectedCategory === cat ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}>{cat === "all" ? "All" : cat}</button>)}</div></div>
                </SheetContent>
              </Sheet>
              <div className="hidden sm:flex border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-emerald-100 text-emerald-700" : "text-gray-400"}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-emerald-100 text-emerald-700" : "text-gray-400"}`}><LayoutList className="w-4 h-4" /></button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="featured">Featured</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="name-asc">Name: A-Z</SelectItem><SelectItem value="name-desc">Name: Z-A</SelectItem></SelectContent></Select>
            </div>
          </div>

          {loading ? (
            <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>{[1,2,3,4,5,6,7,8].map((i) => <div key={i} className={`bg-white rounded-2xl animate-pulse ${viewMode === "grid" ? "h-[380px]" : "h-[180px]"}`} />)}</div>
          ) : filteredProducts.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>{filteredProducts.map((product) => <ProductCard key={product.id} product={product} viewMode={viewMode} onClick={() => navigate(`/product/${product.id}`)} />)}</div>
          ) : (
            <div className="text-center py-20"><div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="w-10 h-10 text-gray-400" /></div><h3 className="text-xl font-semibold mb-2">No products found</h3><p className="text-gray-500 mb-6">Try adjusting your filters</p><Button onClick={clearFilters} variant="outline">Clear filters</Button></div>
          )}
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6"><Lock className="w-8 h-8 text-white" /></div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Unlock Wholesale Pricing</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">Join thousands of pharmacies saving on quality supplies.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 rounded-full px-8 h-12" onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}>Create Free Account<ArrowRight className="w-5 h-5 ml-2" /></Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-12" onClick={() => navigate("/login")}>Sign In</Button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8"><div className="max-w-7xl mx-auto px-4 text-center"><p className="text-sm">© 2024 All rights reserved.</p></div></footer>
    </div>
  );
};

export default Products;
