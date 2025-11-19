import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bell, MapPinPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AddPharmacyModal } from "@/components/group/AddPharmacyModal";

export const QuickActions = ({fetchLocations}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddLocation, setShowAddLocation] = useState(false);

  const actions = [
    {
      label: "Add Location",
      description: "Add a new pharmacy location",
      icon: MapPinPlus,
      onClick: () => setShowAddLocation(true),
      variant: "default" as const,
    },
    {
      label: "Send Notification",
      description: "Message your pharmacies",
      icon: Bell,
      onClick: () => {
        toast({
          title: "Notification System",
          description: "Opening notification center...",
        });
        navigate("/group/staff");
      },
      variant: "secondary" as const,
    },
    {
      label: "Manage Staff",
      description: "Handle staff assignments",
      icon: Users,
      onClick: () => {
        toast({
          title: "Staff Management",
          description: "Opening staff management...",
        });
        navigate("/group/staff");
      },
      variant: "secondary" as const,
    },
  ];

  return (
    <>
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className="w-full flex items-center justify-start gap-2 h-auto py-4"
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <AddPharmacyModal 
        open={showAddLocation}
        onOpenChange={setShowAddLocation}
        onPharmacyAdded={() => {
          toast({
            title: "Location Added",
            description: "New pharmacy location has been added successfully.",
          }); setShowAddLocation(false);
          fetchLocations()
        }}
      />
    </>
  );
};