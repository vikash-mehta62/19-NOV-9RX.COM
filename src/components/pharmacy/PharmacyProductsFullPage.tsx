"use client"

import { useState, useEffect, useMemo } from "react"
import { BannerSlider } from "./components/BannerSlider"
import { CategoryCards } from "./components/CategoryCards"
import { QuickReorder } from "./components/QuickReorder"
import { WelcomeDashboard } from "./components/WelcomeDashboard"
import { DealsSection } from "./components/DealsSection"
import { RecentlyViewed } from "./components/RecentlyViewed"
import { FloatingCartButton } from "./components/FloatingCartButton"
import { PromoBanner } from "./components/PromoBanner"
import { SearchAutocomplete } from "./components/SearchAutocomplete"
import { StickyCartSummary } from "./components/StickyCartSummary"
import { PharmacyFilterSidebar } from "./components/product-showcase/PharmacyFilterSidebar"
import { PharmacyProductGrid } from "./components/product-showcase/PharmacyProductGrid"
import { InlineProductSizes } from "./components/InlineProductSizes"
import { supabase } from "@/supabaseClient"
import { SizeMatchBanner } from "@/components/search/SizeMatchBanner"
import { useToast } from "@/hooks/use-toast"
import { ProductDetails } from "./types/product.types"
import { selectUserProfile } from "@/store/selectors/userSelectors"
import { useSelector } from "react-redux"
import { useWishlist } from "@/hooks/use-wishlist"
import {
  Loader2, Search, Filter, SlidersHorizontal, X,
  ShoppingCart, User, Menu, FileText, Settings,
  Package, LogOut, Receipt, ChevronDown, Gift, CreditCard,
  HelpCircle, Heart, History, Star, Wallet, FileBarChart
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"
import { useCart } from "@/hooks/use-cart"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnnouncementDisplay } from "@/components/AnnouncementDisplay"

import image1 from "../../assests/home/image1.jpg";
import image2 from "../../assests/home/image2.jpg";
import image3 from "../../assests/home/image3.jpg";
import image4 from "../../assests/home/image4.jpg";
import image5 from "../../assests/home/image5.jpg";
import image6 from "../../assests/home/image6.jpg";

export const PharmacyProductsFullPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { cartItems, cartTotal } = useCart()
  const [products, setProducts] = useState<ProductDetails[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSubcategory, setSelectedSubcategory] = useState("all")
  const [priceRange, setPriceRange] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const userProfile = useSelector(selectUserProfile)
  const { wishlistItems, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const [categories, setCategories] = useState<string[]>([]); // Fetched categories from database

  const totalCartItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)

  //All Category images array.
  const imageArray = [image6, image2, image3, image4, image5, image1];

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('category_configs')
          .select('category_name')
          .order('category_name');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        const categoryNames = data?.map(item => item.category_name) || [];
        setCategories(categoryNames);
        console.log('PHARMACY -> Fetched categories:', categoryNames);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)

      // Fetch Group Pricing Data
      const { data: groupData, error: fetchError } = await supabase
        .from("group_pricing")
        .select("*")

      if (fetchError) {
        console.error("Error fetching group pricing:", fetchError.message)
        toast({
          title: "Warning",
          description: "Could not load pricing data. Prices shown may not reflect your group discounts.",
          variant: "default",
        })
      }
      try {
        const { data: productsData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)")

        if (error) throw error

        let ID = userProfile?.id

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
              ?.filter((size: any) => {
                const groupIds = size.groupIds || []
                const disAllowGroupIds = size.disAllogroupIds || []
                const isDisallowed = groupData?.some(
                  (group: any) => disAllowGroupIds.includes(group.id) && group.group_ids.includes(ID)
                )
                if (isDisallowed) return false
                if (groupIds.length === 0) return true
                return groupData?.some(
                  (group: any) => group.group_ids.includes(ID) && groupIds.includes(group.id)
                )
              })
              .map((size: any) => {
                let newPrice = size.price
                const applicableGroup = groupData?.find(
                  (group: any) =>
                    group.group_ids.includes(ID) &&
                    group.product_arrayjson.some((product: any) => product.product_id === size.id)
                )
                if (applicableGroup) {
                  const groupProduct = applicableGroup.product_arrayjson.find(
                    (product: any) => product.product_id === size.id
                  )
                  if (groupProduct) {
                    newPrice = parseFloat(groupProduct.new_price) || size.price
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
                  unitToggle: item?.unitToggle,
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
                }
              })
              .sort((a: any, b: any) => a.sizeSquanence - b.sizeSquanence) || [],
            tierPricing: item.enable_tier_pricing
              ? {
                tier1: { quantity: item.tier1_name || "", price: item.tier1_price || 0 },
                tier2: { quantity: item.tier2_name || "", price: item.tier2_price || 0 },
                tier3: { quantity: item.tier3_name || "", price: item.tier3_price || 0 },
              }
              : undefined,
          }
        })

        setProducts(mappedProducts)
      } catch (error) {
        console.error("Error fetching products:", error)
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [userProfile])

  // Filter products
  const filteredProducts = useMemo(() => {
    console.log('=== PHARMACY PRODUCTS FILTERING ===');
    console.log('Search query:', searchQuery);
    console.log('Total products:', products.length);

    let filtered = products

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      console.log('Filtering with query:', query);

      filtered = filtered.filter(
        (product) => {
          // Basic product search
          const basicMatch = product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.sku?.toLowerCase().includes(query)

          if (basicMatch) {
            console.log('Basic match found:', product.name);
            return true;
          }

          // Size-based search
          const sizeMatch = product.sizes?.some(size => {
            const sizeValueMatch = size.size_value?.toString().toLowerCase().includes(query);
            const sizeUnitMatch = size.size_unit?.toLowerCase().includes(query);
            const sizeSkuMatch = size.sku?.toLowerCase().includes(query);
            const combinedMatch = `${size.size_value}${size.size_unit}`.toLowerCase().includes(query.replace(/\s+/g, ''));

            if (sizeValueMatch || sizeUnitMatch || sizeSkuMatch || combinedMatch) {
              console.log('Size match found:', {
                product: product.name,
                size: `${size.size_value}${size.size_unit}`,
                sizeValueMatch,
                sizeUnitMatch,
                sizeSkuMatch,
                combinedMatch
              });
              return true;
            }
            return false;
          });

          return sizeMatch;
        }
      )

      console.log('Filtered products count:', filtered.length);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    if (selectedSubcategory !== "all") {
      filtered = filtered.filter(
        (product) => product.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      )
    }

    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map((v) => (v === "+" ? Infinity : parseInt(v)))
      filtered = filtered.filter((product) => {
        const price = product.base_price || 0
        return price >= min && (max === Infinity || price <= max)
      })
    }

    // Sort products
    if (sortBy === "price-low") {
      filtered = [...filtered].sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0))
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))
    } else if (sortBy === "newest") {
      filtered = [...filtered].sort((a, b) => Number(b.squanence || 0) - Number(a.squanence || 0))
    }

    // Add matching size info for highlighting
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.map(product => ({
        ...product,
        matchingSizes: product.sizes?.filter(size =>
          size.size_value?.toString().toLowerCase().includes(query) ||
          size.size_unit?.toLowerCase().includes(query) ||
          size.sku?.toLowerCase().includes(query) ||
          `${size.size_value}${size.size_unit}`.toLowerCase().includes(query.replace(/\s+/g, ''))
        ) || []
      }))

      console.log('Products with matching sizes:', filtered.filter(p => p.matchingSizes && p.matchingSizes.length > 0));
    }

    console.log('Final filtered products:', filtered.length);
    return filtered
  }, [products, searchQuery, selectedCategory, selectedSubcategory, priceRange, sortBy])

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setSelectedSubcategory("all")
    // Clear selected product when changing category
    setSelectedProduct(null)
  }

  const handleProductClick = (product: ProductDetails) => {
    // Toggle product selection - if same product clicked, deselect it
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(null)
    } else {
      setSelectedProduct(product)
    }
  }

  const handleImageClick = (imageUrl: string) => {
    setFullscreenImage(imageUrl)
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }

  const handleCloseFullscreen = () => {
    setFullscreenImage(null)
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setImageZoom(prev => {
      const newZoom = Math.max(prev - 0.2, 0.5)
      if (newZoom <= 1) {
        setImagePosition({ x: 0, y: 0 })
      }
      return newZoom
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      e.preventDefault()
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageZoom > 1 && e.touches.length === 1) {
      e.preventDefault()
      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({
        x: touch.clientX - imagePosition.x,
        y: touch.clientY - imagePosition.y
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && imageZoom > 1 && e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      setImagePosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Keyboard controls for fullscreen image viewer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!fullscreenImage) return

      switch (e.key) {
        case 'Escape':
          handleCloseFullscreen()
          break
      }
    }

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'unset'
    }
  }, [fullscreenImage])


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Announcements */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <AnnouncementDisplay userRole="pharmacy" />
      </div>

      {/* Promotional Banner */}
      <PromoBanner />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="Logo" className="h-8 sm:h-10 w-auto" />
            </div>

            {/* Search Bar with Autocomplete */}
            <div className="flex-1 max-w-md sm:max-w-xl">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onProductSelect={(productId) => {
                  const product = products.find(p => p.id === productId)
                  if (product) handleProductClick(product)
                }}
                placeholder="Search products..."
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarImage src={userProfile?.avatar} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs">
                        {userProfile?.first_name?.[0] || userProfile?.company_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{userProfile?.first_name || userProfile?.company_name || "User"}</span>
                      <span className="text-xs text-gray-500">{userProfile?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Shopping */}
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/order/create")}>
                    <ShoppingCart className="w-4 h-4 mr-2 text-emerald-600" />
                    Create Order {totalCartItems > 0 ? `(${totalCartItems} items)` : ""}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/orders")}>
                    <Package className="w-4 h-4 mr-2 text-blue-600" />
                    My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/order-history")}>
                    <History className="w-4 h-4 mr-2 text-purple-600" />
                    Order History
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Billing & Payments */}
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/invoices")}>
                    <Receipt className="w-4 h-4 mr-2 text-orange-600" />
                    Invoices
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/statements")}>
                    <FileBarChart className="w-4 h-4 mr-2 text-indigo-600" />
                    Statements
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/credit")}>
                    <Wallet className="w-4 h-4 mr-2 text-green-600" />
                    Credit Balance
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Rewards & Favorites */}
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/rewards")}>
                    <Gift className="w-4 h-4 mr-2 text-pink-600" />
                    Rewards & Points
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/wishlist")}>
                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                    Wishlist
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Account */}
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/settings")}>
                    <Settings className="w-4 h-4 mr-2 text-gray-600" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pharmacy/help")}>
                    <HelpCircle className="w-4 h-4 mr-2 text-cyan-600" />
                    Help & Support
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 cursor-pointer"
                    onClick={async () => {
                      await supabase.auth.signOut()
                      sessionStorage.clear()
                      localStorage.clear()
                      navigate("/login")
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Welcome Dashboard - Personalized greeting with stats */}
        <WelcomeDashboard />

        {/* Dynamic Banner Slider */}
        <BannerSlider
          bannerType="hero"
          autoPlay={true}
          autoPlayInterval={5000}
        />

        {/* Deals of the Day Section */}
        <DealsSection />

        {/* Quick Reorder Section */}
        <QuickReorder />

        {/* Recently Viewed Products */}
        <RecentlyViewed />

        {/* Products Section */}
        <div className="flex gap-4 lg:gap-6">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
            <div className="sticky top-20">
              <PharmacyFilterSidebar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedSubcategory={selectedSubcategory}
                setSelectedSubcategory={setSelectedSubcategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                products={filteredProducts}
                allProducts={products}
                onProductSelect={handleProductClick}
              />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 space-y-3 sm:space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Filter Button */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                      <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[300px] p-0">
                    <SheetHeader className="p-3 sm:p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600">
                      <SheetTitle className="text-white text-sm sm:text-base">Filters</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-60px)]">
                      <div className="p-3 sm:p-4">
                        <PharmacyFilterSidebar
                          searchQuery={searchQuery}
                          setSearchQuery={setSearchQuery}
                          selectedCategory={selectedCategory}
                          setSelectedCategory={setSelectedCategory}
                          selectedSubcategory={selectedSubcategory}
                          setSelectedSubcategory={setSelectedSubcategory}
                          priceRange={priceRange}
                          setPriceRange={setPriceRange}
                          products={filteredProducts}
                          allProducts={products}
                          onProductSelect={handleProductClick}
                        />
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold text-emerald-600">{filteredProducts.length}</span> products
                    {selectedCategory !== "all" && (
                      <span className="hidden sm:inline text-gray-500"> in "{selectedCategory}"</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* View Toggle */}
                <div className="hidden sm:flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 sm:p-2 transition-colors ${viewMode === "grid" ? "bg-emerald-100 text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("compact")}
                    className={`p-1.5 sm:p-2 transition-colors ${viewMode === "compact" ? "bg-emerald-100 text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
                    </svg>
                  </button>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[100px] sm:w-[140px] text-xs sm:text-sm h-8 sm:h-9 border-gray-200">
                    <SelectValue placeholder="Sort" />
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

            {/* Products */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 sm:h-64 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
                <Loader2 className="animate-spin text-emerald-500 mb-3 sm:mb-4" size={32} />
                <p className="text-gray-600 text-sm sm:text-base">Loading products...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Size Match Banner */}
                {!selectedProduct && searchQuery && filteredProducts.length > 0 && (
                  <SizeMatchBanner
                    searchQuery={searchQuery}
                    matchingCount={filteredProducts.filter(p => p.matchingSizes && p.matchingSizes.length > 0).length}
                  />
                )}

                {/* Enhanced Category Grid - Only show when no specific category is selected */}
                {selectedCategory === "all" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 lg:gap-8 mb-8 sm:mb-12">
                    {imageArray.map((image, index) => (
                      <div
                        key={index}
                        className="group relative flex flex-col items-center"
                      >
                        {categories[index] ? (
                          <div
                            onClick={() => handleCategorySelect(categories[index])}
                            className="relative cursor-pointer transform transition-all duration-500 ease-out hover:scale-105 hover:-translate-y-2 active:scale-95 w-full"
                          >
                            {/* Enhanced Image Container with Card Effect */}
                            <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-white p-6">
                              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-white aspect-square">
                                <img
                                  src={image}
                                  alt={`Category ${categories[index]}`}
                                  className="w-full h-full object-contain p-1 transition-transform duration-700 ease-out group-hover:scale-110"
                                />
                                
                                {/* Gradient Overlay on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {/* Hover Ring Effect */}
                                <div className="absolute inset-0 ring-2 ring-emerald-400/0 group-hover:ring-emerald-500/50 rounded-xl transition-all duration-500" />
                              </div>
                            </div>

                            {/* Enhanced Category Label */}
                            <div className="mt-4 text-center px-2">
                              <span className="text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-all duration-300 block leading-tight line-clamp-2">
                                {categories[index]}
                              </span>
                              {/* Animated Underline */}
                              <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-emerald-400 to-emerald-600 mx-auto mt-1.5 transition-all duration-500 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center opacity-40 hover:opacity-60 transition-opacity duration-300 w-full">
                            <div className="w-full aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50/50">
                              <Package className="w-12 h-12 text-gray-400" />
                            </div>
                            <span className="text-base text-gray-400 mt-4 font-medium">No Category</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show all products when no product is selected */}
                {selectedCategory !== "all" && !selectedProduct && (
                  <PharmacyProductGrid
                    products={filteredProducts}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onProductClick={handleProductClick}
                    searchQuery={searchQuery}
                  />
                )}

                {/* Show only selected product with its sizes */}
                {selectedCategory !== "all" && selectedProduct && (
                  <InlineProductSizes
                    product={selectedProduct}
                    wishlistItems={wishlistItems}
                    onAddToWishlist={addToWishlist}
                    onRemoveFromWishlist={removeFromWishlist}
                    isInWishlist={isInWishlist}
                    onClose={() => setSelectedProduct(null)}
                    onImageClick={handleImageClick}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Simple Gallery Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseFullscreen}
            className="absolute top-4 right-4 z-10 bg-white/10 text-white hover:bg-white/20 w-12 h-12"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
            onWheel={(e) => {
              e.preventDefault()
              if (e.deltaY < 0) {
                handleZoomIn()
              } else {
                handleZoomOut()
              }
            }}
          >
            <img
              src={fullscreenImage}
              alt="Product Image"
              className={`max-w-full max-h-full object-contain gallery-image no-select ${isDragging ? 'dragging' : ''}`}
              style={{
                transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Sticky Cart Summary */}
      <StickyCartSummary />

      {/* Floating Cart Button for Mobile */}
      <FloatingCartButton />
    </div>
  )
}

export default PharmacyProductsFullPage
