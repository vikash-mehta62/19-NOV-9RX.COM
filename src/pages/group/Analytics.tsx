import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from "react";

export default function GroupAnalytics() {
  // Using useMemo to ensure data stability and serializability
  const data = useMemo(() => [
    { name: 'Jan', orders: 4000, type: 'orders' },
    { name: 'Feb', orders: 3000, type: 'orders' },
    { name: 'Mar', orders: 2000, type: 'orders' },
    { name: 'Apr', orders: 2780, type: 'orders' },
    { name: 'May', orders: 1890, type: 'orders' },
    { name: 'Jun', orders: 2390, type: 'orders' },
  ], []);

  return (
    <DashboardLayout role="group">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">View your group's performance metrics</p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Order History</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  scale="point"
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="orders"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}