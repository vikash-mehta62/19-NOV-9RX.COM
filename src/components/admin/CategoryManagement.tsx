import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCategoryConfigs } from "@/App"
import {
  canDeleteCategory,
  canDeleteSubcategory,
  deleteCategoryById,
  deleteSubcategoryById,
  fetchOrderedCategories,
  fetchOrderedSubcategories,
  insertSubcategorySafely
} from "@/services/productTreeService"

interface Category {
  id: number
  category_name: string
  size_units: string[]
  default_unit: string
  has_rolls: boolean
  requires_case: boolean
  display_order?: number | null
}

interface Subcategory {
  id: number
  category_name: string
  subcategory_name: string
  display_order?: number | null
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddSubcategory, setShowAddSubcategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const { toast } = useToast()

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
    size_units: ["count"],
    default_unit: "count",
    has_rolls: false,
    requires_case: true
  })

  const [subcategoryForm, setSubcategoryForm] = useState({
    category_name: "",
    subcategory_name: ""
  })

  useEffect(() => {
    fetchCategories()
    fetchSubcategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory)
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const data = await fetchOrderedCategories()
      setCategories((data || []) as Category[])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      })
    }
  }

  const fetchSubcategories = async (category?: string) => {
    try {
      const data = await fetchOrderedSubcategories(category)
      setSubcategories((data || []) as Subcategory[])
    } catch (error) {
      console.error("Failed to fetch subcategories:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subcategories",
        variant: "destructive"
      })
    }
  }

  const handleAddCategory = async () => {
    const { error } = await supabase
      .from('category_configs')
      .insert([categoryForm])

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Category added successfully"
    })

    await fetchCategoryConfigs()
    fetchCategories()
    setShowAddCategory(false)
    resetCategoryForm()
  }

  const handleEditCategory = async () => {
    if (!editingCategory) return

    const { error } = await supabase
      .from('category_configs')
      .update(categoryForm)
      .eq('id', editingCategory.id)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Category updated successfully"
    })

    await fetchCategoryConfigs()
    fetchCategories()
    setEditingCategory(null)
    resetCategoryForm()
  }

  const handleDeleteCategory = async (category: Category) => {
    try {
      const guard = await canDeleteCategory(category.category_name)
      if (!guard.allowed) {
        toast({
          title: "Cannot Delete Category",
          description: `"${category.category_name}" is used by ${guard.productCount} products and ${guard.subcategoryCount} subcategories.`,
          variant: "destructive"
        })
        return
      }

      const confirmed = window.confirm(
        `Delete category "${category.category_name}"? This action cannot be undone.`
      )
      if (!confirmed) return

      await deleteCategoryById(category.id)
      if (selectedCategory === category.category_name) {
        setSelectedCategory("")
      }

      toast({
        title: "Success",
        description: "Category deleted successfully"
      })

      await fetchCategoryConfigs()
      await fetchCategories()
      await fetchSubcategories(selectedCategory || undefined)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete category"),
        variant: "destructive"
      })
    }
  }

  const handleAddSubcategory = async () => {
    try {
      await insertSubcategorySafely(subcategoryForm)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to add subcategory"),
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Subcategory added successfully"
    })

    fetchSubcategories(selectedCategory)
    setShowAddSubcategory(false)
    resetSubcategoryForm()
  }

  const handleEditSubcategory = async () => {
    if (!editingSubcategory) return

    const { error } = await supabase
      .from('subcategory_configs')
      .update({ subcategory_name: subcategoryForm.subcategory_name })
      .eq('id', editingSubcategory.id)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Subcategory updated successfully"
    })

    fetchSubcategories(selectedCategory)
    setEditingSubcategory(null)
    resetSubcategoryForm()
  }

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    try {
      const guard = await canDeleteSubcategory(
        subcategory.category_name,
        subcategory.subcategory_name
      )
      if (!guard.allowed) {
        toast({
          title: "Cannot Delete Subcategory",
          description: `"${subcategory.subcategory_name}" is used by ${guard.productCount} products.`,
          variant: "destructive"
        })
        return
      }

      const confirmed = window.confirm(
        `Delete subcategory "${subcategory.subcategory_name}"? This action cannot be undone.`
      )
      if (!confirmed) return

      await deleteSubcategoryById(subcategory.id)
      toast({
        title: "Success",
        description: "Subcategory deleted successfully"
      })
      await fetchSubcategories(selectedCategory || undefined)
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete subcategory"),
        variant: "destructive"
      })
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      category_name: "",
      size_units: ["count"],
      default_unit: "count",
      has_rolls: false,
      requires_case: true
    })
  }

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      category_name: "",
      subcategory_name: ""
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Section */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Categories</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage product categories</p>
              </div>
              <Button 
                onClick={() => setShowAddCategory(true)} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <div 
                    key={category.id} 
                    className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                  >
                    <span className="font-medium text-gray-900">{category.category_name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-blue-100 hover:text-blue-700"
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryForm({
                            category_name: category.category_name,
                            size_units: category.size_units,
                            default_unit: category.default_unit,
                            has_rolls: category.has_rolls,
                            requires_case: category.requires_case
                          })
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-100 hover:text-red-700"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No categories found</p>
                  <p className="text-xs mt-1">Click "Add" to create one</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subcategories Section */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Subcategories</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage subcategories</p>
              </div>
              <Button 
                onClick={() => {
                  if (!selectedCategory) {
                    toast({
                      title: "Select Category",
                      description: "Please select a category first",
                      variant: "destructive"
                    })
                    return
                  }
                  setSubcategoryForm({ ...subcategoryForm, category_name: selectedCategory })
                  setShowAddSubcategory(true)
                }} 
                size="sm"
                disabled={!selectedCategory}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:bg-gray-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-900 mb-2 block">Select Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.category_name} className="cursor-pointer hover:bg-green-50">
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedCategory ? (
                subcategories.length > 0 ? (
                  subcategories.map((subcategory) => (
                    <div 
                      key={subcategory.id} 
                      className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all group"
                    >
                      <span className="text-gray-900">{subcategory.subcategory_name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-green-100 hover:text-green-700"
                          onClick={() => {
                            setEditingSubcategory(subcategory)
                            setSubcategoryForm({
                              category_name: subcategory.category_name,
                              subcategory_name: subcategory.subcategory_name
                            })
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-red-100 hover:text-red-700"
                          onClick={() => handleDeleteSubcategory(subcategory)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No subcategories found</p>
                    <p className="text-xs mt-1">Click "Add" to create one</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Select a category to view subcategories</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showAddCategory || !!editingCategory} onOpenChange={(open) => {
        if (!open) {
          setShowAddCategory(false)
          setEditingCategory(null)
          resetCategoryForm()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {editingCategory ? "Update the category name" : "Create a new product category"}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.category_name}
                onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                placeholder="e.g., CONTAINERS & CLOSURES"
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddCategory(false)
                setEditingCategory(null)
                resetCategoryForm()
              }}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={editingCategory ? handleEditCategory : handleAddCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subcategory Dialog */}
      <Dialog open={showAddSubcategory || !!editingSubcategory} onOpenChange={(open) => {
        if (!open) {
          setShowAddSubcategory(false)
          setEditingSubcategory(null)
          resetSubcategoryForm()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {editingSubcategory 
                ? "Update the subcategory name" 
                : `Create a new subcategory for ${selectedCategory}`}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">
                Subcategory Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={subcategoryForm.subcategory_name}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, subcategory_name: e.target.value })}
                placeholder="e.g., LIQUID BOTTLES"
                className="h-11 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddSubcategory(false)
                setEditingSubcategory(null)
                resetSubcategoryForm()
              }}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={editingSubcategory ? handleEditSubcategory : handleAddSubcategory}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {editingSubcategory ? "Update Subcategory" : "Add Subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
