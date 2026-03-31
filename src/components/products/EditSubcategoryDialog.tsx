import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { CustomizationSection } from './form-fields/Customizations';
import type { ProductFormValues } from './schemas/productSchema';
import { fetchOrderedSubcategories } from '@/services/productTreeService';

interface EditSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onSuccess?: () => void;
}

interface ProductData {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  image_url: string;
  images: string[];
  unitToggle: boolean;
  customization?: {
    allowed?: boolean;
    options?: string[];
    price?: number;
  };
  similar_products?: Array<{
    id: number;
    category_name: string;
    subcategory_name: string;
  }>;
  sizes: Array<{
    id: string;
    size_value: string;
    size_unit: string;
    price: number;
    stock: number;
  }>;
}

export const EditSubcategoryDialog: React.FC<EditSubcategoryDialogProps> = ({
  open,
  onOpenChange,
  productId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [unitToggle, setUnitToggle] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [allSubcategories, setAllSubcategories] = useState<Array<{
    id: number;
    category_name: string;
    subcategory_name: string;
  }>>([]);
  const customizationForm = useForm<ProductFormValues>({
    defaultValues: {
      customization: {
        allowed: false,
        options: [],
        price: 0,
      },
      similar_products: [],
    } as ProductFormValues,
  });

  useEffect(() => {
    if (open && productId) {
      loadProductData();
      loadSubcategories();
    }
  }, [open, productId]);

  const loadSubcategories = async () => {
    try {
      const data = await fetchOrderedSubcategories();
      setAllSubcategories(data);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
      setAllSubcategories([]);
    }
  };

  const loadProductData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          subcategory,
          description,
          image_url,
          images,
          unitToggle,
          customization,
          similar_products,
          sizes:product_sizes(id, size_value, size_unit, price, stock)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      setProductData(data as ProductData);
      setSubcategoryName(data.subcategory || '');
      setDescription(data.description || '');
      setUnitToggle(data.unitToggle || false);
      customizationForm.reset({
        customization: {
          allowed: data.customization?.allowed ?? false,
          options: data.customization?.options ?? [],
          price: data.customization?.price ?? 0,
        },
        similar_products: data.similar_products || [],
      } as ProductFormValues);
      
      // Set image preview
      if (data.image_url) {
        const imageUrl = data.image_url.startsWith('http') 
          ? data.image_url 
          : supabase.storage.from('product-images').getPublicUrl(data.image_url).data.publicUrl;
        setImagePreview(imageUrl);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load subcategory data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `product-${productId}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSave = async () => {
    if (!subcategoryName.trim()) {
      toast.error('Subcategory name is required');
      return;
    }

    setSaving(true);
    try {
      // Upload image if new one selected
      let imageUrl = productData?.image_url;
      if (imageFile) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          imageUrl = uploadedPath;
        }
      }

      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          name: subcategoryName, // Product name same as subcategory
          subcategory: subcategoryName,
          description: description,
          unitToggle: unitToggle,
          customization: customizationForm.getValues('customization'),
          similar_products: customizationForm.getValues('similar_products') || [],
          image_url: imageUrl,
          images: imageUrl ? [imageUrl] : []
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Subcategory updated successfully!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast.error('Failed to update subcategory');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Edit Subcategory
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Subcategory Name */}
            <div>
              <Label htmlFor="subcategory" className="text-base font-semibold">
                Subcategory Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subcategory"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="e.g., LIQUID BOTTLES"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">This will be used as both subcategory and product name</p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description..."
                rows={4}
                className="mt-2"
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label className="text-base font-semibold">Product Image</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              
              {imagePreview ? (
                <div className="mt-2 relative">
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="mt-2 w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Upload Image</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                </label>
              )}
            </div>

            {/* Customization Toggle */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Customization Options
              </Label>
              <CustomizationSection form={customizationForm} />
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">
                Similar Products
              </Label>
              <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
                <Label className="text-sm font-medium">Select Similar Product Categories</Label>

                <Select
                  onValueChange={(value) => {
                    const selectedSub = allSubcategories.find((sub) => sub.id === Number(value));
                    if (selectedSub) {
                      const current = customizationForm.getValues('similar_products') || [];
                      const newItem = {
                        id: selectedSub.id,
                        category_name: selectedSub.category_name,
                        subcategory_name: selectedSub.subcategory_name,
                      };
                      // Clear second selection when first changes
                      customizationForm.setValue('similar_products', [newItem], {
                        shouldDirty: true,
                      });
                    }
                  }}
                  value={customizationForm.watch('similar_products')?.[0]?.id?.toString() || ''}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="Select first similar product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allSubcategories.length > 0 ? (
                      allSubcategories
                        .filter((sub) => {
                          const current = customizationForm.getValues('similar_products') || [];
                          return !current.some((value) => value.id === sub.id) || current[0]?.id === sub.id;
                        })
                        .map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{sub.subcategory_name}</span>
                              <span className="text-xs text-gray-500">{sub.category_name}</span>
                            </div>
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        No subcategories available
                      </div>
                    )}
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(value) => {
                    const selectedSub = allSubcategories.find((sub) => sub.id === Number(value));
                    if (selectedSub) {
                      const current = customizationForm.getValues('similar_products') || [];
                      const newItem = {
                        id: selectedSub.id,
                        category_name: selectedSub.category_name,
                        subcategory_name: selectedSub.subcategory_name,
                      };
                      customizationForm.setValue('similar_products', [...current.slice(0, 1), newItem], {
                        shouldDirty: true,
                      });
                    }
                  }}
                  value={customizationForm.watch('similar_products')?.[1]?.id?.toString() || ''}
                  disabled={!customizationForm.watch('similar_products')?.[0]}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue
                      placeholder={
                        customizationForm.watch('similar_products')?.[0]
                          ? 'Select second similar product (optional)'
                          : 'Select first product first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allSubcategories.length > 0 ? (
                      allSubcategories
                        .filter((sub) => {
                          const current = customizationForm.getValues('similar_products') || [];
                          return !current.some((value) => value.id === sub.id) || current[1]?.id === sub.id;
                        })
                        .map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{sub.subcategory_name}</span>
                              <span className="text-xs text-gray-500">{sub.category_name}</span>
                            </div>
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        No subcategories available
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {(customizationForm.watch('similar_products') || []).length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        customizationForm.setValue('similar_products', [], {
                          shouldDirty: true,
                        })
                      }
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}

                <p className="text-xs text-gray-500">Choose up to 2 subcategories for similar products</p>
              </div>
            </div>

            {/* Unit Toggle - Moved here, just above Products */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="unitToggle" className="text-base font-semibold">
                  Show Unit in Product Display
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Display product unit (e.g., "8 OZ" vs "8")
                </p>
              </div>
              <Switch
                id="unitToggle"
                checked={unitToggle}
                onCheckedChange={setUnitToggle}
              />
            </div>

            {/* Products List - Always visible, unit display changes based on toggle */}
            <div>
              <Label className="text-base font-semibold">Products</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {productData?.sizes?.length || 0} product{productData?.sizes?.length === 1 ? '' : 's'} available
                  </span>
                  <Badge className="bg-blue-100 text-blue-700">
                    Total Stock: {productData?.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0}
                  </Badge>
                </div>
                {productData?.sizes && productData.sizes.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {productData.sizes.map((size) => (
                      <div key={size.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                        <span className="font-medium">
                          {size.size_value} {unitToggle ? size.size_unit : ''}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">${size.price}</span>
                          <span className="text-gray-500">Stock: {size.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No products added yet</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                To manage products, use the "Show" button in the main view
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
