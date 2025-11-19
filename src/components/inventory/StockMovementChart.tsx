import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { date: "Jan", inbound: 40, outbound: 24 },
  { date: "Feb", inbound: 30, outbound: 13 },
  { date: "Mar", inbound: 20, outbound: 38 },
  { date: "Apr", inbound: 27, outbound: 39 },
  { date: "May", inbound: 18, outbound: 48 },
  { date: "Jun", inbound: 23, outbound: 38 },
  { date: "Jul", inbound: 34, outbound: 43 },
];

const chartConfig = {
  inbound: {
    label: "Inbound",
    theme: {
      light: "hsl(142.1 76.2% 36.3%)", // Emerald-600
      dark: "hsl(142.1 76.2% 36.3%)",
    },
  },
  outbound: {
    label: "Outbound",
    theme: {
      light: "hsl(346.8 77.2% 49.8%)", // Rose-500
      dark: "hsl(346.8 77.2% 49.8%)",
    },
  },
};

export const StockMovementChart = () => {
  return (
    <Card className="col-span-4 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Stock Movement</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-600" />
            <span className="text-sm text-muted-foreground">Inbound</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="text-sm text-muted-foreground">Outbound</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-1">
        <div className="h-[520px] w-full rounded-lg bg-gradient-to-b from-emerald-50/50 to-transparent">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  padding={{ top: 20, bottom: 20 }}
                />
                <ChartTooltip />
                <Line
                  type="monotone"
                  dataKey="inbound"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  stroke="hsl(142.1 76.2% 36.3%)"
                />
                <Line
                  type="monotone"
                  dataKey="outbound"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  stroke="hsl(346.8 77.2% 49.8%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
