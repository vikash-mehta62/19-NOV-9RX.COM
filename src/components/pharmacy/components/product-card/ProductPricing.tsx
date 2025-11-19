
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingDown } from "lucide-react";

interface ProductPricingProps {
  basePrice: number;
  offer?: string;
  tierPricing?: {
    tier1?: { quantity: string; price: number };
    tier2?: { quantity: string; price: number };
    tier3?: { quantity: string; price: number };
  };
}

export const ProductPricing = ({ basePrice, offer, tierPricing }: ProductPricingProps) => {
  const calculateSavings = (originalPrice: number, discountedPrice: number) => {
    const savings = originalPrice - discountedPrice;
    const percentage = (savings / originalPrice) * 100;
    return {
      amount: savings,
      percentage: Math.round(percentage),
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-emerald-600">${formatPrice(basePrice)}</span>
        </div>
        {offer && (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {offer}
          </Badge>
        )}
      </div>

      {tierPricing && Object.keys(tierPricing).length > 0 && (
        <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <TrendingDown className="w-4 h-4" />
            <span>Volume Discounts</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(tierPricing).map(([tier, data]) => {
              if (!data || !data.quantity || !data.price) return null;
              const savings = calculateSavings(basePrice, data.price);
              return (
                <div key={tier} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{data.quantity} units:</span>
                  <div className="text-right">
                    <div className="font-medium text-emerald-600">
                      ${formatPrice(data.price)} each
                    </div>
                    <div className="text-xs text-slate-500">
                      Save {savings.percentage}% (${formatPrice(savings.amount)})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
