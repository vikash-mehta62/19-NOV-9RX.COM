"use client"

import type React from "react"

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
} from "lucide-react"
import { SidebarHeader } from "./dashboard/SidebarHeader";
import { SidebarProfile } from "./dashboard/SidebarProfile";
import { TopBar } from "./dashboard/TopBar";
import { SidebarNavigation } from "./dashboard/SidebarNavigation";
import { useIsMobile } from "@/hooks/use-mobile"

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: "admin" | "pharmacy" | "group" | "hospital"
}

export function DashboardLayout({ children, role = "admin" }: DashboardLayoutProps) {
  const isMobile = useIsMobile()

  const menuItems = {
    admin: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Users, label: "Users", path: "/admin/users" },
      { icon: Package, label: "Products", path: "/admin/products" },
      { icon: BoxIcon, label: "Inventory", path: "/admin/inventory" },
      { icon: DollarSign, label: "Expenses", path: "/admin/expenses" },
      { icon: FileText, label: "Orders", path: "/admin/orders" },
      { icon: FileText, label: "Purchase Order", path: "/admin/po" },
      { icon: Receipt, label: "Invoices", path: "/admin/invoices" },
      {
        icon: DollarSign,
        label: "Group Pricing",
        path: "/admin/group-pricing",
      },
      { icon: Settings, label: "Settings", path: "/admin/settings" },
      { icon: Logs, label: "Logs", path: "/admin/logs" },
    ],
    pharmacy: [
      { icon: Package, label: "Products", path: "/pharmacy/products" },
      { icon: ShoppingCart, label: "Your Cart", path: "/pharmacy/order" },
      { icon: FileText, label: "My Orders", path: "/pharmacy/orders" },
      { icon: Receipt, label: "Invoices", path: "/pharmacy/invoices" },
      { icon: Settings, label: "Settings", path: "/pharmacy/settings" },
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
        ],
      },
      {
        label: "Settings",
        items: [{ icon: Settings, label: "Settings", path: "/group/settings" }],
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
          className={`border-r border-gray-200 bg-white z-50 transition-all duration-300 ${
            isMobile ? "w-full max-w-[280px]" : ""
          }`}
        >
          <SidebarContent>
            <div className="flex flex-col h-full">
              <SidebarHeader />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarNavigation items={menuItems[role]} isGrouped={role === "group"} />
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarProfile />
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          <TopBar />
          <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-scroll max-w-[100vw]">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout
