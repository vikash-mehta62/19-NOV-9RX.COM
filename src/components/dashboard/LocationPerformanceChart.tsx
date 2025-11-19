import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";

const data = [
  { location: "Location 1", orders: 120, revenue: 12000 },
  { location: "Location 2", orders: 98, revenue: 9800 },
  { location: "Location 3", orders: 86, revenue: 8600 },
  { location: "Location 4", orders: 99, revenue: 9900 },
  { location: "Location 5", orders: 85, revenue: 8500 },
];

const chartConfig = {
  orders: {
    label: "Orders",
    theme: {
      light: "hsl(var(--primary))",
      dark: "hsl(var(--primary))",
    },
  },
  revenue: {
    label: "Revenue ($)",
    theme: {
      light: "hsl(var(--secondary))",
      dark: "hsl(var(--secondary))",
    },
  },
};

export const LocationPerformanceChart = () => {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Location Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="location" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="hsl(var(--primary))"
                  name="Orders"
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill="hsl(var(--secondary))"
                  name="Revenue ($)"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};