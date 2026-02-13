import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Building2, Plus, Star, TrendingUp, Package, FileText } from "lucide-react";
import { SupplierService, Supplier } from "@/services/supplierService";
import { toast } from "sonner";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    supplier_code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    payment_terms: 'Net 30',
    lead_time_days: 7,
    minimum_order_value: 0,
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await SupplierService.getSuppliers();
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!formData.name) {
      toast.error('Supplier name is required');
      return;
    }

    const supplierId = await SupplierService.createSupplier(formData as Supplier);

    if (supplierId) {
      toast.success('Supplier created successfully');
      setShowCreateDialog(false);
      setFormData({
        supplier_code: '',
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        payment_terms: 'Net 30',
        lead_time_days: 7,
        minimum_order_value: 0,
        status: 'active',
        notes: ''
      });
      loadSuppliers();
    } else {
      toast.error('Failed to create supplier');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { label: 'Active', color: 'default' },
      inactive: { label: 'Inactive', color: 'secondary' },
      suspended: { label: 'Suspended', color: 'destructive' }
    };
    const variant = variants[status] || variants.active;
    return <Badge variant={variant.color}>{variant.label}</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Supplier Management
            </h1>
            <p className="text-base text-muted-foreground">
              Manage suppliers, purchase orders, and supplier performance
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Supplier Code</Label>
                    <Input
                      value={formData.supplier_code}
                      onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <Label>Supplier Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Select
                      value={formData.payment_terms}
                      onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                        <SelectItem value="COD">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>ZIP Code</Label>
                    <Input
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lead Time (Days)</Label>
                    <Input
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({ ...formData, lead_time_days: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Minimum Order Value</Label>
                    <Input
                      type="number"
                      value={formData.minimum_order_value}
                      onChange={(e) => setFormData({ ...formData, minimum_order_value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateSupplier} className="w-full">
                  Create Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">All Suppliers</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : suppliers.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No suppliers found</p>
                <p className="text-sm text-gray-400 mt-2">Add your first supplier to get started</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{supplier.name}</h3>
                          {getStatusBadge(supplier.status)}
                        </div>
                        <p className="text-sm text-gray-600">{supplier.supplier_code}</p>
                      </div>
                      {supplier.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-semibold">{supplier.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {supplier.contact_person && (
                        <p className="text-gray-600">
                          <span className="font-medium">Contact:</span> {supplier.contact_person}
                        </p>
                      )}
                      {supplier.email && (
                        <p className="text-gray-600">
                          <span className="font-medium">Email:</span> {supplier.email}
                        </p>
                      )}
                      {supplier.phone && (
                        <p className="text-gray-600">
                          <span className="font-medium">Phone:</span> {supplier.phone}
                        </p>
                      )}
                      <p className="text-gray-600">
                        <span className="font-medium">Lead Time:</span> {supplier.lead_time_days} days
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Terms:</span> {supplier.payment_terms}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Create PO
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <Card className="p-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Supplier performance metrics coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                Track on-time delivery, quality ratings, and more
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Purchase orders feature coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                Create and manage purchase orders to suppliers
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Suppliers;
