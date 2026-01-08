import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Clock, 
  Truck, 
  CheckCircle, 
  Package,
  AlertCircle,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderStats {
  total: number;
  newOrders: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  pendingPayment: number;
}

interface OrderSummaryCardsProps {
  stats: OrderStats;
  isLoading?: boolean;
  onCardClick?: (status: string) => void;
  activeFilter?: string;
}

export function OrderSummaryCards({ 
  stats, 
  isLoading = false, 
  onCardClick,
  activeFilter 
}: OrderSummaryCardsProps) {
  const cards = [
    {
      title: "Total Orders",
      value: stats.total,
      icon: ShoppingCart,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      filter: "all"
    },
    {
      title: "New",
      value: stats.newOrders,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      filter: "new"
    },
    {
      title: "Processing",
      value: stats.processing,
      icon: Package,
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      filter: "processing"
    },
    {
      title: "Shipped",
      value: stats.shipped,
      icon: Truck,
      color: "from-cyan-500 to-teal-500",
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600",
      filter: "shipped"
    },
   
    {
      title: "Cancelled",
      value: stats.cancelled,
      icon: AlertCircle,
      color: "from-red-500 to-rose-500",
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      filter: "cancelled"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((card) => {
        const isActive = activeFilter === card.filter;
        return (
          <Card 
            key={card.title}
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]
              ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
            `}
            onClick={() => onCardClick?.(card.filter)}
          >
            <div className={`h-1 bg-gradient-to-r ${card.color}`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Revenue summary component
export function RevenueSummaryCards({ 
  totalRevenue, 
  pendingPayment,
  isLoading = false 
}: { 
  totalRevenue: number; 
  pendingPayment: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <Card className="overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                Total Revenue
              </p>
              <p className="text-2xl font-bold mt-1">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/20">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-100 uppercase tracking-wide">
                Pending Payment
              </p>
              <p className="text-2xl font-bold mt-1">
                ${pendingPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/20">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
