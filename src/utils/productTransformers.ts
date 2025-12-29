
import { Product } from "@/types/product";

export const transformProductData = (productsData: any[]): Product[] => {
  return productsData?.map(product => {
    // Calculate minimum price from sizes
    let minPrice = product.base_price || 0;
    
    if (product.sizes && product.sizes.length > 0) {
      const sizePrices = product.sizes.map((size: any) => size.price || 0).filter((price: number) => price > 0);
      if (sizePrices.length > 0) {
        minPrice = Math.min(...sizePrices);
      }
    }
    
    return {
      ...product,
      // Add displayPrice for minimum price
      displayPrice: minPrice,
      // Preserve matchingSizes if it exists (from size search)
      matchingSizes: product.matchingSizes || [],
      sizes: product.sizes?.map((size: any) => ({
        ...size,
        size_value: String(size.size_value),
        groupIds: size.groupIds || [],
        disAllogroupIds: size.disAllogroupIds || []
      })),
      customization: product.customization ? {
        allowed: (product.customization as any).allowed ?? false,
        options: (product.customization as any).options ?? [],
        price: typeof (product.customization as any).price === 'number' 
          ? (product.customization as any).price 
          : 0,
      } : {
        allowed: false,
        options: [],
        price: 0,
      }
    }
  }) || [];
};
