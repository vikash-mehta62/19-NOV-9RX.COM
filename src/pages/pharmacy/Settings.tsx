import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Form } from "@/components/ui/form";
import { BusinessProfileSection } from "@/components/settings/BusinessProfileSection";
import { NotificationSection } from "@/components/settings/NotificationSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { SettingsFormValues, defaultValues } from "@/components/settings/settingsTypes";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function PharmacySettings() {
  const form = useForm<SettingsFormValues>({ defaultValues });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("")
  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("Settings form submitted:", data);

      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.session?.user?.id) {
        throw new Error("No active session found");
      }

      const userID = session.session.user.id;

      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifaction: data.email_notifications,
          order_updates: data.order_updates,
          company_name: data.business_name,
          notes: data.description,
        })
        .eq("id", userID);

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: "✅ Settings updated successfully!", variant: "default" });
    } catch (err: any) {
      toast({ title: "🚨 Error updating settings!", description: err.message, variant: "destructive" });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          throw new Error("No active session found");
        }

        const userID = session.session.user.id;
        const { data, error } = await supabase
          .from("profiles")
          .select()
          .eq("id", userID)
          .maybeSingle();

        if (error) {
          console.error("🚨 Supabase Fetch Error:", error);
          return;
        }

        if (!data) return;
        setEmail(data.email)
        console.log(data.email)
        form.setValue("description", data.notes || "");
        form.setValue("business_name", data.company_name || "");
        form.setValue("email_notifications", data.email_notifaction || false);
        form.setValue("order_updates", data.order_updates || false);
      } catch (error) {
        console.error("⚠️ Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your pharmacy settings and preferences</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
              <BusinessProfileSection form={form} />
              <div className="flex items-center gap-2 text-blue-600 font-medium hover:underline">
            <ArrowRight className="w-5 h-5" />
            <Link to={`/update-profile?email=${email}`}>Go to Update Profile</Link>
          </div>
              <NotificationSection form={form} />
              <SecuritySection form={form} />
              <div className=" flex justify-center w-full">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 w-max text-center"
                >
                  {isSubmitting ? "Saving..." : "Submit"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
