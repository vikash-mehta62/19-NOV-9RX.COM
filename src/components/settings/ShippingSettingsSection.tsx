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

interface ShippingSettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
  onSaveFedExCredentials: (environment: "sandbox" | "production") => void;
  savingFedExEnvironment: "sandbox" | "production" | null;
  onTestFedExConnection: () => Promise<void>;
  testingFedEx: boolean;
}

export function ShippingSettingsSection({
  form,
  onSaveFedExCredentials,
  savingFedExEnvironment,
  onTestFedExConnection,
  testingFedEx,
}: ShippingSettingsSectionProps) {
  const sandboxMode = form.watch("fedex_use_sandbox");
  const activeModeTitle = sandboxMode ? "Sandbox" : "Production";
  const sandboxAccountNumber = form.watch("fedex_sandbox_account_number");
  const sandboxApiKey = form.watch("fedex_sandbox_api_key");
  const productionAccountNumber = form.watch("fedex_production_account_number");
  const productionApiKey = form.watch("fedex_production_api_key");
  const credentialSetsMatch =
    Boolean(sandboxAccountNumber && productionAccountNumber && sandboxApiKey && productionApiKey) &&
    sandboxAccountNumber === productionAccountNumber &&
    sandboxApiKey === productionApiKey;

  const renderFedExCredentialCard = (environment: "sandbox" | "production") => {
    const title = environment === "sandbox" ? "Sandbox" : "Production";
    const isActive = sandboxMode === (environment === "sandbox");
    const label = environment;

    return (
      <div
        className={`rounded-lg border p-4 space-y-4 transition-opacity ${
          isActive ? "border-primary/50 bg-primary/5" : "opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold">{title} Credentials</h4>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? `Currently selected. FedEx will use these ${label} credentials right now.`
                : `Stored ${label} credentials. Turn ${title === "Sandbox" ? "Sandbox Mode on" : "Sandbox Mode off"} to use them.`}
            </p>
          </div>
          <Button
            type="button"
            variant={isActive ? "default" : "outline"}
            onClick={() => onSaveFedExCredentials(environment)}
            disabled={!isActive || savingFedExEnvironment !== null}
          >
            {savingFedExEnvironment === environment ? `Saving ${title}...` : `Save ${title}`}
          </Button>
        </div>

        <fieldset disabled={!isActive} className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:cursor-not-allowed">
          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_account_number" : "fedex_production_account_number"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} Account Number</FormLabel>
                <FormControl>
                  <Input placeholder={`Enter ${label} account number`} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_meter_number" : "fedex_production_meter_number"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} Meter Number</FormLabel>
                <FormControl>
                  <Input placeholder={`Optional ${label} meter number`} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_api_key" : "fedex_production_api_key"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} API Key</FormLabel>
                <FormControl>
                  <Input placeholder={`Enter ${label} API key`} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_secret_key" : "fedex_production_secret_key"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} Secret Key</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={`Enter ${label} secret key`} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_child_key" : "fedex_production_child_key"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} Child Key</FormLabel>
                <FormControl>
                  <Input placeholder={`Optional ${label} child key`} {...field} />
                </FormControl>
                <FormDescription>
                  Leave empty unless your {label} FedEx project requires child credentials.
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={environment === "sandbox" ? "fedex_sandbox_child_secret" : "fedex_production_child_secret"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{title} Child Secret</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={`Optional ${label} child secret`} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </fieldset>
      </div>
    );
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
          <p className="text-sm text-muted-foreground">
            FedEx uses the Shipping Address above as the ship-from origin for quotes, labels, and pickups.
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
                        Toggle which saved credential set and endpoint FedEx should use.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {credentialSetsMatch && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Sandbox and production currently have the same Account Number and API Key saved. If these are sandbox credentials,
                production mode will fail until you replace the production values with real FedEx production credentials.
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {renderFedExCredentialCard("sandbox")}
              {renderFedExCredentialCard("production")}
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onTestFedExConnection} disabled={testingFedEx}>
                {testingFedEx ? `Testing ${activeModeTitle}...` : `Test ${activeModeTitle} Connection`}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
