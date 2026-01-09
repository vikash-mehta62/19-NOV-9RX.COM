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
import { useScreenSize } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isCompact = isMobile || isTablet;

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
    <Card className={cn(isCompact && "border-0 shadow-none bg-transparent")}>
      <CardHeader className={cn(isCompact && "px-0 pb-4")}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          isCompact ? "text-lg" : "text-xl"
        )}>
          <Clock className={cn(isCompact ? "h-5 w-5" : "h-6 w-6")} />
          Store Hours
        </CardTitle>
        <CardDescription className={cn(isCompact && "text-sm")}>
          Set your business operating hours.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(
        "space-y-6",
        isCompact && "px-0 space-y-4"
      )}>
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={cn(isCompact && "text-sm font-medium")}>Timezone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "America/New_York"}>
                <FormControl>
                  <SelectTrigger className={cn(
                    isCompact && "h-12 text-base rounded-xl border-2 focus:border-blue-500"
                  )}>
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

        <div className={cn("space-y-3", isCompact && "space-y-2")}>
          {DAYS.map(({ key, label }) => (
            <div
              key={key}
              className={cn(
                "rounded-lg border bg-white",
                isCompact 
                  ? "p-4 border-2 border-gray-200 rounded-xl shadow-sm" 
                  : "flex items-center gap-4 p-3"
              )}
            >
              {isCompact ? (
                // Mobile/Tablet Layout - Stacked
                <div className="space-y-3">
                  {/* Day Header with Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 text-base">{label}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 font-medium">
                        {storeHours?.[key]?.closed ? "Closed" : "Open"}
                      </span>
                      <Switch
                        checked={storeHours?.[key]?.closed || false}
                        onCheckedChange={(checked) => updateDayHours(key, "closed", checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>

                  {/* Time Inputs */}
                  {!storeHours?.[key]?.closed ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Opens
                        </label>
                        <Input
                          type="time"
                          className="h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500"
                          value={storeHours?.[key]?.open || "09:00"}
                          onChange={(e) => updateDayHours(key, "open", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-center pt-6">
                        <span className="text-gray-400 font-medium">to</span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Closes
                        </label>
                        <Input
                          type="time"
                          className="h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500"
                          value={storeHours?.[key]?.close || "17:00"}
                          onChange={(e) => updateDayHours(key, "close", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-gray-500 italic text-sm bg-gray-50 px-4 py-2 rounded-full">
                        Closed all day
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                // Desktop Layout - Horizontal
                <>
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
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
