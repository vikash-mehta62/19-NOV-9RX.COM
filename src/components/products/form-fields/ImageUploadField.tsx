
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageGrid } from "./components/ImageGrid";
import { ImageUploadButton } from "./components/ImageUploadButton";

interface ImageUploadFieldProps {
  form: UseFormReturn<any>;
  validateImage: (file: File) => string | null;
}

export const ImageUploadField = ({ form, validateImage }: ImageUploadFieldProps) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadImages = async () => {
      const images = form.getValues("images") || [];
      if (images.length === 0) return;

      const imageUrls = await Promise.all(
        images.map(async (imagePath) => {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(imagePath);
          return data?.publicUrl || null;
        })
      );

      setPreviews(imageUrls.filter((url): url is string => url !== null));
    };

    loadImages();
  }, [form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const validationError = validateImage(file);
      if (validationError) {
        toast({
          title: "Error",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // Create a preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Add to form images array
      const currentImages = form.getValues("images") || [];
      form.setValue("images", [...currentImages, fileName]);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      setPreviews(prev => prev.slice(0, -1)); // Remove the preview if upload failed
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    try {
      const currentImages = form.getValues("images") || [];
      const imageToRemove = currentImages[index];

      // Remove from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('product-images')
        .remove([imageToRemove]);

      if (deleteError) {
        throw deleteError;
      }

      // Update form state and previews
      const newImages = currentImages.filter((_, i) => i !== index);
      form.setValue("images", newImages);
      setPreviews(prev => prev.filter((_, i) => i !== index));

      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Error",
        description: "Failed to remove image. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <FormField
      control={form.control}
      name="images"
      render={() => (
        <FormItem>
          <FormLabel className="text-base font-semibold">Product Images</FormLabel>
          <FormControl>
            <div className="space-y-4">
              {previews.length > 0 ? (
                <ImageGrid
                  previews={previews}
                  uploading={uploading}
                  onRemove={removeImage}
                  onUpload={handleImageUpload}
                />
              ) : (
                <ImageUploadButton
                  uploading={uploading}
                  hasExistingImages={false}
                  onUpload={handleImageUpload}
                />
              )}
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
