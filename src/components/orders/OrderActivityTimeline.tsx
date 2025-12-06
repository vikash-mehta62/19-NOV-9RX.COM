import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OrderActivityService } from "@/services/orderActivityService";
import { OrderActivity } from "@/types/orderActivity";
import {
  Clock,
  CheckCircle,
  Edit,
  DollarSign,
  XCircle,
  FileText,
  Package,
  AlertCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderActivityTimelineProps {
  orderId: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "created":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "updated":
    case "items_updated":
      return <Edit className="h-4 w-4 text-blue-600" />;
    case "status_changed":
      return <Package className="h-4 w-4 text-purple-600" />;
    case "payment_received":
    case "payment_updated":
      return <DollarSign className="h-4 w-4 text-green-600" />;
    case "cancelled":
    case "voided":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "note_added":
      return <FileText className="h-4 w-4 text-gray-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "created":
      return "bg-green-100 text-green-800";
    case "updated":
    case "items_updated":
      return "bg-blue-100 text-blue-800";
    case "status_changed":
      return "bg-purple-100 text-purple-800";
    case "payment_received":
    case "payment_updated":
      return "bg-green-100 text-green-800";
    case "cancelled":
    case "voided":
      return "bg-red-100 text-red-800";
    case "note_added":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function OrderActivityTimeline({ orderId }: OrderActivityTimelineProps) {
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<OrderActivity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [orderId]);

  const loadActivities = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await OrderActivityService.getOrderActivities(orderId);

    if (fetchError) {
      setError(fetchError);
    } else {
      setActivities(data || []);
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Error loading activities: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Activity
          <Badge variant="outline">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-border">
                  {getActivityIcon(activity.activity_type)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      {activity.performed_by_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {activity.performed_by_name}
                          {activity.performed_by_email && ` (${activity.performed_by_email})`}
                        </p>
                      )}
                      {activity.metadata && (
                        <div className="mt-2 space-y-1">
                          {activity.metadata.old_status && activity.metadata.new_status && (
                            <div className="text-xs text-muted-foreground">
                              <Badge variant="outline" className="mr-2">
                                {activity.metadata.old_status}
                              </Badge>
                              →
                              <Badge variant="outline" className="ml-2">
                                {activity.metadata.new_status}
                              </Badge>
                            </div>
                          )}
                          {activity.metadata.payment_amount && (
                            <div className="text-xs text-muted-foreground">
                              Amount: ${activity.metadata.payment_amount.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* View Changes Button for updated activities */}
                      {activity.activity_type === "updated" && (activity.old_data || activity.new_data) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSelectedActivity(activity);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Changes
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getActivityColor(activity.activity_type)}>
                        {activity.activity_type.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Changes Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Changes</DialogTitle>
            <DialogDescription>
              Compare old and new data for this update
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Old Data */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Old Data
                </h3>
                <div className="space-y-2">
                  {selectedActivity.old_data ? (
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(selectedActivity.old_data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No old data available</p>
                  )}
                </div>
              </div>

              {/* New Data */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  New Data
                </h3>
                <div className="space-y-2">
                  {selectedActivity.new_data ? (
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(selectedActivity.new_data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No new data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Details */}
          {selectedActivity && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold text-sm mb-2">Activity Details</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="font-medium">{selectedActivity.description}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Performed By:</span>
                  <p className="font-medium">
                    {selectedActivity.performed_by_name || "System"}
                    {selectedActivity.performed_by_email && ` (${selectedActivity.performed_by_email})`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {format(new Date(selectedActivity.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium capitalize">{selectedActivity.activity_type.replace("_", " ")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
