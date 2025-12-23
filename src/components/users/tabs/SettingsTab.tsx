import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bell, Gift, Mail, LogIn, ShieldAlert } from "lucide-react";
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
    is_rewards_member: false, // Derived from reward_tier
    portal_access: true       // Portal login access
  });

  useEffect(() => {
    if (profile) {
      setSettings({
        email_notifaction: profile.email_notifaction || false,
        order_updates: profile.order_updates || false,
        is_rewards_member: !!profile.reward_tier,
        portal_access: profile.portal_access !== false // Default to true if undefined
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: any = {
        email_notifaction: settings.email_notifaction,
        order_updates: settings.order_updates,
        portal_access: settings.portal_access,
        // If enrolling, set to Bronze if null. If unenrolling, set to null.
        reward_tier: settings.is_rewards_member 
          ? (profile.reward_tier || "Bronze") 
          : null,
        // Optional: Reset points if unenrolling? Let's keep them for now in case of re-enrollment, 
        // or strictly follow "not member" = "no tier".
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: "User profile settings have been saved successfully.",
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
      {/* Portal Access Card - Most Important */}
      <Card className={!settings.portal_access ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5" />
            Portal Login Access
            {!settings.portal_access && (
              <Badge variant="destructive" className="ml-2">
                <ShieldAlert className="w-3 h-3 mr-1" />
                Blocked
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Control whether this user can login to the pharmacy portal to place orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Allow Portal Login</Label>
              <p className="text-sm text-muted-foreground">
                {settings.portal_access 
                  ? "User can login and place orders through the portal."
                  : "User is blocked from logging into the portal."}
              </p>
            </div>
            <Switch
              checked={settings.portal_access}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, portal_access: checked }))
              }
            />
          </div>
          {!settings.portal_access && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                This user will see an error message when trying to login.
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
