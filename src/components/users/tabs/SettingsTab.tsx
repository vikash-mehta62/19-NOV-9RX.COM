import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bell, Gift, Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SettingsTabProps {
  userId: string;
  profile: any;
  onUpdate?: () => void;
}

export function SettingsTab({ userId, profile, onUpdate }: SettingsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    email_notifaction: false, // Marketing emails
    order_updates: false,     // Order emails
    is_rewards_member: true,  // Controls rewards UI visibility
    status: "active"          // Account status (active/inactive)
  });

  useEffect(() => {
    if (profile) {
      setSettings({
        email_notifaction: profile.email_notifaction || false,
        order_updates: profile.order_updates || false,
        is_rewards_member: profile.rewards_enabled !== false,
        status: profile.status || "active" // Default to active if undefined
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        active_notification: true,
        email_notifaction: settings.email_notifaction,
        order_updates: settings.order_updates,
        status: settings.status,
        // Automatically update portal_access based on status
        // If status is active, enable portal access
        // If status is inactive, disable portal access
        portal_access: settings.status === "active",
        rewards_enabled: settings.is_rewards_member,
      } as any;

      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: `Portal login is now ${settings.status === "active" ? "enabled" : "disabled"}. User status has been updated.`,
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Update failed",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal Login Card - Most Important */}
      <Card className={settings.status === "inactive" ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Portal Login
            {settings.status === "inactive" && (
              <Badge variant="destructive" className="ml-2">
                <ShieldAlert className="w-3 h-3 mr-1" />
                Disabled
              </Badge>
            )}
            {settings.status === "active" && (
              <Badge variant="default" className="ml-2 bg-green-600">
                Enabled
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Control portal login access. This will automatically update the user's account status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Portal Login</Label>
              <p className="text-sm text-muted-foreground">
                {settings.status === "active"
                  ? "Portal login is enabled. User can login to place orders."
                  : "Portal login is disabled. User cannot login to the portal."}
              </p>
            </div>
            <Switch
              checked={settings.status === "active"}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, status: checked ? "active" : "inactive" }))
              }
            />
          </div>
          {settings.status === "inactive" ? (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Portal login is disabled. User will see an error message when trying to login.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Portal login is enabled. User can access the portal and place orders.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage what emails and notifications this user receives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new products, sales, and promotions.
              </p>
            </div>
            <Switch
              checked={settings.email_notifaction}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, email_notifaction: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about order status, shipping, and invoices.
              </p>
            </div>
            <Switch
              checked={settings.order_updates}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, order_updates: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Rewards Program
          </CardTitle>
          <CardDescription>
            Manage enrollment in the loyalty rewards program.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Enrolled in Rewards</Label>
              <p className="text-sm text-muted-foreground">
                Enable this user to earn points and redeem rewards.
              </p>
            </div>
            <Switch
              checked={settings.is_rewards_member}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, is_rewards_member: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
