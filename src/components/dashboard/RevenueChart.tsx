import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { month: "Jan", revenue: 4000 },
  { month: "Feb", revenue: 3000 },
  { month: "Mar", revenue: 2000 },
  { month: "Apr", revenue: 2780 },
  { month: "May", revenue: 1890 },
  { month: "Jun", revenue: 2390 },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    theme: {
      light: "#2563eb",
      dark: "#3b82f6",
    },
  },
};

export const RevenueChart = () => {
  // const [data, setData] = useState([]);

  // useEffect(() => {
  //   const fetchOrders = async () => {
  //     const { data: orders, error } = await supabase
  //       .from("orders")
  //       .select("total_amount, shipping_cost, tax_amount, created_at");

  //     if (error) {
  //       console.error("Error fetching orders:", error);
  //       return;
  //     }

  //     // Process revenue by month
  //     const revenueData = {};
  //     orders.forEach(({ total_amount, shipping_cost, tax_amount, created_at }) => {
  //       const month = new Date(created_at).toLocaleString("default", { month: "short" });
  //       const revenue = (total_amount || 0) + (shipping_cost || 0) + (tax_amount || 0);

  //       revenueData[month] = (revenueData[month] || 0) + revenue;
  //     });

  //     // Convert to array format for recharts
  //     const formattedData = Object.keys(revenueData).map((month) => ({
  //       month,
  //       revenue: revenueData[month],
  //     }));

  //     setData(formattedData);
  //   };

  //   fetchOrders();
  // }, []);

  return (
    <div className="h-[380px] w-full mt-4">
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 55 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={true}
              axisLine={true}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={true}
              axisLine={true}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip />
            <Line
              type="monotone"
              dataKey="revenue"
              strokeWidth={3}
              dot={{ strokeWidth: 2, r: 4 }}
              activeDot={{ r: 8 }}
              className="stroke-primary"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};
