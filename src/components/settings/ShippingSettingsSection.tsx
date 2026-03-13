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
  FormDescription,
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
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { SUPABASE_PUBLISHABLE_KEY, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShippingSettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function ShippingSettingsSection({ form }: ShippingSettingsSectionProps) {
  const [testingFedEx, setTestingFedEx] = useState(false);

  const testFedExConnection = async () => {
    setTestingFedEx(true);
    try {
      const { data, error } = await supabase.functions.invoke("fedex-api", {
        headers: {
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: {
          action: "test_auth",
        },
      });

      if (error) {
        throw new Error(error.message || "FedEx test failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "FedEx test failed");
      }

      toast.success(
        `FedEx connected (${data.data?.mode || "unknown mode"})${data.data?.accountNumber ? ` - Account ${data.data.accountNumber}` : ""}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "FedEx connection test failed");
    } finally {
      setTestingFedEx(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Settings
        </CardTitle>
        <CardDescription>
          Configure shipping rates and free shipping thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="shipping_calculation_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Calculation Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "flat_rate"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  <SelectItem value="weight_based">Weight Based</SelectItem>
                  <SelectItem value="price_based">Price Based</SelectItem>
                  <SelectItem value="free">Always Free</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="default_shipping_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Shipping Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="handling_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Handling Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Additional fee added to each order
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="free_shipping_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Free Shipping</FormLabel>
                <FormDescription>
                  Offer free shipping above a certain order amount
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("free_shipping_enabled") && (
          <FormField
            control={form.control}
            name="free_shipping_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Free Shipping Threshold ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Orders above this amount qualify for free shipping
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">FedEx Carrier Integration</h3>
          <p className="text-sm text-muted-foreground">
            Configure FedEx credentials and shipment defaults for label generation, tracking, and pickup requests.
          </p>
        </div>

        <FormField
          control={form.control}
          name="fedex_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable FedEx</FormLabel>
                <FormDescription>
                  Allow admins to create FedEx labels, tracking, and pickup requests from orders.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("fedex_enabled") && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fedex_use_sandbox"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sandbox Mode</FormLabel>
                      <FormDescription>
                        Use FedEx test credentials and endpoints.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FedEx Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter FedEx account number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FedEx API Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter FedEx API key" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_secret_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FedEx Secret Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter FedEx secret key" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_child_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FedEx Child Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional child key" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty unless your FedEx project requires child credentials.
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_child_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FedEx Child Secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Optional child secret" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={testFedExConnection} disabled={testingFedEx}>
                {testingFedEx ? "Testing FedEx..." : "Test FedEx Connection"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fedex_meter_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional meter number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Service</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FEDEX_GROUND">FedEx Ground</SelectItem>
                        <SelectItem value="FEDEX_2_DAY">FedEx 2Day</SelectItem>
                        <SelectItem value="STANDARD_OVERNIGHT">Standard Overnight</SelectItem>
                        <SelectItem value="PRIORITY_OVERNIGHT">Priority Overnight</SelectItem>
                        <SelectItem value="GROUND_HOME_DELIVERY">Home Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_packaging_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Packaging</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select packaging" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="YOUR_PACKAGING">Your Packaging</SelectItem>
                        <SelectItem value="FEDEX_BOX">FedEx Box</SelectItem>
                        <SelectItem value="FEDEX_PAK">FedEx Pak</SelectItem>
                        <SelectItem value="FEDEX_ENVELOPE">FedEx Envelope</SelectItem>
                        <SelectItem value="FEDEX_TUBE">FedEx Tube</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_pickup_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Pickup Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pickup type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USE_SCHEDULED_PICKUP">Scheduled Pickup</SelectItem>
                        <SelectItem value="CONTACT_FEDEX_TO_SCHEDULE">Contact FedEx</SelectItem>
                        <SelectItem value="DROPOFF_AT_FEDEX_LOCATION">Dropoff at FedEx</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_label_stock_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label Stock Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select label stock" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAPER_85X11_TOP_HALF_LABEL">8.5 x 11 Top Half</SelectItem>
                        <SelectItem value="PAPER_85X11_BOTTOM_HALF_LABEL">8.5 x 11 Bottom Half</SelectItem>
                        <SelectItem value="STOCK_4X6">4 x 6 Thermal</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_label_image_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="PNG">PNG</SelectItem>
                        <SelectItem value="ZPLII">ZPL II</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="fedex_default_weight_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Weight</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_weight_units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LB">LB</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 12)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 10)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 8)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fedex_default_dimension_units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimension Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IN">IN</SelectItem>
                        <SelectItem value="CM">CM</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
