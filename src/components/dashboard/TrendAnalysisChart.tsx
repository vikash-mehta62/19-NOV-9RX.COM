import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", totalOrders: 350, avgOrderValue: 120 },
  { month: "Feb", totalOrders: 400, avgOrderValue: 125 },
  { month: "Mar", totalOrders: 450, avgOrderValue: 130 },
  { month: "Apr", totalOrders: 420, avgOrderValue: 128 },
  { month: "May", totalOrders: 480, avgOrderValue: 135 },
  { month: "Jun", totalOrders: 520, avgOrderValue: 140 },
];

const chartConfig = {
  totalOrders: {
    label: "Total Orders",
    theme: {
      light: "hsl(var(--primary))",
      dark: "hsl(var(--primary))",
    },
  },
  avgOrderValue: {
    label: "Avg Order Value",
    theme: {
      light: "hsl(var(--secondary))",
      dark: "hsl(var(--secondary))",
    },
  },
};

export const TrendAnalysisChart = () => {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Order Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalOrders"
                  stroke="hsl(var(--primary))"
                  name="Total Orders"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgOrderValue"
                  stroke="hsl(var(--secondary))"
                  name="Avg Order Value ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};