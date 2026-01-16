
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ProductImageProps {
  image: string;
  name: string;
  offer?: string;
  stockStatus: string;
}

export const ProductImage = ({ image, name, offer, stockStatus }: ProductImageProps) => {
  const [imageUrl, setImageUrl] = useState<string>('/placeholder.svg');


  useEffect(() => {
    const loadImage = async () => {
      if (image && image !== '/placeholder.svg') {
        try {
          // If the image is already a full URL, use it directly
          if (image.startsWith('http')) {
            setImageUrl(image);
            return;
          }

          // Get the public URL from Supabase storage
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(image);
          
          if (data?.publicUrl) {
            console.log('Loading image from:', data.publicUrl); // Debug log
            setImageUrl(data.publicUrl);
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setImageUrl('/placeholder.svg');
        }
      }
    };

    loadImage();
  }, [image]);

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full rounded-xl bg-gray-50 flex items-center justify-center p-3 sm:p-4 group-hover:bg-white transition-colors">
        <img 
          src={imageUrl}
          alt={name}
          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg';
            console.log('Image load error, falling back to placeholder for:', name);
          }}
        />
      </div>
      {offer && (
        <Badge className="absolute top-2 right-2 bg-blue-500 text-xs">
          {offer}
        </Badge>
      )}
      <Badge 
        className={`absolute top-2 left-2 text-xs ${
          stockStatus === "Low Stock" ? "bg-amber-500" : "bg-blue-500"
        }`}
      >
        {stockStatus}
      </Badge>
    </div>
  );
};
