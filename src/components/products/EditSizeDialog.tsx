"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import Select from "react-select"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Upload, X } from "lucide-react"

type GroupOption = {
  id: string
  name: string
}

export type EditableSize = {
  id: string
  size_name?: string
  size_value: string
  size_unit: string
  sku?: string
  price: number
  price_per_case?: number
  stock: number
  quantity_per_case: number
  shipping_cost?: number
  ndcCode?: string
  upcCode?: string
  lotNumber?: string
  exipry?: string
  groupIds?: string[]
  disAllogroupIds?: string[]
  image?: string
  is_active?: boolean
}

const calculateSizeUnitPrice = (size: {
  price?: number | string
  quantity_per_case?: number | string
  rolls_per_case?: number | string
}) => {
  const price = Number(size.price) || 0
  const quantity = Number(size.quantity_per_case) || 0
  const rolls = Number(size.rolls_per_case) || 1

  if (quantity <= 0) return 0

  return Number((price / (rolls > 0 ? rolls * quantity : quantity)).toFixed(2))
}

interface EditSizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  size: EditableSize | null
  onSave: (size: EditableSize) => Promise<void>
  title?: string
  saveLabel?: string
  sizeUnits?: string[]
  defaultUnit?: string
  showUnitField?: boolean
}

export function EditSizeDialog({
  open,
  onOpenChange,
  size,
  onSave,
  title = "Edit Size",
  saveLabel = "Save Changes",
  sizeUnits = ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"],
  defaultUnit = "unit",
  showUnitField = true,
}: EditSizeDialogProps) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<EditableSize | null>(size)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingSizeImage, setUploadingSizeImage] = useState(false)
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (size) {
      // If size_unit is empty or null, set it to defaultUnit
      const finalSize = {
        ...size,
        size_unit: size.size_unit || defaultUnit
      };
      setDraft(finalSize);
    } else {
      setDraft(size);
    }
  }, [size, defaultUnit]);

  useEffect(() => {
    if (!open) return

    const fetchGroupOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, company_name, first_name, last_name, display_name, email")
          .eq("type", "pharmacy")
          .eq("status", "active")

        if (error) throw error

        const pharmacies = (data || [])
          .map((profile) => {
            let name = ""
            if (!name) name = profile.display_name?.trim()
            if (!name && (profile.first_name || profile.last_name)) {
              name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            }
            if (!name) name = profile.email?.split("@")[0] || "Unnamed Pharmacy"

            return { id: profile.id, name }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        setGroupOptions(pharmacies)
      } catch (error) {
        console.error("Error fetching pharmacy options:", error)
      }
    }

    fetchGroupOptions()
  }, [open])

  useEffect(() => {
    if (!draft?.image) return

    if (draft.image.startsWith("http")) {
      setImageUrls((prev) => ({ ...prev, [draft.image!]: draft.image! }))
      return
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(draft.image)
    if (data?.publicUrl) {
      setImageUrls((prev) => ({ ...prev, [draft.image!]: data.publicUrl }))
    }
  }, [draft?.image])

  const unitPrice = useMemo(() => calculateSizeUnitPrice(draft || {}), [draft])

  const handleFieldChange = (field: keyof EditableSize, value: string | number | string[]) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleEditSizeImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingSizeImage(true)

      const fileExt = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const { error } = await supabase.storage.from("product-images").upload(fileName, file)

      if (error) throw error

      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName)
      setImageUrls((prev) => ({ ...prev, [fileName]: data.publicUrl }))
      setDraft((prev) => (prev ? { ...prev, image: fileName } : prev))

      toast({
        title: "Success",
        description: "Size image uploaded successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload size image",
        variant: "destructive",
      })
    } finally {
      setUploadingSizeImage(false)
      event.target.value = ""
    }
  }

  const handleRemoveEditSizeImage = async () => {
    if (!draft?.image) return

    try {
      const existingImage = draft.image

      if (!existingImage.startsWith("http")) {
        const { error } = await supabase.storage.from("product-images").remove([existingImage])
        if (error) throw error
      }

      setDraft((prev) => (prev ? { ...prev, image: "" } : prev))
      setImageUrls((prev) => {
        const next = { ...prev }
        delete next[existingImage]
        return next
      })

      toast({
        title: "Success",
        description: "Size image removed successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove size image",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!draft) return

    try {
      setIsSaving(true)
      await onSave(draft)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <p className=" font-semibold">{draft?.size_name}</p>
        {draft && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {draft.size_value} {showUnitField ? draft.size_unit : ''}
              </Badge>
              {draft.sku && <Badge variant="outline">{draft.sku}</Badge>}
              <span className="text-green-600 font-semibold">${Number(draft.price || 0).toFixed(2)}/CS</span>
              <span className="text-blue-600 font-semibold">${unitPrice.toFixed(2)}/Unit</span>
              <span className="text-orange-600 font-semibold">{draft.stock || 0} Stock</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Product Name</Label>
                <Input value={draft.size_name || ""} onChange={(e) => handleFieldChange("size_name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Size Value</Label>
                <Input value={draft.size_value} onChange={(e) => handleFieldChange("size_value", e.target.value)} className="mt-1" />
              </div>
              {showUnitField && (
                <div>
                  <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Unit</Label>
                  <UiSelect
                    value={draft.size_unit || defaultUnit}
                    onValueChange={(value) => handleFieldChange("size_unit", value)}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeUnits.map((unit) => (
                        <SelectItem key={unit} value={unit} className="uppercase">
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </UiSelect>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">SKU</Label>
                <Input value={draft.sku || ""} onChange={(e) => handleFieldChange("sku", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">$/CS</Label>
                <Input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => handleFieldChange("price", parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">$/Unit</Label>
                <Input type="number" value={unitPrice} readOnly disabled className="mt-1 bg-gray-100 text-blue-600 font-medium cursor-not-allowed" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Stock</Label>
                <Input type="number" min="0" value={draft.stock} onChange={(e) => handleFieldChange("stock", parseInt(e.target.value, 10) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Q.Per Case</Label>
                <Input type="number" min="0" value={draft.quantity_per_case} onChange={(e) => handleFieldChange("quantity_per_case", parseInt(e.target.value, 10) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Shipping/CS</Label>
                <Input type="number" min="0" step="0.01" value={draft.shipping_cost || 0} onChange={(e) => handleFieldChange("shipping_cost", parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">NDC Code</Label>
                <Input value={draft.ndcCode || ""} onChange={(e) => handleFieldChange("ndcCode", e.target.value)} placeholder="12345-678-90" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">UPC Code</Label>
                <Input value={draft.upcCode || ""} onChange={(e) => handleFieldChange("upcCode", e.target.value)} placeholder="012345678901" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lot Number</Label>
                <Input value={draft.lotNumber || ""} onChange={(e) => handleFieldChange("lotNumber", e.target.value)} placeholder="LOT-2024-001" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Expiry Date</Label>
                <Input type="date" value={draft.exipry || ""} onChange={(e) => handleFieldChange("exipry", e.target.value)} className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Allowed Pharmacies</Label>
                <div className="mt-1">
                  <Select
                    isMulti
                    options={groupOptions.map((group) => ({ label: group.name, value: group.id }))}
                    value={(draft.groupIds || []).map((id) => {
                      const group = groupOptions.find((item) => item.id === id)
                      return group ? { label: group.name, value: group.id } : null
                    }).filter(Boolean)}
                    onChange={(selected) => handleFieldChange("groupIds", selected.map((item) => item.value))}
                    placeholder="Select pharmacies..."
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold text-gray-900">Size Images</Label>
              <div className="mt-3 flex flex-wrap items-start gap-4">
                {draft.image ? (
                  <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img
                        src={imageUrls[draft.image] || draft.image}
                        alt={`${draft.size_value} ${draft.size_unit}`}
                        className="h-full w-full object-contain p-2"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-5 top-5 h-8 w-8 rounded-full shadow-sm"
                      onClick={handleRemoveEditSizeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  
                  </div>
                ) : (
                  <label className="flex h-44 w-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600 transition-colors hover:bg-slate-100">
                    {uploadingSizeImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="mb-2 h-6 w-6" />
                        <span className="font-medium">Upload Image</span>
                        <span className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditSizeImageUpload} />
                  </label>
                )}
                {draft.image && (
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                    {uploadingSizeImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Change Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditSizeImageUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!draft || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
