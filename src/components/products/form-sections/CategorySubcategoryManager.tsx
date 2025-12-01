import React, { useState, useEffect } from 'react';
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
import { fetchCategoryConfigs, PRODUCT_CATEGORIES } from '@/App';
import {
  Plus,
  Pencil,
  Loader2,
  Package,
  FolderTree,
  Ruler,
  Settings,
  X,
  AlertCircle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onSuccess?: () => void;
}

interface Category {
  id: number;
  category_name: string;
  size_units: string[];
  default_unit: string;
  has_rolls: boolean;
  requires_case: boolean;
}

interface Subcategory {
  id: number;
  category_name: string;
  subcategory_name: string;
}

const DEFAULT_UNITS = ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"];

export const CategorySubcategoryManager: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'category' | 'subcategory'>('category');
  const [loading, setLoading] = useState(false);

  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    size_units: [] as string[],
    default_unit: '',
    has_rolls: false,
    requires_case: true
  });
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [customUnit, setCustomUnit] = useState('');

  // Subcategory states
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState({
    category_name: '',
    subcategory_name: ''
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSubcategories();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCategoryForSub) {
      fetchSubcategories(selectedCategoryForSub);
    }
  }, [selectedCategoryForSub]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('category_configs')
      .select('*')
      .order('category_name');

    if (error) {
      toast.error('Failed to fetch categories');
      return;
    }

    setCategories(data || []);
  };

  const fetchSubcategories = async (category?: string) => {
    let query = supabase
      .from('subcategory_configs')
      .select('*')
      .order('subcategory_name');

    if (category) {
      query = query.eq('category_name', category);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to fetch subcategories');
      return;
    }

    setSubcategories(data || []);
  };

  // Category functions
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
      const { error } = await supabase
        .from('category_configs')
        .insert([categoryForm]);

      if (error) throw error;

      toast.success('Category added successfully!');
      await fetchCategoryConfigs();
      await fetchCategories();
      resetCategoryForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add category');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category');
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
      requires_case: category.requires_case
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      category_name: '',
      size_units: [],
      default_unit: '',
      has_rolls: false,
      requires_case: true
    });
    setCustomUnits([]);
    setEditingCategory(null);
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
      const { error } = await supabase
        .from('subcategory_configs')
        .insert([subcategoryForm]);

      if (error) throw error;

      toast.success('Subcategory added successfully!');
      await fetchSubcategories(selectedCategoryForSub);
      resetSubcategoryForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add subcategory');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('subcategory_configs')
        .update({ subcategory_name: subcategoryForm.subcategory_name })
        .eq('id', editingSubcategory.id);

      if (error) throw error;

      toast.success('Subcategory updated successfully!');
      await fetchSubcategories(selectedCategoryForSub);
      setEditingSubcategory(null);
      resetSubcategoryForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subcategory');
    } finally {
      setLoading(false);
    }
  };

  const startEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      category_name: subcategory.category_name,
      subcategory_name: subcategory.subcategory_name
    });
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      category_name: selectedCategoryForSub,
      subcategory_name: ''
    });
    setEditingSubcategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Category & Subcategory Management
          </DialogTitle>
          <p className="text-purple-100 text-sm mt-1">
            Manage your product categories and subcategories
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-6 pt-4">
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

          <ScrollArea className="h-[calc(90vh-200px)]">
            {/* CATEGORY TAB */}
            <TabsContent value="category" className="px-6 pb-6 space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Form */}
                <Card className="border-2 border-purple-200">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
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

                    <div>
                      <Label>Category Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., CONTAINERS & CLOSURES"
                        value={categoryForm.category_name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                        className="mt-2"
                      />
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
                        <SelectContent>
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
                      className="w-full bg-purple-600 hover:bg-purple-700"
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
                  </CardContent>
                </Card>

                {/* Categories List */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">All Categories</h3>
                    <ScrollArea className="h-[500px]">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditCategory(category)}
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SUBCATEGORY TAB */}
            <TabsContent value="subcategory" className="px-6 pb-6 space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subcategory Form */}
                <Card className="border-2 border-green-200">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
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
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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
                    </div>

                    <Button
                      onClick={editingSubcategory ? handleEditSubcategory : handleAddSubcategory}
                      disabled={loading || !subcategoryForm.category_name}
                      className="w-full bg-green-600 hover:bg-green-700"
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
                  </CardContent>
                </Card>

                {/* Subcategories List */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">
                      {selectedCategoryForSub ? `Subcategories for ${selectedCategoryForSub}` : 'All Subcategories'}
                    </h3>
                    <ScrollArea className="h-[500px]">
                      {selectedCategoryForSub ? (
                        <div className="space-y-2">
                          {subcategories.length > 0 ? (
                            subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex justify-between items-center p-4 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-all group"
                              >
                                <p className="font-medium">{sub.subcategory_name}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditSubcategory(sub)}
                                  className="opacity-0 group-hover:opacity-100"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
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
