import { DashboardLayout } from "@/components/DashboardLayout";
import { BusinessProfileSection } from "@/components/settings/BusinessProfileSection";
import { NotificationSection } from "@/components/settings/NotificationSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { useForm } from "react-hook-form";
import { SettingsFormValues, defaultValues } from "@/components/settings/settingsTypes";
import { Form } from "@/components/ui/form";

export default function HospitalSettings() {
  const form = useForm<SettingsFormValues>({
    defaultValues,
  });

  const onSubmit = (data: SettingsFormValues) => {
    // console.log('Settings form submitted:', data);
    // Handle form submission here
  };

  return (
    <DashboardLayout role="hospital">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your hospital settings and preferences
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
              <BusinessProfileSection form={form} />
              <NotificationSection form={form} />
              <SecuritySection form={form} />
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}