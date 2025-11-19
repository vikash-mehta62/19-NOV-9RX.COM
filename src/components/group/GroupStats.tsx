import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Package, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

interface GroupStatsProps {
  totalLocations?: number;
}

export function GroupStats({ totalLocations = 0 }: GroupStatsProps) {
  const stats = [
    {
      title: "Locations",
      value: totalLocations.toString(),
      icon: Building2,
      description: "Active pharmacies",
    },
    {
      title: "Total Orders",
      value: "156",
      icon: FileText,
      description: "Across all locations",
    },
    {
      title: "Products Ordered",
      value: "1,245",
      icon: Package,
      description: "This month",
    },
    {
      title: "Total Spent",
      value: "$24,385",
      icon: TrendingUp,
      description: "This month",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}