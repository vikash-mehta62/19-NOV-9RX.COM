import { DashboardLayout } from "@/components/DashboardLayout";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BusinessProfileSection } from "@/components/settings/BusinessProfileSection";
import { LocationContactSection } from "@/components/settings/LocationContactSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { NotificationSection } from "@/components/settings/NotificationSection";
import { InvoiceSection } from "@/components/settings/InvoiceSection";
import { InvoiceTemplateSection } from "@/components/settings/InvoiceTemplateSection";
import { PaymentSection } from "@/components/settings/PaymentSection";
import {
  defaultValues,
  SettingsFormValues,
} from "@/components/settings/settingsTypes";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";

interface PaymentSettings {
  enabled: boolean;
  apiLoginId: string;
  transactionKey: string;
  testMode: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userProfile = useSelector(selectUserProfile);

  const form = useForm<SettingsFormValues>({
    defaultValues,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      if (!userProfile?.id) {
        setError("User profile not found");
        return null;
      }

      // First, try to get existing settings
      const { data: settingsData, error: fetchError } = await supabase
        .from("settings")
        .select("*")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching settings:", fetchError);
        setError("Failed to load settings. Please try again.");
        return null;
      }

      // Create default settings if none exist
      if (!settingsData) {
        const { error: insertError } = await supabase.from("settings").insert({
          profile_id: userProfile.id,
          ...defaultValues,
        });

        if (insertError) {
          console.error("Error creating settings:", insertError);
          setError("Failed to create settings. Please try again.");
          return null;
        }
      }

      // Fetch payment settings
      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "authorize_net")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (paymentError) {
        console.error("Error fetching payment settings:", paymentError);
      }

      // Safely convert the payment settings
      const paymentSettings = paymentData?.settings
        ? (paymentData.settings as unknown as PaymentSettings)
        : {
            enabled: false,
            apiLoginId: "",
            transactionKey: "",
            testMode: false,
          };

      // Combine settings and payment settings
      const combinedSettings = {
        ...(settingsData || defaultValues),
        authorize_net_enabled: paymentSettings.enabled,
        authorize_net_api_login_id: paymentSettings.apiLoginId,
        authorize_net_transaction_key: paymentSettings.transactionKey,
        authorize_net_test_mode: paymentSettings.testMode,
      };

      return combinedSettings;
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("An unexpected error occurred while loading settings.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (data: SettingsFormValues) => {
    if (!userProfile?.id) {
      toast.error("User profile not found");
      return;
    }

    setSaving(true);
    try {
      // Separate payment settings from general settings
      const paymentSettings = {
        enabled: data.authorize_net_enabled,
        apiLoginId: data.authorize_net_api_login_id,
        transactionKey: data.authorize_net_transaction_key,
        testMode: data.authorize_net_test_mode,
      };

      // Remove payment settings from general settings object
      const {
        authorize_net_enabled,
        authorize_net_api_login_id,
        authorize_net_transaction_key,
        authorize_net_test_mode,
        ...generalSettings
      } = data;

      // Save general settings
      const { error: settingsError } = await supabase.from("settings").upsert({
        profile_id: userProfile.id,
        ...generalSettings,
        updated_at: new Date().toISOString(),
      });

      if (settingsError) {
        throw settingsError;
      }

      // Save payment settings
      if (data.authorize_net_enabled) {
        const { error: paymentError } = await supabase
          .from("payment_settings")
          .upsert(
            {
              profile_id: userProfile.id,
              provider: "authorize_net",
              settings: paymentSettings,
            },
            {
              onConflict: "profile_id,provider",
            }
          );

        if (paymentError) {
          throw paymentError;
        }
      }

      toast.success("Settings saved successfully");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fetchSettings();
      if (settings) {
        form.reset(settings);
      }
    };

    if (userProfile?.id) {
      loadSettings();
    }
  }, [userProfile?.id]);

  const handleSubmit = (data: SettingsFormValues) => {
    saveSettings(data);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Business Info</h1>

        {loading && (
          <div className="text-center py-6">
            <p>Loading settings...</p>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center py-6">
            <p>{error}</p>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <BusinessProfileSection form={form} />
            <LocationContactSection form={form} />
            <InvoiceSection form={form} />
            <InvoiceTemplateSection form={form} />
            <PaymentSection form={form} />
            <SecuritySection form={form} />
            {/* <NotificationSection form={form} /> */}

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
