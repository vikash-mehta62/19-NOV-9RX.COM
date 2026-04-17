import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Calendar,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  User,
} from "lucide-react";

type LocationAddress = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip_code: string;
};

type PharmacyLocation = {
  id: string;
  profile_id: string;
  name: string;
  type: string;
  manager: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: LocationAddress | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type LocationFormState = {
  name: string;
  type: string;
  manager: string;
  contact_phone: string;
  contact_email: string;
  address: LocationAddress;
};

const emptyForm: LocationFormState = {
  name: "",
  type: "branch",
  manager: "",
  contact_phone: "",
  contact_email: "",
  address: {
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip_code: "",
  },
};

const getStatusBadgeClass = (status: string) =>
  status === "active"
    ? "bg-green-100 text-green-800 hover:bg-green-100"
    : "bg-gray-100 text-gray-800 hover:bg-gray-100";

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "headquarters": return "bg-purple-100 text-purple-800";
    case "branch": return "bg-blue-100 text-blue-800";
    case "warehouse": return "bg-orange-100 text-orange-800";
    case "retail": return "bg-teal-100 text-teal-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const formatAddress = (address: LocationAddress | null) => {
  if (!address) return null;
  const parts = [
    [address.street1, address.street2].filter(Boolean).join(", "),
    [address.city, address.state, address.zip_code].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.length ? parts : null;
};

const typeLabel: Record<string, string> = {
  headquarters: "Main Office",
  branch: "Branch",
  warehouse: "Warehouse",
  retail: "Retail Store",
};

interface PharmacyLocationsSectionProps {
  userId?: string;
}

export function PharmacyLocationsSection({ userId }: PharmacyLocationsSectionProps) {
  const { toast } = useToast();
  const [locations, setLocations] = useState<PharmacyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PharmacyLocation | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormState>(emptyForm);

  const fetchLocations = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLocations((data || []) as PharmacyLocation[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load pharmacy locations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchLocations(); }, [userId]);

  const resetForm = () => { setLocationForm(emptyForm); setEditingLocation(null); };
  const openCreateDialog = () => { resetForm(); setIsLocationDialogOpen(true); };
  const openEditDialog = (location: PharmacyLocation) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || "",
      type: location.type || "branch",
      manager: location.manager || "",
      contact_phone: location.contact_phone || "",
      contact_email: location.contact_email || "",
      address: location.address || emptyForm.address,
    });
    setIsLocationDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!userId) return;
    if (!locationForm.name.trim()) {
      toast({ title: "Error", description: "Location name is required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingLocation) {
        const { error } = await supabase.from("locations").update({
          name: locationForm.name.trim(),
          type: locationForm.type,
          manager: locationForm.manager.trim() || null,
          contact_phone: locationForm.contact_phone.trim() || null,
          contact_email: locationForm.contact_email.trim() || null,
          address: locationForm.address,
        }).eq("id", editingLocation.id);
        if (error) throw error;
        toast({ title: "Success", description: "Location updated successfully." });
      } else {
        const { error } = await supabase.from("locations").insert({
          profile_id: userId,
          name: locationForm.name.trim(),
          type: locationForm.type,
          manager: locationForm.manager.trim() || null,
          contact_phone: locationForm.contact_phone.trim() || null,
          contact_email: locationForm.contact_email.trim() || null,
          address: locationForm.address,
          status: "active",
        });
        if (error) throw error;
        toast({ title: "Success", description: "Location added successfully." });
      }
      setIsLocationDialogOpen(false);
      resetForm();
      await fetchLocations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save location.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!deleteLocationId) return;
    try {
      const { error } = await supabase.from("locations").delete().eq("id", deleteLocationId);
      if (error) throw error;
      toast({ title: "Success", description: "Location deleted successfully." });
      setDeleteLocationId(null);
      await fetchLocations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete location.", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (location: PharmacyLocation) => {
    const nextStatus = location.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("locations").update({ status: nextStatus }).eq("id", location.id);
      if (error) throw error;
      toast({ title: "Success", description: `Location ${nextStatus === "active" ? "activated" : "deactivated"}.` });
      await fetchLocations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update location status.", variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pharmacy Locations
                <Badge variant="secondary">{locations.length}</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Create and manage branch, retail, or warehouse addresses for this pharmacy.
              </CardDescription>
            </div>
            <Button type="button" onClick={openCreateDialog} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
              <MapPin className="h-8 w-8 opacity-30" />
              <p className="text-sm">No locations added yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {locations.map((location) => {
                const addressLines = formatAddress(location.address);
                return (
                  <div
                    key={location.id}
                    className="group relative flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold leading-tight">{location.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge className={`${getTypeBadgeClass(location.type)} text-xs`}>
                            {typeLabel[location.type] ?? location.type}
                          </Badge>
                          <Badge className={`${getStatusBadgeClass(location.status)} text-xs`}>
                            {location.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <TooltipProvider delayDuration={150}>
                        <div className="flex shrink-0 items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={location.status === "active" ? "success" : "outline"}
                                size="iconSm"
                                className={location.status === "active" ? "h-8 w-8 rounded-lg" : "h-8 w-8 rounded-lg text-gray-600"}
                                onClick={() => handleToggleStatus(location)}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{location.status === "active" ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="iconSm"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => openEditDialog(location)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit location</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="iconSm"
                                className="h-8 w-8 rounded-lg text-destructive"
                                onClick={() => setDeleteLocationId(location.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete location</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/60" />

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {location.manager && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{location.manager}</span>
                        </div>
                      )}
                      {location.contact_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{location.contact_phone}</span>
                        </div>
                      )}
                      {location.contact_email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{location.contact_email}</span>
                        </div>
                      )}
                      {addressLines ? (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div>
                            {addressLines.map((line, i) => (
                              <p key={i} className="leading-snug">{line}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/50">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>No address added</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {location.updated_at && (
                      <div className="flex items-center gap-1.5 border-t border-border/50 pt-2 text-xs text-muted-foreground/70">
                        <Calendar className="h-3 w-3" />
                        Updated {new Date(location.updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog & AlertDialog — unchanged */}
      <Dialog open={isLocationDialogOpen} onOpenChange={(open) => { setIsLocationDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="location-name" className="text-sm font-medium">Location Name *</label>
                <Input id="location-name" placeholder="e.g., Downtown Branch" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="location-type" className="text-sm font-medium">Type</label>
                <Select value={locationForm.type} onValueChange={(value) => setLocationForm({ ...locationForm, type: value })}>
                  <SelectTrigger id="location-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="headquarters">Main Office</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="retail">Retail Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="location-manager" className="text-sm font-medium">Manager Name</label>
                <Input id="location-manager" placeholder="Manager name" value={locationForm.manager} onChange={(e) => setLocationForm({ ...locationForm, manager: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="location-phone" className="text-sm font-medium">Contact Phone</label>
                <Input id="location-phone" placeholder="(555) 123-4567" value={locationForm.contact_phone} onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="location-email" className="text-sm font-medium">Contact Email</label>
              <Input id="location-email" type="email" placeholder="location@example.com" value={locationForm.contact_email} onChange={(e) => setLocationForm({ ...locationForm, contact_email: e.target.value })} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Address</label>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <Input placeholder="Street Address" value={locationForm.address.street1} onChange={(e) => setLocationForm({ ...locationForm, address: { ...locationForm.address, street1: e.target.value } })} />
                <Input placeholder="Apt, Suite, Unit (optional)" value={locationForm.address.street2} onChange={(e) => setLocationForm({ ...locationForm, address: { ...locationForm.address, street2: e.target.value } })} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="City" value={locationForm.address.city} onChange={(e) => setLocationForm({ ...locationForm, address: { ...locationForm.address, city: e.target.value } })} />
                  <Input placeholder="State" value={locationForm.address.state} onChange={(e) => setLocationForm({ ...locationForm, address: { ...locationForm.address, state: e.target.value } })} />
                  <Input placeholder="ZIP Code" value={locationForm.address.zip_code} onChange={(e) => setLocationForm({ ...locationForm, address: { ...locationForm.address, zip_code: e.target.value } })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsLocationDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="button" onClick={handleSaveLocation} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingLocation ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingLocation ? "Update Location" : "Add Location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLocationId} onOpenChange={(open) => !open && setDeleteLocationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>This location will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}