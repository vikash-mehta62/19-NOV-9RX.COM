"use client"

import type React from "react"
import { useMemo } from "react"

import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogInIcon as Logs,
  Receipt,
  DollarSign,
  BoxIcon,
  ShoppingCart,
  ListChecks,
  Sparkles,
  History,
  FileBarChart,
  Wallet,
  Gift,
  Heart,
  HelpCircle,
  Image,
  Percent,
  PenSquare,
  Megaphone,
  Mail,
  Send,
  Zap,
  ShoppingBag,
  CreditCard,
} from "lucide-react"
import { SidebarHeader } from "./dashboard/SidebarHeader";
import { SidebarProfile } from "./dashboard/SidebarProfile";
import { TopBar } from "./dashboard/TopBar";
import { SidebarNavigation } from "./dashboard/SidebarNavigation";
import { useIsMobile } from "@/hooks/use-mobile"
import { AnnouncementDisplay } from "./AnnouncementDisplay"
import { useCart } from "@/hooks/use-cart"

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: "admin" | "pharmacy" | "group" | "hospital"
}

export function DashboardLayout({ children, role = "admin" }: DashboardLayoutProps) {
  const isMobile = useIsMobile()
  const { cartItems } = useCart()
  
  // Calculate total cart items
  const totalCartItems = useMemo(() => 
    cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0), 
    [cartItems]
  )

  const menuItems = {
    admin: [
      {
        label: "Overview",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
        ],
      },
      {
        label: "Sales & Orders",
        items: [
          { icon: FileText, label: "Sales Orders", path: "/admin/orders" },
          { icon: Receipt, label: "Invoices", path: "/admin/invoices" },
          { icon: Wallet, label: "Credit Management", path: "/admin/credit-management" },
          { icon: FileText, label: "Purchase Orders", path: "/admin/po" },
          { icon: DollarSign, label: "Expenses", path: "/admin/expenses" },
        ],
      },
      {
        label: "Catalog",
        items: [
          { icon: Package, label: "Products", path: "/admin/products" },
          { icon: BoxIcon, label: "Inventory", path: "/admin/inventory" },
          { icon: DollarSign, label: "Special Pricing", path: "/admin/group-pricing" },
        ],
      },
      {
        label: "Customers",
        items: [
          { icon: Users, label: "Users", path: "/admin/users" },
          { icon: Users, label: "Groups", path: "/admin/groups" },
          { icon: ShoppingBag, label: "Abandoned Carts", path: "/admin/abandoned-carts" },
          { icon: Gift, label: "Rewards Program", path: "/admin/rewards" },
        ],
      },
      {
        label: "Marketing",
        items: [
          { icon: Percent, label: "Offers & Promos", path: "/admin/offers" },
          { icon: Image, label: "Banners", path: "/admin/banners" },
          { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
          { icon: PenSquare, label: "Blogs", path: "/admin/blogs" },
          { icon: Sparkles, label: "Festival Themes", path: "/admin/festival-themes" },
        ],
      },
      {
        label: "Email",
        items: [
          { icon: Mail, label: "Templates", path: "/admin/email-templates" },
          { icon: Send, label: "Campaigns", path: "/admin/email-campaigns" },
          { icon: Zap, label: "Automations", path: "/admin/email-automations" },
          { icon: Settings, label: "Settings", path: "/admin/email-settings" },
        ],
      },
      {
        label: "System",
        items: [
          { icon: Settings, label: "Settings", path: "/admin/settings" },
          { icon: CreditCard, label: "Payments", path: "/admin/payment-transactions" },
          { icon: Logs, label: "Activity Logs", path: "/admin/logs" },
        ],
      },
    ],
    pharmacy: [
      { icon: Package, label: "Products", path: "/pharmacy/products" },
      { icon: ShoppingCart, label: "Your Cart", path: "/pharmacy/order/create", badge: totalCartItems > 0 ? totalCartItems.toString() : undefined },
      { icon: FileText, label: "My Orders", path: "/pharmacy/orders" },
      { icon: History, label: "Order History", path: "/pharmacy/order-history" },
      { icon: Receipt, label: "Invoices", path: "/pharmacy/invoices" },
      { icon: FileBarChart, label: "Statements", path: "/pharmacy/statements" },
      { icon: Wallet, label: "Credit Balance", path: "/pharmacy/credit" },
      { icon: CreditCard, label: "Payment Methods", path: "/pharmacy/payment-methods" },
      { icon: Gift, label: "Rewards", path: "/pharmacy/rewards" },
      { icon: Heart, label: "Wishlist", path: "/pharmacy/wishlist" },
      { icon: Settings, label: "Settings", path: "/pharmacy/settings" },
      { icon: HelpCircle, label: "Help & Support", path: "/pharmacy/help" },
    ],
    group: [
      {
        label: "Overview",
        items: [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/group/dashboard",
          },
        ],
      },
      {
        label: "Orders & Products",
        items: [
          { icon: Package, label: "Products", path: "/group/products" },
          { icon: ShoppingCart, label: "Order Products", path: "/group/order" },
          { icon: ListChecks, label: "Orders", path: "/group/orders" },
          { icon: Receipt, label: "Invoices", path: "/group/invoices" },
          { icon: DollarSign, label: "Special Pricing", path: "/group/pricing" },
        ],
      },
      {
        label: "Management",
        items: [
          { icon: Users, label: "Pharmacies", path: "/group/locations" },
          { icon: Users, label: "Staff", path: "/group/staff" },
          { icon: Users, label: "Invitations", path: "/group/invitations" },
        ],
      },
      {
        label: "Reports",
        items: [
          { icon: FileBarChart, label: "Analytics", path: "/group/analytics" },
          { icon: FileText, label: "Reports", path: "/group/reports" },
          { icon: Settings, label: "Settings", path: "/group/settings" },
        ],
      },
    ],
    hospital: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/hospital/dashboard",
      },
      { icon: Package, label: "Order Products", path: "/hospital/order" },
      { icon: FileText, label: "Orders", path: "/hospital/orders" },
      { icon: Settings, label: "Settings", path: "/hospital/settings" },
    ],
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50/50">
        <Sidebar
          collapsible="icon"
          className={`border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-50 transition-all duration-300 shadow-xl ${
            isMobile ? "w-full max-w-[280px]" : ""
          }`}
        >
          <SidebarContent>
            <div className="flex flex-col h-full">
              <SidebarHeader />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarNavigation items={menuItems[role]} isGrouped={role === "group" || role === "admin"} />
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarProfile />
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          <TopBar />
          <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-scroll max-w-[100vw]">
            <div className="mx-auto max-w-7xl">
              <AnnouncementDisplay userRole={role} />
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout
