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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues, StoreHours } from "./settingsTypes";
import { Clock } from "lucide-react";

interface StoreHoursSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

export function StoreHoursSection({ form }: StoreHoursSectionProps) {
  const storeHours = form.watch("store_hours");

  const updateDayHours = (
    day: keyof StoreHours,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) => {
    const currentHours = form.getValues("store_hours");
    form.setValue("store_hours", {
      ...currentHours,
      [day]: {
        ...currentHours[day],
        [field]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Store Hours
        </CardTitle>
        <CardDescription>
          Set your business operating hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "America/New_York"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center gap-4 p-3 rounded-lg border"
            >
              <div className="w-28 font-medium">{label}</div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Closed</span>
                <Switch
                  checked={storeHours?.[key]?.closed || false}
                  onCheckedChange={(checked) => updateDayHours(key, "closed", checked)}
                />
              </div>

              {!storeHours?.[key]?.closed && (
                <>
                  <Input
                    type="time"
                    className="w-32"
                    value={storeHours?.[key]?.open || "09:00"}
                    onChange={(e) => updateDayHours(key, "open", e.target.value)}
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={storeHours?.[key]?.close || "17:00"}
                    onChange={(e) => updateDayHours(key, "close", e.target.value)}
                  />
                </>
              )}

              {storeHours?.[key]?.closed && (
                <span className="text-muted-foreground italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
