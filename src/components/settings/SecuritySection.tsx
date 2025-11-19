import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Key } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SecuritySectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function SecuritySection({ form }: SecuritySectionProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    const { current_password, new_password } = form.getValues();

    if (!current_password || !new_password) {
      toast({
        title: "Validation Error",
        description: "Both fields are required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get current user email
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.email) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const email = userData.user.email;

    // Validate current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current_password,
    });

    if (signInError) {
      toast({
        title: "Incorrect Password",
        description: "The current password is incorrect.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      toast({
        title: "Error",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password updated successfully!",
        variant: "default",
      });
      form.setValue("current_password", "");
      form.setValue("new_password", "");
    }
    
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>
          Manage your account security and authentication settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="current_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Current Password
              </FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!form.watch("current_password") || !form.watch("new_password") || loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
}
