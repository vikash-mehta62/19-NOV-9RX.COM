import { DashboardLayout } from "@/components/DashboardLayout";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BusinessProfileSection } from "@/components/settings/BusinessProfileSection";
import { LocationContactSection } from "@/components/settings/LocationContactSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { InvoiceSection } from "@/components/settings/InvoiceSection";
import { InvoiceTemplateSection } from "@/components/settings/InvoiceTemplateSection";
import { PaymentSection } from "@/components/settings/PaymentSectionEnhanced";
import { TaxSettingsSection } from "@/components/settings/TaxSettingsSection";
import { ShippingSettingsSection } from "@/components/settings/ShippingSettingsSection";
import { OrderSettingsSection } from "@/components/settings/OrderSettingsSection";
import { EmailSettingsSection } from "@/components/settings/EmailSettingsSection";
import { StoreHoursSection } from "@/components/settings/StoreHoursSection";
import { SocialMediaSection } from "@/components/settings/SocialMediaSection";
import { CurrencySettingsSection } from "@/components/settings/CurrencySettingsSection";
import {
  defaultValues,
  SettingsFormValues,
} from "@/components/settings/settingsTypes";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  CreditCard, 
  FileText, 
  Settings2, 
  Truck, 
  Mail, 
  Clock, 
  Share2,
  Shield,
  FolderTree,
  Palette
} from "lucide-react";

interface PaymentSettings {
  enabled: boolean;
  apiLoginId: string;
  transactionKey: string;
  testMode: boolean;
}

interface FortisPaySettings {
  enabled: boolean;
  userId: string;
  userApiKey: string;
  locationId: string;
  productTransactionIdAch: string;
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

      if (!settingsData) {
        const { error: insertError } = await supabase.from("settings").insert({
          profile_id: userProfile.id,
          ...defaultValues,
          store_hours: JSON.parse(JSON.stringify(defaultValues.store_hours)) as Json,
        });

        if (insertError) {
          console.error("Error creating settings:", insertError);
          setError("Failed to create settings. Please try again.");
          return null;
        }
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "authorize_net")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (paymentError) {
        console.error("Error fetching payment settings:", paymentError);
      }

      const { data: fortisPayData, error: fortisPayError } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "fortispay")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (fortisPayError) {
        console.error("Error fetching FortisPay settings:", fortisPayError);
      }

      const paymentSettings = paymentData?.settings
        ? (paymentData.settings as unknown as PaymentSettings)
        : {
            enabled: false,
            apiLoginId: "",
            transactionKey: "",
            testMode: false,
          };

      const fortisPaySettings = fortisPayData?.settings
        ? (fortisPayData.settings as unknown as FortisPaySettings)
        : {
            enabled: false,
            userId: "",
            userApiKey: "",
            locationId: "",
            productTransactionIdAch: "",
            testMode: false,
          };

      const combinedSettings = {
        ...(settingsData || defaultValues),
        authorize_net_enabled: paymentSettings.enabled,
        authorize_net_api_login_id: paymentSettings.apiLoginId,
        authorize_net_transaction_key: paymentSettings.transactionKey,
        authorize_net_test_mode: paymentSettings.testMode,
        fortispay_enabled: fortisPaySettings.enabled,
        fortispay_user_id: fortisPaySettings.userId,
        fortispay_user_api_key: fortisPaySettings.userApiKey,
        fortispay_location_id: fortisPaySettings.locationId,
        fortispay_product_transaction_id_ach: fortisPaySettings.productTransactionIdAch,
        fortispay_test_mode: fortisPaySettings.testMode,
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
      toast.error("User profile not found. Please log in again.");
      return;
    }

    setSaving(true);
    try {
      const paymentSettings = {
        enabled: data.authorize_net_enabled,
        apiLoginId: data.authorize_net_api_login_id,
        transactionKey: data.authorize_net_transaction_key,
        testMode: data.authorize_net_test_mode,
      };

      const fortisPaySettings = {
        enabled: data.fortispay_enabled,
        userId: data.fortispay_user_id,
        userApiKey: data.fortispay_user_api_key,
        locationId: data.fortispay_location_id,
        productTransactionIdAch: data.fortispay_product_transaction_id_ach,
        testMode: data.fortispay_test_mode,
      };

      const {
        authorize_net_enabled,
        authorize_net_api_login_id,
        authorize_net_transaction_key,
        authorize_net_test_mode,
        fortispay_enabled,
        fortispay_user_id,
        fortispay_user_api_key,
        fortispay_location_id,
        fortispay_product_transaction_id_ach,
        fortispay_test_mode,
        current_password,
        new_password,
        ...generalSettings
      } = data;

      // Save general settings
      const { error: settingsError } = await supabase.from("settings").upsert({
        profile_id: userProfile.id,
        ...generalSettings,
        store_hours: JSON.parse(JSON.stringify(generalSettings.store_hours)) as Json,
        updated_at: new Date().toISOString(),
      });

      if (settingsError) {
        console.error("Settings save error:", settingsError);
        toast.error(`Failed to save general settings: ${settingsError.message}`);
        return;
      }

      // Save payment settings (always save, even if disabled, to preserve credentials)
      const { error: paymentError } = await supabase
        .from("payment_settings")
        .upsert(
          {
            profile_id: userProfile.id,
            provider: "authorize_net",
            settings: paymentSettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "profile_id,provider",
          }
        );

      if (paymentError) {
        console.error("Payment settings save error:", paymentError);
        toast.error(`Failed to save payment settings: ${paymentError.message}`);
        return;
      }

      // Save FortisPay settings
      const { error: fortisPayError } = await supabase
        .from("payment_settings")
        .upsert(
          {
            profile_id: userProfile.id,
            provider: "fortispay",
            settings: fortisPaySettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "profile_id,provider",
          }
        );

      if (fortisPayError) {
        console.error("FortisPay settings save error:", fortisPayError);
        toast.error(`Failed to save FortisPay settings: ${fortisPayError.message}`);
        return;
      }

      toast.success("Settings saved successfully!");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast.error(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await fetchSettings();
      if (settings) {
        // Sanitize settings - convert null values to appropriate defaults
        const sanitizedSettings = Object.fromEntries(
          Object.entries(settings).map(([key, value]) => {
            // Convert null to empty string for string fields, keep other types as is
            if (value === null) {
              // Check if it's a field that should be a string
              const defaultValue = defaultValues[key as keyof SettingsFormValues];
              if (typeof defaultValue === 'string') {
                return [key, ''];
              }
              if (typeof defaultValue === 'number') {
                return [key, 0];
              }
              if (typeof defaultValue === 'boolean') {
                return [key, false];
              }
              return [key, defaultValue ?? ''];
            }
            return [key, value];
          })
        );
        form.reset(sanitizedSettings as SettingsFormValues);
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
      <div className="container max-w-6xl mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

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
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs defaultValue="business" className="space-y-6">
              <div className="space-y-2">
                <TabsList className="grid grid-cols-3 md:grid-cols-5 gap-1 h-auto p-1 w-full">
                  <TabsTrigger value="business" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Business</span>
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Settings2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Orders</span>
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Truck className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Shipping</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <CreditCard className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Payments</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Invoices</span>
                  </TabsTrigger>
                  {/* <TabsTrigger value="email" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Email</span>
                  </TabsTrigger> */}
                </TabsList>

                <TabsList className="grid grid-cols-3 md:grid-cols-4 gap-1 h-auto p-1 w-full">
                  <TabsTrigger value="hours" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Hours</span>
                  </TabsTrigger>
                  <TabsTrigger value="social" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Share2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Social</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <FolderTree className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Categories</span>
                  </TabsTrigger>
                  {/* <TabsTrigger value="appearance" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                    <Palette className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Appearance</span>
                  </TabsTrigger> */}
                </TabsList>
              </div>

              {/* Business Tab */}
              <TabsContent value="business" className="space-y-6">
                <BusinessProfileSection form={form} />
                <LocationContactSection form={form} />
                <CurrencySettingsSection form={form} />
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-6">
                <OrderSettingsSection form={form} />
                <TaxSettingsSection form={form} />
              </TabsContent>

              {/* Shipping Tab */}
              <TabsContent value="shipping" className="space-y-6">
                <ShippingSettingsSection form={form} />
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-6">
                <PaymentSection form={form} />
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-6">
                <InvoiceSection />
                <InvoiceTemplateSection form={form} />
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email" className="space-y-6">
                <EmailSettingsSection form={form} />
              </TabsContent>

              {/* Store Hours Tab */}
              <TabsContent value="hours" className="space-y-6">
                <StoreHoursSection form={form} />
              </TabsContent>

              {/* Social Media Tab */}
              <TabsContent value="social" className="space-y-6">
                <SocialMediaSection form={form} />
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <SecuritySection form={form} />
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Category & Subcategory Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CategoryManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Tab */}
              {/* <TabsContent value="appearance" className="space-y-6">
                <AppearanceSection />
              </TabsContent> */}
            </Tabs>

            <div className="flex justify-end mt-6">
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
