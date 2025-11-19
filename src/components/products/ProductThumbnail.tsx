"use client";

import { useEffect, useState } from "react";

interface ProductThumbnailProps {
  product: {
    name: string;
    image_url?: string;
    image?: string;
    images?: string[];
    sizes?: { image?: string }[];
  };
}

export const ProductThumbnail = ({ product }: ProductThumbnailProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const basePath = "https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/";

    let finalImage: string | null = null;

    if (product.image_url && product.image_url.trim() !== "") {
      finalImage = product.image_url;
    } else if (
      Array.isArray(product.images) &&
      product.images.length > 0 &&
      product.images[0]?.trim() !== ""
    ) {
      finalImage = basePath + product.images[0];
    } else if (
      Array.isArray(product.sizes) &&
      product.sizes.length > 0
    ) {
      const sizeImage = product.sizes.find((s) => s.image && s.image.trim() !== "");
      if (sizeImage) finalImage = basePath + sizeImage.image!;
    }

    if (finalImage) {
      setImageUrl(finalImage);
    } else {
      setImageUrl(null);
      setLoading(false);
    }
  }, [product]);

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      {imageUrl ? (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md z-10">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-md"
            onLoad={() => setLoading(false)}
            onError={(e) => {
              setLoading(false);
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </>
      ) : (
        <div className="w-16 h-16 flex items-center justify-center text-[10px] text-gray-500 bg-gray-100 rounded-md">
          No image available
        </div>
      )}
    </div>
  );
};
