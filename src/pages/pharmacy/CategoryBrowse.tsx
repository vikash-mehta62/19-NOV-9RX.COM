import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CategoryCard } from "@/components/pharmacy/components/CategoryCard";
import { supabase } from "@/supabaseClient";
import { Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CategoryWithCount {
  id: string;
  category_name: string;
  image_url?: string;
  productCount: number;
}

export default function CategoryBrowse() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategoriesWithCounts = async () => {
      try {
        setLoading(true);

        // Fetch all categories from category_configs
        const { data: categoryData, error: categoryError } = await supabase
          .from("category_configs")
          .select("id, category_name")
          .order("category_name");

        if (categoryError) {
          throw categoryError;
        }

        if (!categoryData || categoryData.length === 0) {
          setCategories([]);
          setLoading(false);
          return;
        }

        // Fetch product counts per category
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("category")
          .eq("is_active", true);

        if (productsError) {
          throw productsError;
        }

        // Calculate product count per category (case-insensitive)
        const productCountMap = new Map<string, number>();
        products?.forEach((product) => {
          if (product.category) {
            const categoryLower = product.category.toLowerCase();
            productCountMap.set(
              categoryLower,
              (productCountMap.get(categoryLower) || 0) + 1
            );
          }
        });

        // Combine categories with their product counts
        const categoriesWithCounts: CategoryWithCount[] = categoryData.map(
          (cat) => ({
            id: cat.id,
            category_name: cat.category_name,
            productCount:
              productCountMap.get(cat.category_name.toLowerCase()) || 0,
          })
        );

        setCategories(categoriesWithCounts);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesWithCounts();
  }, [toast]);

  const handleCategoryClick = (categoryName: string) => {
    // Navigate to /pharmacy/products?category={categoryName}
    navigate(`/pharmacy/products?category=${encodeURIComponent(categoryName)}`);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Browse Categories
          </h1>
          <p className="text-muted-foreground">
            Select a category to view products
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && categories.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">
              No Categories Found
            </h3>
            <p className="text-gray-500 mb-4">
              There are no product categories available at the moment.
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Category Grid */}
        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                categoryName={category.category_name}
                image={category.image_url}
                productCount={category.productCount}
                onClick={() => handleCategoryClick(category.category_name)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
