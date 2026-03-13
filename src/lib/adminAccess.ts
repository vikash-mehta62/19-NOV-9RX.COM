export const ADMIN_PERMISSIONS = [
  "dashboard",
  "users",
  "orders",
  "purchase_orders",
  "invoices",
  "credit_management",
  "expenses",
  "products",
  "categories",
  "inventory",
  "special_pricing",
  "suppliers",
  "analytics",
  "reports",
  "marketing",
  "email",
  "automation",
  "intelligence",
  "alerts",
  "settings",
  "payments",
  "logs",
  "rewards",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const INTERNAL_ADMIN_ROLES = [
  "admin",
  "superadmin",
  "staff",
  "accounting",
  "warehouse",
] as const;

export type InternalAdminRole = (typeof INTERNAL_ADMIN_ROLES)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: "Dashboard",
  users: "Users",
  orders: "Sales Orders",
  purchase_orders: "Purchase Orders",
  invoices: "Invoices",
  credit_management: "Credit Management",
  expenses: "Expenses",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  special_pricing: "Special Pricing",
  suppliers: "Suppliers",
  analytics: "Analytics",
  reports: "Reports",
  marketing: "Marketing",
  email: "Email",
  automation: "Automation",
  intelligence: "Intelligence",
  alerts: "Alerts",
  settings: "Settings",
  payments: "Payments",
  logs: "Logs",
  rewards: "Rewards",
};

export const DEFAULT_ADMIN_PERMISSIONS_BY_ROLE: Record<InternalAdminRole, AdminPermission[]> = {
  admin: [...ADMIN_PERMISSIONS],
  superadmin: [...ADMIN_PERMISSIONS],
  staff: ["dashboard", "orders", "invoices", "users"],
  accounting: ["dashboard", "invoices", "credit_management", "expenses", "payments", "reports"],
  warehouse: ["dashboard", "orders", "purchase_orders", "products", "categories", "inventory", "alerts"],
};

type AdminLikeProfile = {
  type?: string | null;
  role?: string | null;
  admin_permissions?: unknown;
};

export const isInternalAdminType = (type?: string | null) =>
  String(type || "").toLowerCase() === "admin";

export const isFullAdmin = (profile?: AdminLikeProfile | null) => {
  const role = String(profile?.role || "").toLowerCase();
  return role === "admin" || role === "superadmin";
};

export const normalizeAdminPermissions = (permissions: unknown): AdminPermission[] => {
  if (!Array.isArray(permissions)) return [];

  return permissions.filter((permission): permission is AdminPermission =>
    typeof permission === "string" &&
    (ADMIN_PERMISSIONS as readonly string[]).includes(permission)
  );
};

export const getAdminPermissions = (profile?: AdminLikeProfile | null): AdminPermission[] => {
  if (!profile) return [];
  if (isFullAdmin(profile)) return [...ADMIN_PERMISSIONS];

  const explicitPermissions = normalizeAdminPermissions(profile.admin_permissions);
  if (explicitPermissions.length > 0) return explicitPermissions;

  const role = String(profile.role || "").toLowerCase() as InternalAdminRole;
  return DEFAULT_ADMIN_PERMISSIONS_BY_ROLE[role] || [];
};

export const hasAdminPermission = (
  profile: AdminLikeProfile | null | undefined,
  permission?: AdminPermission | null
) => {
  if (!permission) return true;
  if (!profile || !isInternalAdminType(profile.type)) return false;
  if (isFullAdmin(profile)) return true;
  return getAdminPermissions(profile).includes(permission);
};

export const hasEveryAdminPermission = (
  profile: AdminLikeProfile | null | undefined,
  permissions: AdminPermission[] = []
) => permissions.every((permission) => hasAdminPermission(profile, permission));

export const isWarehouseAdmin = (profile?: AdminLikeProfile | null) =>
  isInternalAdminType(profile?.type) && String(profile?.role || "").toLowerCase() === "warehouse";

export const shouldHideAdminFinancials = (profile?: AdminLikeProfile | null) =>
  isWarehouseAdmin(profile);
