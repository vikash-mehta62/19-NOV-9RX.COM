
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
    <div className="mb-4 relative">
      <div className="aspect-square rounded-xl bg-gray-100/80 flex items-center justify-center p-4 group-hover:bg-white transition-colors">
        <img 
          src={imageUrl}
          alt={name}
          className=" h-[100%] object-contain transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg';
            console.log('Image load error, falling back to placeholder for:', name);
          }}
        />
      </div>
      {offer && (
        <Badge className="absolute top-2 right-2 bg-emerald-500">
          {offer}
        </Badge>
      )}
      <Badge 
        className={`absolute top-2 left-2 ${
          stockStatus === "Low Stock" ? "bg-amber-500" : "bg-blue-500"
        }`}
      >
        {stockStatus}
      </Badge>
    </div>
  );
};
