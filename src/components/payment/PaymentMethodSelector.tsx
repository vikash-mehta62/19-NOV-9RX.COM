import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Landmark,
  Plus,
  Star,
  Loader2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import {
  getSavedPaymentMethods,
  SavedPaymentMethod,
} from "@/services/paymentService";

interface PaymentMethodSelectorProps {
  selectedMethod: string | null;
  onSelectMethod: (methodId: string | null, method: SavedPaymentMethod | null) => void;
  onAddNew: () => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  onAddNew,
}: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const userProfile = useSelector(selectUserProfile);

  useEffect(() => {
    const fetchMethods = async () => {
      if (!userProfile?.id) return;
      
      setLoading(true);
      const methods = await getSavedPaymentMethods(userProfile.id);
      setPaymentMethods(methods);
      setLoading(false);

      // Auto-select default method
      const defaultMethod = methods.find(m => m.is_default);
      if (defaultMethod && !selectedMethod) {
        onSelectMethod(defaultMethod.id, defaultMethod);
      }
    };

    fetchMethods();
  }, [userProfile?.id]);

  const getMethodIcon = (method: SavedPaymentMethod) => {
    if (method.method_type === "ach") {
      return <Landmark className="h-5 w-5 text-green-600" />;
    }
    return <CreditCard className="h-5 w-5 text-blue-600" />;
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return null; // Don't show if no saved methods
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Saved Payment Methods</h4>
        <Button variant="ghost" size="sm" onClick={onAddNew} className="gap-1">
          <Plus className="h-4 w-4" />
          Add New
        </Button>
      </div>

      <RadioGroup
        value={selectedMethod || ""}
        onValueChange={(value) => {
          if (value === "new") {
            onSelectMethod(null, null);
          } else {
            const method = paymentMethods.find(m => m.id === value);
            onSelectMethod(value, method || null);
          }
        }}
      >
        {paymentMethods.map((method) => (
          <div key={method.id}>
            <Label
              htmlFor={method.id}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <RadioGroupItem value={method.id} id={method.id} />
              <div className="p-2 rounded-lg bg-gray-100">
                {getMethodIcon(method)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getMethodTitle(method)}</span>
                  {method.is_default && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-current" />
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getMethodSubtitle(method)}
                </p>
              </div>
            </Label>
          </div>
        ))}

        {/* Option to enter new card */}
        <div>
          <Label
            htmlFor="new"
            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
              selectedMethod === null
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="new" id="new" />
            <div className="p-2 rounded-lg bg-gray-100">
              <Plus className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Use a different payment method</span>
              <p className="text-sm text-muted-foreground">
                Enter new card or bank account details
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
