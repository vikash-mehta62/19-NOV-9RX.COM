import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  CreditCard,
  Landmark,
  Trash2,
  Star,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSavedPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  SavedPaymentMethod,
} from "@/services/paymentService";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import AddPaymentMethodDialog from "./AddPaymentMethodDialog";

// Card brand icons/colors
const cardBrandStyles: Record<string, { bg: string; text: string }> = {
  visa: { bg: "bg-blue-100", text: "text-blue-700" },
  mastercard: { bg: "bg-orange-100", text: "text-orange-700" },
  amex: { bg: "bg-blue-100", text: "text-blue-800" },
  discover: { bg: "bg-orange-100", text: "text-orange-600" },
  unknown: { bg: "bg-gray-100", text: "text-gray-700" },
};

export default function SavedPaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const userProfile = useSelector(selectUserProfile);

  const fetchPaymentMethods = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    const methods = await getSavedPaymentMethods(userProfile.id);
    setPaymentMethods(methods);
    setLoading(false);
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [userProfile?.id]);

  const handleDelete = async () => {
    if (!deleteId) return;

    const result = await deletePaymentMethod(deleteId);
    if (result.success) {
      toast.success("Payment method removed");
      fetchPaymentMethods();
    } else {
      toast.error(result.error || "Failed to remove payment method");
    }
    setDeleteId(null);
  };

  const handleSetDefault = async (methodId: string) => {
    if (!userProfile?.id) return;

    const result = await setDefaultPaymentMethod(userProfile.id, methodId);
    if (result.success) {
      toast.success("Default payment method updated");
      fetchPaymentMethods();
    } else {
      toast.error(result.error || "Failed to update default");
    }
  };

  const getCardIcon = (method: SavedPaymentMethod) => {
    if (method.method_type === "ach") {
      return <Landmark className="h-8 w-8 text-green-600" />;
    }
    return <CreditCard className="h-8 w-8 text-blue-600" />;
  };

  const getMethodTitle = (method: SavedPaymentMethod) => {
    if (method.method_type === "card") {
      const brand = method.card_type?.toUpperCase() || "Card";
      return `${brand} •••• ${method.card_last_four}`;
    }
    return `${method.bank_name || "Bank"} •••• ${method.account_last_four}`;
  };

  const getMethodSubtitle = (method: SavedPaymentMethod) => {
    if (method.method_type === "card") {
      return `Expires ${method.card_expiry_month}/${method.card_expiry_year}`;
    }
    return `${method.account_type?.charAt(0).toUpperCase()}${method.account_type?.slice(1)} Account`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Saved Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your saved cards and bank accounts for faster checkout
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No saved payment methods</p>
              <p className="text-sm">Add a card or bank account for faster checkout</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const brandStyle = cardBrandStyles[method.card_type || "unknown"];
                
                return (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      method.is_default ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${brandStyle?.bg || "bg-gray-100"}`}>
                        {getCardIcon(method)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{getMethodTitle(method)}</p>
                          {method.is_default && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getMethodSubtitle(method)}
                        </p>
                        {method.nickname && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {method.nickname}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!method.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              This payment method will be removed from your account. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchPaymentMethods}
      />
    </>
  );
}
