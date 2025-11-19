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
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";

interface BusinessProfileSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function BusinessProfileSection({ form }: BusinessProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your profile is what people will see on search results, invoices, chat
          and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your business name" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description (150 chars)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Describe your business here. What makes it great? Use short catchy text to tell people what you do or offer."
                  {...field}
                  maxLength={150}
                />
              </FormControl>
            </FormItem>
          )}
        /> */}
      </CardContent>
    </Card>
  );
}
