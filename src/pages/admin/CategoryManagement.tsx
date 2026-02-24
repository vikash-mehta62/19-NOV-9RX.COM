import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { GripVertical, Save, RotateCcw, Image as ImageIcon } from "lucide-react";
import { fetchCategoryConfigs, bulkUpdateCategoryOrders, CategoryConfig } from "@/utils/categoryUtils";
import { supabase } from "@/supabaseClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCategoryItemProps {
  category: CategoryConfig;
  index: number;
}

const SortableCategoryItem = ({ category, index }: SortableCategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const [imageUrl, setImageUrl] = useState<string>("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Load image URL
  useEffect(() => {
    const loadImage = async () => {
      if (!category.image_url) {
        setImageUrl("");
        return;
      }

      try {
        if (category.image_url.startsWith("http")) {
          setImageUrl(category.image_url);
        } else {
          const { data } = supabase.storage
            .from("product-images")
            .getPublicUrl(category.image_url);
          if (data?.publicUrl) {
            setImageUrl(data.publicUrl);
          }
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setImageUrl("");
      }
    };
    loadImage();
  }, [category.image_url]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>

      {/* Category Image */}
      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={category.category_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-6 h-6 text-gray-400" />
        )}
      </div>

      <div className="flex-1">
        <div className="font-medium">{category.category_name}</div>
        <div className="text-sm text-gray-500">Display Order: {index + 1}</div>
        <div className="text-xs text-gray-400 mt-1 font-mono break-all">ID: {category.id}</div>
      </div>
    </div>
  );
};

const CategoryManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [originalCategories, setOriginalCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategoryConfigs();
      setCategories(data);
      setOriginalCategories(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newOrder;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create updates with new display_order based on array position
      const updates = categories.map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }));

      console.log('Saving category order:', updates);
      const success = await bulkUpdateCategoryOrders(updates);

      if (success) {
        toast({
          title: "Success",
          description: "Category order saved successfully",
        });
        // Reload from database to confirm changes
        await loadCategories();
      } else {
        throw new Error('Failed to update - check console for details');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category order. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCategories(JSON.parse(JSON.stringify(originalCategories)));
    setHasChanges(false);
    toast({
      title: "Reset",
      description: "Changes discarded",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Category Management</h1>
            <p className="text-gray-500 mt-1">
              Drag and drop to reorder categories. Changes affect all product displays.
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>
              Drag categories to reorder them. New categories will appear at the end by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      index={index}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No categories found
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• Categories are displayed in this order across all product pages</p>
            <p>• New categories added to the database will appear at the end automatically</p>
            <p>• Changes take effect immediately after saving</p>
            <p>• Users will see the new order on their next page load</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CategoryManagement;
