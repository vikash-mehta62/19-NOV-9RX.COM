import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, User, FileText, DollarSign, Bell, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: number;
  type: "order" | "user" | "invoice" | "payment" | "notification" | "alert";
  description: string;
  time: string;
  referenceId?: string;
  priority?: "low" | "medium" | "high";
}

const activities: Activity[] = [
  {
    id: 1,
    type: "order",
    description: "New order #1234 received from Pharmacy A",
    time: "5 minutes ago",
    referenceId: "1234"
  },
  {
    id: 2,
    type: "payment",
    description: "Payment received: $1,234.56 from Pharmacy B",
    time: "10 minutes ago",
    referenceId: "pay-789"
  },
  {
    id: 3,
    type: "notification",
    description: "Stock alert: Low inventory at Pharmacy C",
    time: "1 hour ago",
    referenceId: "notif-123",
    priority: "high"
  },
  {
    id: 4,
    type: "alert",
    description: "Payment overdue for Pharmacy D",
    time: "2 hours ago",
    referenceId: "alert-456",
    priority: "high"
  },
];

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "order":
      return <Package className="h-4 w-4" />;
    case "user":
      return <User className="h-4 w-4" />;
    case "invoice":
      return <FileText className="h-4 w-4" />;
    case "payment":
      return <DollarSign className="h-4 w-4" />;
    case "notification":
      return <Bell className="h-4 w-4" />;
    case "alert":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
};

const getPriorityColor = (priority?: Activity["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-100 border-red-200";
    case "medium":
      return "bg-yellow-100 border-yellow-200";
    case "low":
      return "bg-blue-100 border-blue-200";
    default:
      return "bg-gray-100 border-gray-200";
  }
};

export const RecentActivity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleActivityClick = (activity: Activity) => {
    switch (activity.type) {
      case "order":
        navigate(`/group/orders/${activity.referenceId}`);
        break;
      case "payment":
        navigate(`/group/invoices/${activity.referenceId}`);
        break;
      case "notification":
      case "alert":
        navigate(`/group/notifications?id=${activity.referenceId}`);
        break;
      default:
        toast({
          title: "Navigation Error",
          description: "Unable to open this activity",
          variant: "destructive",
        });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center space-x-4 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors ${getPriorityColor(activity.priority)}`}
                onClick={() => handleActivityClick(activity)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleActivityClick(activity);
                  }
                }}
              >
                <div className="rounded-full bg-secondary p-2">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};