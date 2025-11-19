import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { UserFormData, rolePermissions } from "../schemas/userFormSchemas";
import { Badge } from "@/components/ui/badge";

interface RoleSelectProps {
  form: UseFormReturn<UserFormData>;
}

export function RoleSelect({ form }: RoleSelectProps) {
  return (
    <FormField
      control={form.control}
      name="role"
      render={({ field }) => (
        <FormItem>
          <FormLabel>User Role</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <SelectItem key={role} value={role}>
                  <div className="flex flex-col gap-1">
                    <span className="capitalize">{role}</span>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="secondary"
                          className="text-xs"
                        >
                          {permission.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}