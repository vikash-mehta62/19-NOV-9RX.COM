import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Search, Plus, User, Building2, Hospital } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { LoadingSpinner } from "../LoadingSpinner";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Pharmacy" | "Hospital" | "Group";
  company_name?: string;
  billing_address?: {
    street?: string;
    street1?: string;
    city: string;
    state: string;
    zip_code: string;
  };
  shipping_address?: {
    street?: string;
    street1?: string;
    city: string;
    state: string;
    zip_code: string;
  };
  freeShipping?: boolean;
  tax_percentage?: number;
}

interface CustomerSelectionStepProps {
  selectedCustomerId?: string;
  onCustomerSelect: (customer: Customer) => void;
  onAddNewCustomer?: () => void;
  isEditMode?: boolean;
  lockedCustomer?: Customer;
}

const CustomerSelectionStepComponent = ({
  selectedCustomerId,
  onCustomerSelect,
  onAddNewCustomer,
  isEditMode = false,
  lockedCustomer,
}: CustomerSelectionStepProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("status", "active")
          .in("type", ["pharmacy", "hospital", "group"])
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        const formattedCustomers: Customer[] = (data || []).map((profile) => ({
          id: profile.id,
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "N/A",
          email: profile.email || "",
          phone: profile.mobile_phone || profile.work_phone || "",
          type: profile.type || "Pharmacy",
          company_name: profile.company_name || profile.display_name || "",
          billing_address: profile.billing_address || undefined,
          shipping_address: profile.shipping_address || undefined,
          freeShipping: profile.freeShipping || false,
          tax_percentage: profile.taxPercantage || 0,
        }));

        setCustomers(formattedCustomers);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(err instanceof Error ? err.message : "Failed to load customers");
        toast({
          title: "Error",
          description: "Failed to load customers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  // Filter customers based on search and type
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      const matchesType =
        filterType === "all" || customer.type.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, filterType]);

  const selectedCustomer = useMemo(() => 
    customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case "Pharmacy":
        return <Building2 className="h-4 w-4" />;
      case "Hospital":
        return <Hospital className="h-4 w-4" />;
      case "Group":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  }, []);

  const getTypeBadgeColor = useCallback((type: string) => {
    switch (type) {
      case "Pharmacy":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Hospital":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Group":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If in edit mode, show locked customer
  if (isEditMode && lockedCustomer) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Information</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Customer selection is locked in edit mode
          </p>
        </div>

        {/* Locked Customer Card */}
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Order Customer (Locked)</h3>
                <p className="text-xs sm:text-sm text-gray-500">This customer cannot be changed in edit mode</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                Locked
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Name</p>
                <p className="text-xs sm:text-sm text-gray-900">{lockedCustomer.name}</p>
              </div>
              {lockedCustomer.company_name && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700">Company</p>
                  <p className="text-xs sm:text-sm text-gray-900">{lockedCustomer.company_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Email</p>
                <p className="text-xs sm:text-sm text-gray-900 break-all">{lockedCustomer.email}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Phone</p>
                <p className="text-xs sm:text-sm text-gray-900">{lockedCustomer.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Type</p>
                <Badge className={`${getTypeBadgeColor(lockedCustomer.type)} text-xs`}>
                  {lockedCustomer.type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Customer</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Choose a customer for this order or add a new one
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 sm:gap-4" role="search" aria-label="Customer search and filters">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Search by name, email, company, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
            aria-label="Search customers"
            type="search"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Customer type filters">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="text-xs sm:text-sm min-h-[44px]"
            aria-pressed={filterType === "all"}
            aria-label="Show all customer types"
          >
            All
          </Button>
          <Button
            variant={filterType === "pharmacy" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("pharmacy")}
            className="text-xs sm:text-sm min-h-[44px]"
            aria-pressed={filterType === "pharmacy"}
            aria-label="Filter by pharmacy customers"
          >
            Pharmacy
          </Button>
          <Button
            variant={filterType === "hospital" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("hospital")}
            className="text-xs sm:text-sm min-h-[44px]"
            aria-pressed={filterType === "hospital"}
            aria-label="Filter by hospital customers"
          >
            Hospital
          </Button>
          <Button
            variant={filterType === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("group")}
            className="text-xs sm:text-sm min-h-[44px]"
            aria-pressed={filterType === "group"}
            aria-label="Filter by group customers"
          >
            Group
          </Button>
          {onAddNewCustomer && (
            <Button 
              onClick={onAddNewCustomer} 
              size="sm" 
              className="whitespace-nowrap text-xs sm:text-sm ml-auto min-h-[44px]"
              aria-label="Add new customer"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden="true" />
              Add New
            </Button>
          )}
        </div>
      </div>

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 sm:h-40" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <User className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
            <p className="text-gray-500 text-center text-sm sm:text-base">
              {searchTerm || filterType !== "all"
                ? "No customers found matching your search"
                : "No customers available"}
            </p>
            {onAddNewCustomer && (
              <Button onClick={onAddNewCustomer} className="mt-3 sm:mt-4" size="sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Add First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" role="list" aria-label="Available customers">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 animate-fade-in ${
                  selectedCustomerId === customer.id
                    ? "border-2 border-blue-500 bg-blue-50"
                    : "border border-gray-200"
                }`}
                onClick={() => onCustomerSelect(customer)}
                role="button"
                tabIndex={0}
                aria-pressed={selectedCustomerId === customer.id}
                aria-label={`Select ${customer.name}${customer.company_name ? `, ${customer.company_name}` : ""}, ${customer.type} customer`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onCustomerSelect(customer);
                  }
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        {getTypeIcon(customer.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                          {customer.name}
                        </h3>
                        {customer.company_name && (
                          <p className="text-xs text-gray-500 truncate">
                            {customer.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getTypeBadgeColor(customer.type)} text-xs flex-shrink-0 ml-2`}>
                      {customer.type}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    <p className="truncate">{customer.email}</p>
                    {customer.phone && <p className="truncate">{customer.phone}</p>}
                    {customer.billing_address && (
                      <p className="text-xs text-gray-500 truncate">
                        {customer.billing_address.city}, {customer.billing_address.state}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Selected Customer Details */}
      {selectedCustomer && (
        <Card className="border-2 border-green-500 bg-green-50 animate-slide-up">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Selected Customer</h3>
                <p className="text-xs sm:text-sm text-gray-500">This customer will be used for the order</p>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                Selected
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Name</p>
                <p className="text-xs sm:text-sm text-gray-900">{selectedCustomer.name}</p>
              </div>
              {selectedCustomer.company_name && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700">Company</p>
                  <p className="text-xs sm:text-sm text-gray-900">{selectedCustomer.company_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Email</p>
                <p className="text-xs sm:text-sm text-gray-900 break-all">{selectedCustomer.email}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Phone</p>
                <p className="text-xs sm:text-sm text-gray-900">{selectedCustomer.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Type</p>
                <Badge className={`${getTypeBadgeColor(selectedCustomer.type)} text-xs`}>
                  {selectedCustomer.type}
                </Badge>
              </div>
              {selectedCustomer.billing_address && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700">Billing Address</p>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {selectedCustomer.billing_address.street1}
                    <br />
                    {selectedCustomer.billing_address.city}, {selectedCustomer.billing_address.state}{" "}
                    {selectedCustomer.billing_address.zip_code}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const CustomerSelectionStep = memo(CustomerSelectionStepComponent);
