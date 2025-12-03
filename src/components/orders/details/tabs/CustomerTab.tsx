import { OrderFormValues } from "../../schemas/orderSchema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Building, Edit } from "lucide-react";

interface CustomerTabProps {
  customerInfo?: OrderFormValues["customerInfo"];
  shippingAddress?: OrderFormValues["shippingAddress"];
  companyName?: string;
  poIs?: boolean;
  onEdit?: () => void;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  orderStatus?: string;
  isVoid?: boolean;
}

export const CustomerTab = ({
  customerInfo,
  shippingAddress,
  companyName,
  poIs,
  onEdit,
  userRole,
  orderStatus,
  isVoid,
}: CustomerTabProps) => {
  const canEdit = userRole === "admin" && orderStatus !== "cancelled" && !isVoid;
  if (!customerInfo) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No customer information available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Billing/Vendor Information */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {poIs ? "Vendor Information" : "Billing Information"}
          </h3>
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {companyName && (
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{companyName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{customerInfo?.name || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customerInfo?.email || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customerInfo?.phone || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{(shippingAddress as any)?.billing?.street1 || "N/A"}</p>
              {(shippingAddress as any)?.billing?.street2 && (
                <p className="font-medium">{(shippingAddress as any).billing.street2}</p>
              )}
              {(shippingAddress as any)?.billing?.city && (shippingAddress as any)?.billing?.state && (
                <p className="text-sm text-muted-foreground">
                  {(shippingAddress as any).billing.city}, {(shippingAddress as any).billing.state}{" "}
                  {(shippingAddress as any)?.billing?.zipCode || ""}
                </p>
              )}
            </div>
          </div>

          {!poIs && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Customer Type</p>
                <p className="font-medium capitalize">{customerInfo?.type || "N/A"}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Shipping Information */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Shipping Information
          </h3>
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {(shippingAddress as any)?.shipping?.companyName && (
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{(shippingAddress as any)?.shipping?.companyName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{customerInfo?.name || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customerInfo?.email || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{(shippingAddress as any)?.shipping?.phone || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{(shippingAddress as any)?.shipping?.street1 || "N/A"}</p>
              {(shippingAddress as any)?.shipping?.street2 && (
                <p className="font-medium">{(shippingAddress as any).shipping.street2}</p>
              )}
              {(shippingAddress as any)?.shipping?.city && (shippingAddress as any)?.shipping?.state && (
                <p className="text-sm text-muted-foreground">
                  {(shippingAddress as any).shipping.city}, {(shippingAddress as any).shipping.state}{" "}
                  {(shippingAddress as any)?.shipping?.zipCode || ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
