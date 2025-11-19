export interface Location {
  id: number;
  name: string;
  address: string;
  status: "active" | "inactive";
  ordersThisMonth: number;
  lastActive: string;
  manager?: string;
  phone?: string;
   contact_email?: string;
  contact_phone?: string;

  email?: string;
}