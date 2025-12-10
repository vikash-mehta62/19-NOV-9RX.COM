import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { Plus, Loader2 } from "lucide-react";

interface CreateGroupDialogProps {
  onGroupCreated: () => void;
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    displayName: "",
    workPhone: "",
    commissionRate: 0,
    canManagePricing: false,
    bypassMinPrice: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      // Create auth user first
      const response = await fetch(
        "https://wrvmbgmmuoivsfancgft.supabase.co/auth/v1/admin/users",
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzMjMxNywiZXhwIjoyMDc4NjA4MzE3fQ.u-tKoMhg6zevHRw88O9iTwyJSccRSPaZUJemimbzeYc`,
            "Content-Type": "application/json",
            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzMjMxNywiZXhwIjoyMDc4NjA4MzE3fQ.u-tKoMhg6zevHRw88O9iTwyJSccRSPaZUJemimbzeYc',
          },
          body: JSON.stringify({
            email: formData.email,
            password: "12345678",
            email_confirm: true,
            user_metadata: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            },
          }),
        }
      );

      const authUser = await response.json();
      if (!authUser?.id) {
        throw new Error(authUser.msg || "Failed to create user");
      }

      // Create profile
      const { error } = await supabase.from("profiles").upsert({
        id: authUser.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email.toLowerCase().trim(),
        type: "group",
        status: "active",
        role: "user",
        company_name: formData.companyName,
        display_name: formData.displayName || `${formData.firstName} ${formData.lastName}`,
        work_phone: formData.workPhone,
        commission_rate: formData.commissionRate,
        can_manage_pricing: formData.canManagePricing,
        bypass_min_price: formData.bypassMinPrice,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Success", description: "Group created successfully" });
      setOpen(false);
      setFormData({
        firstName: "", lastName: "", email: "", companyName: "",
        displayName: "", workPhone: "", commissionRate: 0,
        canManagePricing: false, bypassMinPrice: false,
      });
      onGroupCreated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Add a new group to manage multiple pharmacies
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company/Group Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Leave empty to use First + Last name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workPhone">Phone</Label>
              <Input
                id="workPhone"
                value={formData.workPhone}
                onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Can Manage Pricing</Label>
                <p className="text-xs text-muted-foreground">Allow group to edit their own prices</p>
              </div>
              <Switch
                checked={formData.canManagePricing}
                onCheckedChange={(checked) => setFormData({ ...formData, canManagePricing: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Bypass Minimum Price</Label>
                <p className="text-xs text-muted-foreground">Allow prices below minimum cap</p>
              </div>
              <Switch
                checked={formData.bypassMinPrice}
                onCheckedChange={(checked) => setFormData({ ...formData, bypassMinPrice: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
