import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchCategoryConfigs } from '@/App';
import {
  Plus,
  Pencil,
  Loader2,
  Package,
  FolderTree,
  Ruler,
  Settings,
  X,
  CheckCircle,
  Trash2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  canDeleteCategory,
  canDeleteSubcategory,
  deleteCategoryById,
  deleteSubcategoryById,
  fetchOrderedCategories,
  fetchOrderedSubcategories,
  insertSubcategorySafely
} from '@/services/productTreeService';

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onSuccess?: () => void;
  initialTab?: 'category' | 'subcategory';
  initialCategory?: string;
}

interface Category {
  id: number;
  category_name: string;
  size_units: string[];
  default_unit: string;
  has_rolls: boolean;
  requires_case: boolean;
  display_order?: number | null;
  image_url?: string;
}

interface Subcategory {
  id: number;
  category_name: string;
  subcategory_name: string;
  display_order?: number | null;
}

const DEFAULT_UNITS = ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"];
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const CategorySubcategoryManager: React.FC<Props> = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialTab = 'category',
  initialCategory = '',
}) => {
  const [activeTab, setActiveTab] = useState<'category' | 'subcategory'>(initialTab);
  const [loading, setLoading] = useState(false);

  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    size_units: [] as string[],
    default_unit: '',
    has_rolls: false,
    requires_case: true,
    image_url: '' as string
  });
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [customUnit, setCustomUnit] = useState('');
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subcategory states
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(initialCategory);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState({
    category_name: '',
    subcategory_name: ''
  });
  const [subcategoryImage, setSubcategoryImage] = useState<File | null>(null);
  const [subcategoryImagePreview, setSubcategoryImagePreview] = useState<string>('');
  const [uploadingSubcategoryImage, setUploadingSubcategoryImage] = useState(false);
  const subcategoryFileInputRef = useRef<HTMLInputElement>(null);
  const [existingProducts, setExistingProducts] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // Set initial tab and category when dialog opens
      setActiveTab(initialTab);
      setSelectedCategoryForSub(initialCategory);
      
      // Also update the form if category is pre-selected
      if (initialCategory && initialTab === 'subcategory') {
        setSubcategoryForm({
          category_name: initialCategory,
          subcategory_name: ''
        });
      }
      
      fetchCategories();
      fetchSubcategories();
    } else {
      // Reset when dialog closes
      setActiveTab('category');
      setSelectedCategoryForSub('');
      setEditingSubcategory(null);
      setSubcategoryForm({
        category_name: '',
        subcategory_name: ''
      });
      setSubcategoryImage(null);
      setSubcategoryImagePreview('');
    }
  }, [open, initialTab, initialCategory]);

  useEffect(() => {
    if (selectedCategoryForSub) {
      fetchSubcategories(selectedCategoryForSub);
      fetchExistingProducts(selectedCategoryForSub);
    }
  }, [selectedCategoryForSub]);

  const fetchCategories = async () => {
    try {
      const data = await fetchOrderedCategories();
      setCategories((data || []) as Category[]);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchSubcategories = async (category?: string) => {
    try {
      const data = await fetchOrderedSubcategories(category);
      setSubcategories((data || []) as Subcategory[]);
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
      toast.error('Failed to fetch subcategories');
    }
  };

  // Fetch existing products for selected category (to show as subcategories)
  const fetchExistingProducts = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, subcategory')
        .eq('category', category)
        .order('name');

      if (error) throw error;

      // Get unique product names (these are treated as subcategories)
      const uniqueNames = Array.from(new Set(data?.map(p => p.subcategory || p.name).filter(Boolean))) as string[];
      setExistingProducts(uniqueNames);
    } catch (error) {
      console.error("Failed to fetch existing products:", error);
    }
  };

  // Category functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setCategoryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCategoryImage(null);
    setCategoryImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadCategoryImage = async (categoryId: string): Promise<string | null> => {
    if (!categoryImage) return null;

    setUploadingImage(true);
    try {
      const fileExt = categoryImage.name.split('.').pop();
      const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, categoryImage, { upsert: true });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.category_name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (categoryForm.size_units.length === 0) {
      toast.error('Please select at least one size unit');
      return;
    }

    if (!categoryForm.default_unit) {
      toast.error('Please select a default unit');
      return;
    }

    setLoading(true);

    try {
      // First insert the category
      const { data: newCategory, error } = await supabase
        .from('category_configs')
        .insert([{
          category_name: categoryForm.category_name,
          size_units: categoryForm.size_units,
          default_unit: categoryForm.default_unit,
          has_rolls: categoryForm.has_rolls,
          requires_case: categoryForm.requires_case
        }])
        .select()
        .single();

      if (error) throw error;

      // Upload image if provided
      let imageUrl = null;
      if (categoryImage && newCategory) {
        imageUrl = await uploadCategoryImage(newCategory.id);
        
        // Update category with image URL
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from('category_configs')
            .update({ image_url: imageUrl })
            .eq('id', newCategory.id);

          if (updateError) {
            console.error('Error updating image URL:', updateError);
          }
        }
      }

      toast.success('Category added successfully!');
      await fetchCategoryConfigs();
      await fetchCategories();
      resetCategoryForm();
      onSuccess?.(); // Notify parent to refresh categories
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add category'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('category_configs')
        .update(categoryForm)
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast.success('Category updated successfully!');
      await fetchCategoryConfigs();
      await fetchCategories();
      setEditingCategory(null);
      resetCategoryForm();
      onSuccess?.(); // Notify parent to refresh categories
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update category'));
    } finally {
      setLoading(false);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      category_name: category.category_name,
      size_units: category.size_units,
      default_unit: category.default_unit,
      has_rolls: category.has_rolls,
      requires_case: category.requires_case,
      image_url: category.image_url || ''
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      category_name: '',
      size_units: [],
      default_unit: '',
      has_rolls: false,
      requires_case: true,
      image_url: ''
    });
    setCustomUnits([]);
    setEditingCategory(null);
    setCategoryImage(null);
    setCategoryImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleUnit = (unit: string) => {
    setCategoryForm(prev => {
      const newUnits = prev.size_units.includes(unit)
        ? prev.size_units.filter(u => u !== unit)
        : [...prev.size_units, unit];

      if (!newUnits.includes(prev.default_unit)) {
        return { ...prev, size_units: newUnits, default_unit: '' };
      }

      return { ...prev, size_units: newUnits };
    });
  };

  const addCustomUnit = () => {
    const trimmedUnit = customUnit.trim().toUpperCase();

    if (!trimmedUnit) {
      toast.error('Please enter a unit name');
      return;
    }

    if (DEFAULT_UNITS.includes(trimmedUnit) || customUnits.includes(trimmedUnit)) {
      toast.error('This unit already exists');
      return;
    }

    setCustomUnits([...customUnits, trimmedUnit]);
    setCategoryForm(prev => ({
      ...prev,
      size_units: [...prev.size_units, trimmedUnit]
    }));
    setCustomUnit('');
    toast.success(`Added custom unit: ${trimmedUnit}`);
  };

  const removeCustomUnit = (unit: string) => {
    setCustomUnits(prev => prev.filter(u => u !== unit));
    setCategoryForm(prev => ({
      ...prev,
      size_units: prev.size_units.filter(u => u !== unit),
      default_unit: prev.default_unit === unit ? '' : prev.default_unit
    }));
  };

  // Subcategory functions
  const handleSubcategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSubcategoryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubcategoryImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSubcategoryImage = () => {
    setSubcategoryImage(null);
    setSubcategoryImagePreview('');
    if (subcategoryFileInputRef.current) {
      subcategoryFileInputRef.current.value = '';
    }
  };

  const uploadSubcategoryImage = async (productId: string): Promise<string | null> => {
    if (!subcategoryImage) return null;

    setUploadingSubcategoryImage(true);
    try {
      const fileExt = subcategoryImage.name.split('.').pop();
      const fileName = `product-${productId}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, subcategoryImage, { upsert: true });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingSubcategoryImage(false);
    }
  };

  const handleAddSubcategory = async () => {
    if (!subcategoryForm.category_name) {
      toast.error('Please select a category');
      return;
    }

    if (!subcategoryForm.subcategory_name.trim()) {
      toast.error('Please enter a subcategory name');
      return;
    }

    setLoading(true);

    try {
      // First, add to subcategory_configs table
      await insertSubcategorySafely(subcategoryForm);

      // Then, create/update product with same name as subcategory
      const productData = {
        name: subcategoryForm.subcategory_name,
        category: subcategoryForm.category_name,
        subcategory: subcategoryForm.subcategory_name,
        sku: `${subcategoryForm.category_name.substring(0, 3)}-${subcategoryForm.subcategory_name.substring(0, 3)}-${Date.now()}`.toUpperCase(),
        base_price: 0,
        current_stock: 0,
        min_stock: 0,
        reorder_point: 0,
        is_active: false // Admin will activate after adding sizes
      };

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (productError) throw productError;

      // Upload image if provided
      if (subcategoryImage && newProduct) {
        const imageUrl = await uploadSubcategoryImage(newProduct.id);
        
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              image_url: imageUrl,
              images: [imageUrl]
            })
            .eq('id', newProduct.id);

          if (updateError) {
            console.error('Error updating product image:', updateError);
          }
        }
      }

      toast.success('Subcategory added successfully! Product created.');
      await fetchSubcategories(selectedCategoryForSub);
      await fetchExistingProducts(selectedCategoryForSub);
      onSuccess?.();
      resetSubcategoryForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add subcategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory) return;

    setLoading(true);

    try {
      // Update subcategory_configs table
      const { error } = await supabase
        .from('subcategory_configs')
        .update({ subcategory_name: subcategoryForm.subcategory_name })
        .eq('id', editingSubcategory.id);

      if (error) throw error;

      // Also update the corresponding product in products table
      // Find product with old subcategory name and update it
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          name: subcategoryForm.subcategory_name,
          subcategory: subcategoryForm.subcategory_name 
        })
        .eq('category', editingSubcategory.category_name)
        .eq('subcategory', editingSubcategory.subcategory_name);

      if (productError) {
        console.error('Error updating product:', productError);
        // Don't throw - subcategory was updated successfully
      }

      // Upload image if provided
      if (subcategoryImage) {
        // Find the product we just updated
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('category', editingSubcategory.category_name)
          .eq('subcategory', subcategoryForm.subcategory_name)
          .limit(1);

        if (products && products.length > 0) {
          const imageUrl = await uploadSubcategoryImage(products[0].id);
          
          if (imageUrl) {
            await supabase
              .from('products')
              .update({ 
                image_url: imageUrl,
                images: [imageUrl]
              })
              .eq('id', products[0].id);
          }
        }
      }

      toast.success('Subcategory updated successfully!');
      await fetchSubcategories(selectedCategoryForSub);
      await fetchExistingProducts(selectedCategoryForSub);
      setEditingSubcategory(null);
      resetSubcategoryForm();
      onSuccess?.(); // Notify parent to refresh
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update subcategory'));
    } finally {
      setLoading(false);
    }
  };

  const startEditSubcategory = async (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      category_name: subcategory.category_name,
      subcategory_name: subcategory.subcategory_name
    });

    // Load existing product image
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('image_url')
        .eq('category', subcategory.category_name)
        .eq('subcategory', subcategory.subcategory_name)
        .limit(1);

      if (error) throw error;

      if (products && products.length > 0 && products[0].image_url) {
        const imageUrl = products[0].image_url;
        
        // Check if it's a full URL or storage path
        if (imageUrl.startsWith('http')) {
          setSubcategoryImagePreview(imageUrl);
        } else {
          // Get public URL from storage
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(imageUrl);
          
          if (data?.publicUrl) {
            setSubcategoryImagePreview(data.publicUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error loading product image:', error);
    }
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      category_name: selectedCategoryForSub,
      subcategory_name: ''
    });
    setEditingSubcategory(null);
    setSubcategoryImage(null);
    setSubcategoryImagePreview('');
    if (subcategoryFileInputRef.current) {
      subcategoryFileInputRef.current.value = '';
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      const guard = await canDeleteCategory(category.category_name);
      if (!guard.allowed) {
        toast.error(
          `Cannot delete "${category.category_name}". In use by ${guard.productCount} products and ${guard.subcategoryCount} subcategories.`
        );
        return;
      }

      const confirmed = window.confirm(
        `Delete category "${category.category_name}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      setLoading(true);
      await deleteCategoryById(category.id);

      if (selectedCategoryForSub === category.category_name) {
        setSelectedCategoryForSub('');
        setSubcategories([]);
        resetSubcategoryForm();
      }

      if (editingCategory?.id === category.id) {
        resetCategoryForm();
      }

      toast.success('Category deleted successfully!');
      await fetchCategoryConfigs();
      await fetchCategories();
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete category'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    try {
      const guard = await canDeleteSubcategory(
        subcategory.category_name,
        subcategory.subcategory_name
      );
      if (!guard.allowed) {
        toast.error(
          `Cannot delete "${subcategory.subcategory_name}". In use by ${guard.productCount} products.`
        );
        return;
      }

      const confirmed = window.confirm(
        `Delete subcategory "${subcategory.subcategory_name}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      setLoading(true);
      await deleteSubcategoryById(subcategory.id);

      if (editingSubcategory?.id === subcategory.id) {
        resetSubcategoryForm();
      }

      toast.success('Subcategory deleted successfully!');
      await fetchSubcategories(selectedCategoryForSub || undefined);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete subcategory'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Category & Subcategory Management
          </DialogTitle>
          <p className="text-purple-100 text-sm mt-1">
            Manage your product categories and subcategories
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'category' | 'subcategory')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="category" className="data-[state=active]:bg-white">
                <Package className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="subcategory" className="data-[state=active]:bg-white">
                <FolderTree className="h-4 w-4 mr-2" />
                Subcategories
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* CATEGORY TAB */}
            <TabsContent value="category" className="space-y-6 mt-4 m-0 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Category Form */}
                <Card className="border-2 border-purple-200 flex flex-col" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                  <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="font-bold text-lg text-gray-900">
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                      </h3>
                      {editingCategory && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetCategoryForm}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">

                    <div>
                      <Label>Category Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., CONTAINERS & CLOSURES"
                        value={categoryForm.category_name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                        className="mt-2"
                      />
                    </div>

                    {/* Category Image Upload */}
                    <div>
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Category Image
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      
                      {categoryImagePreview ? (
                        <div className="mt-2 relative">
                          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                            <img
                              src={categoryImagePreview}
                              alt="Category preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={removeImage}
                              className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Click X to remove image</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <Upload className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">Upload Category Image</p>
                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                          </div>
                        </button>
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Size Units <span className="text-red-500">*</span>
                      </Label>

                      {categoryForm.size_units.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-purple-50 rounded-lg">
                          {categoryForm.size_units.map(unit => (
                            <Badge key={unit} variant="secondary" className="uppercase">
                              {unit}
                              <X
                                className="h-3 w-3 ml-1 cursor-pointer"
                                onClick={() => toggleUnit(unit)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}

                      <ScrollArea className="h-32 mt-2 border rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {DEFAULT_UNITS.map(unit => (
                            <label
                              key={unit}
                              className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                                categoryForm.size_units.includes(unit)
                                  ? 'bg-purple-100 border border-purple-300'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <Checkbox
                                checked={categoryForm.size_units.includes(unit)}
                                onCheckedChange={() => toggleUnit(unit)}
                              />
                              <span className="text-sm uppercase">{unit}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Custom unit (e.g., TAB)"
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addCustomUnit()}
                        />
                        <Button onClick={addCustomUnit} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Default Unit <span className="text-red-500">*</span></Label>
                      <Select
                        value={categoryForm.default_unit}
                        onValueChange={(value) => setCategoryForm({ ...categoryForm, default_unit: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select default unit" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]">
                          {categoryForm.size_units.map(unit => (
                            <SelectItem key={unit} value={unit} className="uppercase">
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Card className="bg-gray-50">
                      <CardContent className="p-4 space-y-3">
                        <Label className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Configuration
                        </Label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={categoryForm.has_rolls}
                            onCheckedChange={(checked) =>
                              setCategoryForm({ ...categoryForm, has_rolls: !!checked })
                            }
                          />
                          <span className="text-sm">Has Rolls</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={categoryForm.requires_case}
                            onCheckedChange={(checked) =>
                              setCategoryForm({ ...categoryForm, requires_case: !!checked })
                            }
                          />
                          <span className="text-sm">Requires Case</span>
                        </label>
                      </CardContent>
                    </Card>

                    <Button
                      onClick={editingCategory ? handleEditCategory : handleAddCategory}
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 mt-4 flex-shrink-0"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : editingCategory ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories List */}
                <Card className="flex flex-col" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                  <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex-shrink-0">All Categories</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            className="flex justify-between items-center p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
                          >
                            <div>
                              <p className="font-medium">{category.category_name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Units: {category.size_units.join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditCategory(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(category)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SUBCATEGORY TAB */}
            <TabsContent value="subcategory" className="space-y-6 mt-4 m-0 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Subcategory Form */}
                <Card className="border-2 border-green-200 flex flex-col" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                  <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="font-bold text-lg text-gray-900">
                        {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                      </h3>
                      {editingSubcategory && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetSubcategoryForm}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">

                    <div>
                      <Label>Select Category <span className="text-red-500">*</span></Label>
                      <Select
                        value={editingSubcategory ? subcategoryForm.category_name : selectedCategoryForSub}
                        onValueChange={(value) => {
                          setSelectedCategoryForSub(value);
                          setSubcategoryForm({ ...subcategoryForm, category_name: value });
                        }}
                        disabled={!!editingSubcategory}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.category_name}>
                              {cat.category_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Subcategory Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., LIQUID BOTTLES"
                        value={subcategoryForm.subcategory_name}
                        onChange={(e) =>
                          setSubcategoryForm({ ...subcategoryForm, subcategory_name: e.target.value })
                        }
                        className="mt-2"
                      />
                      {existingProducts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-2">Existing products in this category:</p>
                          <div className="flex flex-wrap gap-1">
                            {existingProducts.map((name, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-green-100"
                                onClick={() => setSubcategoryForm({ ...subcategoryForm, subcategory_name: name })}
                              >
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subcategory Image Upload */}
                    <div>
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Product Image
                      </Label>
                      <input
                        ref={subcategoryFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSubcategoryImageSelect}
                        className="hidden"
                      />
                      
                      {subcategoryImagePreview ? (
                        <div className="mt-2 relative">
                          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                            <img
                              src={subcategoryImagePreview}
                              alt="Product preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={removeSubcategoryImage}
                              className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Click X to remove image</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => subcategoryFileInputRef.current?.click()}
                          className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <Upload className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">Upload Product Image</p>
                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                          </div>
                        </button>
                      )}
                    </div>

                    <Button
                      onClick={editingSubcategory ? handleEditSubcategory : handleAddSubcategory}
                      disabled={loading || !subcategoryForm.category_name}
                      className="w-full bg-green-600 hover:bg-green-700 mt-4 flex-shrink-0"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : editingSubcategory ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {editingSubcategory ? 'Update Subcategory' : 'Add Subcategory'}
                    </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Subcategories List */}
                <Card className="flex flex-col" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                  <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex-shrink-0">
                      {selectedCategoryForSub ? `Subcategories for ${selectedCategoryForSub}` : 'All Subcategories'}
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                      {selectedCategoryForSub ? (
                        <div className="space-y-2">
                          {subcategories.length > 0 ? (
                            subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex justify-between items-center p-4 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-all group"
                              >
                                <p className="font-medium">{sub.subcategory_name}</p>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditSubcategory(sub)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSubcategory(sub)}
                                    disabled={loading}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-sm">No subcategories found</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <FolderTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Select a category to view subcategories</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onSuccess?.();
            }}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
