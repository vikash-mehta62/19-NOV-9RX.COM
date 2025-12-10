import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopPharmacy {
  id: string;
  name: string;
  company_name: string;
  total_orders: number;
  total_revenue: number;
  status: string;
}

interface TopPharmaciesProps {
  groupId: string;
  limit?: number;
}

export function TopPharmacies({ groupId, limit = 5 }: TopPharmaciesProps) {
  const [pharmacies, setPharmacies] = useState<TopPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxRevenue, setMaxRevenue] = useState(0);

  useEffect(() => {
    if (groupId) {
      fetchTopPharmacies();
    }
  }, [groupId]);

  const fetchTopPharmacies = async () => {
    try {
      setLoading(true);

      // Get pharmacies under this group
      const { data: pharmaciesData } = await supabase
        .from("profiles")
        .select("id, display_name, company_name, status")
        .eq("group_id", groupId)
        .eq("type", "pharmacy");

      if (!pharmaciesData || pharmaciesData.length === 0) {
        setPharmacies([]);
        return;
      }

      // Get orders for each pharmacy
      const pharmacyStats = await Promise.all(
        pharmaciesData.map(async (pharmacy) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("profile_id", pharmacy.id)
            .is("void", false);

          const totalOrders = orders?.length || 0;
          const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

          return {
            id: pharmacy.id,
            name: pharmacy.display_name || pharmacy.company_name || "Unknown",
            company_name: pharmacy.company_name || "",
            total_orders: totalOrders,
            total_revenue: totalRevenue,
            status: pharmacy.status || "pending",
          };
        })
      );

      // Sort by revenue and take top N
      const sorted = pharmacyStats
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      setMaxRevenue(sorted[0]?.total_revenue || 0);
      setPharmacies(sorted);
    } catch (err) {
      console.error("Error fetching top pharmacies:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "text-yellow-500";
    if (index === 1) return "text-gray-400";
    if (index === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-yellow-100";
    if (index === 1) return "bg-gray-100";
    if (index === 2) return "bg-amber-100";
    return "bg-muted";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performing Pharmacies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Performing Pharmacies
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pharmacies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pharmacies yet</p>
            <p className="text-sm">Add pharmacies to see performance</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pharmacies.map((pharmacy, index) => (
              <div key={pharmacy.id} className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                  getRankBg(index),
                  getRankColor(index)
                )}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(pharmacy.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{pharmacy.name}</p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        pharmacy.status === "active" 
                          ? "text-green-600 border-green-200" 
                          : "text-gray-500 border-gray-200"
                      )}
                    >
                      {pharmacy.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress 
                      value={maxRevenue > 0 ? (pharmacy.total_revenue / maxRevenue) * 100 : 0} 
                      className="h-1.5 flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {pharmacy.total_orders} orders
                    </span>
                  </div>
                </div>

                {/* Revenue */}
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {formatCurrency(pharmacy.total_revenue)}
                  </p>
                  {index === 0 && pharmacy.total_revenue > 0 && (
                    <div className="flex items-center justify-end gap-1 text-xs text-yellow-600">
                      <TrendingUp className="h-3 w-3" />
                      Top
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
