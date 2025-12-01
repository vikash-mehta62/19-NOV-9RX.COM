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
import { fetchCategoryConfigs, PRODUCT_CATEGORIES } from "@/App"

interface Category {
  id: number
  category_name: string
  size_units: string[]
  default_unit: string
  has_rolls: boolean
  requires_case: boolean
}

interface Subcategory {
  id: number
  category_name: string
  subcategory_name: string
}

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
    const { data, error } = await supabase
      .from('category_configs')
      .select('*')
      .order('category_name')

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      })
      return
    }

    setCategories(data || [])
  }

  const fetchSubcategories = async (category?: string) => {
    let query = supabase
      .from('subcategory_configs')
      .select('*')
      .order('subcategory_name')

    if (category) {
      query = query.eq('category_name', category)
    }

    const { data, error } = await query

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subcategories",
        variant: "destructive"
      })
      return
    }

    setSubcategories(data || [])
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

  const handleAddSubcategory = async () => {
    const { error } = await supabase
      .from('subcategory_configs')
      .insert([subcategoryForm])

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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-700"
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
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
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
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm disabled:bg-gray-300"
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
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer hover:bg-green-50">
                      {cat}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 hover:text-green-700"
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
