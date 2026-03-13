import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS_BY_ROLE,
} from "@/lib/adminAccess";

interface BasicInformationSectionProps {
  form: UseFormReturn<BaseUserFormData>;
  self?: boolean;
  isAdmin?: boolean;
}

export function BasicInformationSection({
  form,
  self = false,
  isAdmin = false,
}: BasicInformationSectionProps) {
  const userType = form.watch("type");
  const userRole = form.watch("role");
  const adminPermissions = form.watch("adminPermissions") || [];
  const isVendor = userType === "vendor";
  const isAdminRole = userRole === "admin";
  const isInternalAdmin = userType === "admin";
  const isTypeDisabled = isVendor || isAdminRole;

  useEffect(() => {
    if (!isInternalAdmin) {
      if (["admin", "superadmin", "staff", "accounting", "warehouse"].includes(userRole)) {
        form.setValue("role", "user");
      }
      if (adminPermissions.length > 0) {
        form.setValue("adminPermissions", []);
      }
      return;
    }

    if (!["admin", "superadmin", "staff", "accounting", "warehouse"].includes(userRole)) {
      form.setValue("role", "staff");
    }

    if (adminPermissions.length === 0) {
      const defaultPermissions =
        DEFAULT_ADMIN_PERMISSIONS_BY_ROLE[
          (["admin", "superadmin", "staff", "accounting", "warehouse"].includes(userRole)
            ? userRole
            : "staff") as keyof typeof DEFAULT_ADMIN_PERMISSIONS_BY_ROLE
        ] || [];
      form.setValue("adminPermissions", defaultPermissions);
    }
  }, [adminPermissions.length, form, isInternalAdmin, userRole]);

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    const nextPermissions = checked
      ? [...new Set([...adminPermissions, permission])]
      : adminPermissions.filter((item: string) => item !== permission);
    form.setValue("adminPermissions", nextPermissions, { shouldDirty: true });
  };

  const applyRoleDefaults = (role: keyof typeof DEFAULT_ADMIN_PERMISSIONS_BY_ROLE) => {
    form.setValue("role", role, { shouldDirty: true });
    form.setValue("adminPermissions", DEFAULT_ADMIN_PERMISSIONS_BY_ROLE[role], { shouldDirty: true });
  };
  
  return (
    <Card className={self ? "border-0 shadow-none p-0" : ""}>
      {!self && (
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm">Basic Information</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`space-y-2 sm:space-y-3 ${self ? "p-0" : "pt-0"}`}>
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="firstName" className="text-[10px] sm:text-[11px]">First Name *</FormLabel>
                <FormControl>
                  <Input id="firstName" placeholder="First name" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="lastName" className="text-[10px] sm:text-[11px]">Last Name *</FormLabel>
                <FormControl>
                  <Input id="lastName" placeholder="Last name" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                </FormControl>
                <FormMessage className="text-[9px] sm:text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email" className="text-[10px] sm:text-[11px]">Email *</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="Email address" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
              </FormControl>
              <FormMessage className="text-[9px] sm:text-[10px]" />
            </FormItem>
          )}
        />

        {!self && (
          <div className="grid grid-cols-2 gap-2">
            {/* Customer Type Field - Disabled for Vendors and Admins */}
            {isTypeDisabled ? (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="type" className="text-[10px] sm:text-[11px]">Customer Type</FormLabel>
                    <FormControl>
                      <Input 
                        id="type" 
                        {...field}
                        value={isVendor ? "Vendor" : "Admin"} 
                        readOnly
                        className="h-7 sm:h-8 text-[11px] sm:text-xs bg-gray-100 cursor-not-allowed capitalize" 
                      />
                    </FormControl>
                    <FormMessage className="text-[9px] sm:text-[10px]" />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="type" className="text-[10px] sm:text-[11px]">Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger id="type" className="h-7 sm:h-8 text-[11px] sm:text-xs">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="admin">Internal Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[9px] sm:text-[10px]" />
                  </FormItem>
                )}
              />
            )}
            
            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="status" className="text-[10px] sm:text-[11px]">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger id="status" className="h-7 sm:h-8 text-[11px] sm:text-xs">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[9px] sm:text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="companyName" className="text-[10px] sm:text-[11px]">Company Name *</FormLabel>
              <FormControl>
                <Input id="companyName" placeholder="Company name" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
              </FormControl>
              <FormMessage className="text-[9px] sm:text-[10px]" />
            </FormItem>
          )}
        />

        {!self && isInternalAdmin && (
          <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="role" className="text-[10px] sm:text-[11px]">Internal Role</FormLabel>
                  <Select
                    onValueChange={(value) => applyRoleDefaults(value as keyof typeof DEFAULT_ADMIN_PERMISSIONS_BY_ROLE)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="role" className="h-7 sm:h-8 text-[11px] sm:text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="accounting">Accounting</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[8px] sm:text-[9px]">
                    Admin can still fine-tune the modules this user can open.
                  </FormDescription>
                  <FormMessage className="text-[9px] sm:text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adminPermissions"
              render={() => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-[11px]">Allowed Modules</FormLabel>
                  <div className="grid grid-cols-2 gap-2 rounded-md border bg-white p-3">
                    {ADMIN_PERMISSIONS.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-700"
                      >
                        <Checkbox
                          checked={adminPermissions.includes(permission)}
                          onCheckedChange={(checked) => handlePermissionToggle(permission, checked === true)}
                        />
                        <span>{ADMIN_PERMISSION_LABELS[permission]}</span>
                      </label>
                    ))}
                  </div>
                  <FormDescription className="text-[8px] sm:text-[9px]">
                    Remove pricing, purchase orders, or any unrelated admin section for this user.
                  </FormDescription>
                  <FormMessage className="text-[9px] sm:text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>

      {isAdmin && !self && (
        <CardContent className="pt-0">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-1 pt-2">
              <CardTitle className="text-[10px] sm:text-xs flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                <Badge variant="outline" className="text-amber-600 border-amber-600 text-[8px] sm:text-[9px]">Admin</Badge>
                Referral
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <FormField
                control={form.control}
                name="referralName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="referralName" className="text-[10px] sm:text-[11px]">Referral Name</FormLabel>
                    <FormControl>
                      <Input id="referralName" placeholder="Who referred?" {...field} className="h-7 sm:h-8 text-[11px] sm:text-xs" />
                    </FormControl>
                    <FormDescription className="text-[8px] sm:text-[9px]">Admin only field</FormDescription>
                    <FormMessage className="text-[9px] sm:text-[10px]" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </CardContent>
      )}
    </Card>
  );
}
