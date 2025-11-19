
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageGrid } from "./components/ImageGrid";
import { ImageUploadButton } from "./components/ImageUploadButton";

interface ImageUploadFieldProps {
    form: any;
    indexValue: any;
    validateImage: (file: File) => string | null;
    onUpdateSize: (index: number, field: string, value: string | number) => void;

}

export const SizeImageUploader = ({ form, validateImage, indexValue, onUpdateSize }: ImageUploadFieldProps) => {

    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    console.log(form)

    const [previews, setPreviews] = useState<string>("");

    useEffect(() => {
        const loadImage = async () => {
            if (!form.image) return; // Agar koi image nahi hai to return

            const { data } = supabase.storage.from('product-images').getPublicUrl(form.image);
            setPreviews(data?.publicUrl || "");
        };

        loadImage();
    }, [form.image]);

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
                setPreviews(result);
            };
            reader.readAsDataURL(file);

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);

            if (uploadError) {
                throw uploadError;
            }

            // Update form image
            onUpdateSize(indexValue, "image", fileName);

            toast({
                title: "Success",
                description: "Image uploaded successfully",
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            setPreviews(""); // Reset preview if upload fails
            toast({
                title: "Error",
                description: "Failed to upload image. Please try again.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const removeImage = async () => {
        try {
            if (!form.image) return;

            const { error: deleteError } = await supabase.storage.from('product-images').remove([form.image]);

            if (deleteError) {
                console.log(deleteError)
                throw deleteError;
            }

            onUpdateSize(indexValue, "image", ""); // Reset form field
            setPreviews(""); // Reset preview

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
                    <FormLabel className="text-base font-semibold">Size Images</FormLabel>
                    <FormControl>
                        <div className="space-y-4">
                            {previews ? (
                                <div className="relative w-40 h-40">
                                    <img
                                        src={previews}
                                        alt="Uploaded preview"
                                        className="w-full h-full object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
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
