export type StaffRole = "manager" | "staff";
export type StaffStatus = "active" | "inactive" | "pending";
export type StaffPermission = "view_orders" | "manage_inventory" | "view_reports" | "manage_staff";

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: StaffPermission[];
  lastActive: string;
  canAddLocations?: boolean;
}

export interface StaffFormData {
  name: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermission[];
  canAddLocations: boolean;
}