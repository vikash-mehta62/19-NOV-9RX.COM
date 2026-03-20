"use client"

import type React from "react"
import { useEffect, useMemo, useRef } from "react"

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
  Image,
  Percent,
  PenSquare,
  Megaphone,
  Mail,
  Send,
  Zap,
  ShoppingBag,
  CreditCard,
  Shield,
  Brain,
  Bell,
  Layers,
  LogIn,
} from "lucide-react"
import { SidebarHeader } from "./dashboard/SidebarHeader";
import { SidebarProfile } from "./dashboard/SidebarProfile";
import { TopBar } from "./dashboard/TopBar";
import { SidebarNavigation } from "./dashboard/SidebarNavigation";
import { useIsMobile } from "@/hooks/use-mobile"
import { useCart } from "@/hooks/use-cart"
import { AnnouncementDisplay } from "@/components/AnnouncementDisplay"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { AdminPermission, hasAdminPermission, isInternalAdminType, shouldHideAdminFinancials } from "@/lib/adminAccess"
import { useLocation } from "react-router-dom"

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: "admin" | "pharmacy" | "group" | "hospital"
}

interface NavigationItem {
  icon: any
  label: string
  path: string
  badge?: string
  requiredPermission?: AdminPermission
}

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export function DashboardLayout({ children, role = "admin" }: DashboardLayoutProps) {
  const isMobile = useIsMobile()
  const { cartItems } = useCart()
  const currentUserProfile = useSelector((state: RootState) => state.user.profile)
  const location = useLocation()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const hideFinancialData = role === "admin" && shouldHideAdminFinancials(currentUserProfile)
  const hideCartDrawer = role === "admin" && location.pathname.startsWith("/admin/po")
  
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
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard", requiredPermission: "dashboard" },
        ],
      },
      {
        label: "Sales & Orders",
        items: [
          { icon: FileText, label: "Sales Orders", path: "/admin/orders", requiredPermission: "orders" },
          { icon: Receipt, label: "Invoices", path: "/admin/invoices", requiredPermission: "invoices" },
          { icon: Wallet, label: "Credit Management", path: "/admin/credit-management", requiredPermission: "credit_management" },
          { icon: FileText, label: "Purchase Orders", path: "/admin/po", requiredPermission: "purchase_orders" },
          { icon: DollarSign, label: "Expenses", path: "/admin/expenses", requiredPermission: "expenses" },
        ],
      },
      {
        label: "Catalog",
        items: [
          { icon: Package, label: "Products", path: "/admin/products", requiredPermission: "products" },
          { icon: Layers, label: "Categories", path: "/admin/categories", requiredPermission: "categories" },
          { icon: BoxIcon, label: "Inventory", path: "/admin/inventory", requiredPermission: "inventory" },
          { icon: DollarSign, label: "Special Pricing", path: "/admin/group-pricing", requiredPermission: "special_pricing" },
        ],
      },
      {
        label: "Customers",
        items: [
          { icon: Users, label: "Users", path: "/admin/users", requiredPermission: "users" },
          
          //Hidden for now since we are not perfectly clear about this
          // { icon: Users, label: "Groups", path: "/admin/groups" },    
          { icon: ShoppingBag, label: "Abandoned Carts", path: "/admin/abandoned-carts", requiredPermission: "marketing" },
          { icon: Gift, label: "Rewards Program", path: "/admin/rewards", requiredPermission: "rewards" },
        ],
      },
      {
        label: "Marketing",
        items: [
          { icon: Percent, label: "Offers & Promos", path: "/admin/offers", requiredPermission: "marketing" },
          { icon: Image, label: "Banners", path: "/admin/banners", requiredPermission: "marketing" },
          { icon: Megaphone, label: "Announcements", path: "/admin/announcements", requiredPermission: "marketing" },
          { icon: PenSquare, label: "Blogs", path: "/admin/blogs", requiredPermission: "marketing" },
        ],
      },
      {
        label: "Email",
        items: [
          { icon: Mail, label: "Templates", path: "/admin/email-templates", requiredPermission: "email" },
          { icon: Send, label: "Campaigns", path: "/admin/email-campaigns", requiredPermission: "email" },
          { icon: Zap, label: "Automations", path: "/admin/email-automations", requiredPermission: "email" },
          // { icon: Settings, label: "Settings", path: "/admin/email-settings" },
        ],
      },
      {
        label: "System",
        items: [
          { icon: FileBarChart, label: "Analytics", path: "/admin/analytics", requiredPermission: "analytics" },
          { icon: Brain, label: "Intelligence", path: "/admin/intelligence", requiredPermission: "intelligence" },
          { icon: Bell, label: "Alerts", path: "/admin/alerts", requiredPermission: "alerts" },
          { icon: Zap, label: "Automation", path: "/admin/automation", requiredPermission: "automation" },
          { icon: Settings, label: "Settings", path: "/admin/settings", requiredPermission: "settings" },
          { icon: Shield, label: "Launch Reset", path: "/admin/launch-password-reset", requiredPermission: "users" },
          { icon: CreditCard, label: "Payments", path: "/admin/payment-transactions", requiredPermission: "payments" },
          { icon: Wallet, label: "Reconciliation", path: "/admin/payment-reconciliation", requiredPermission: "payments" },
          { icon: Users, label: "Store Approval", path: "/admin/access-requests", requiredPermission: "users" },
          { icon: Logs, label: "Activity Logs", path: "/admin/logs", requiredPermission: "logs" },
          { icon: LogIn, label: "Login Logs", path: "/admin/login-logs", requiredPermission: "logs" },
        ],
      },
    ],
    pharmacy: [
      {
        label: "Shop",
        items: [
          { icon: Package, label: "Products", path: "/pharmacy/products" },
          { icon: ShoppingCart, label: "Create Order", path: "/pharmacy/order/create", badge: totalCartItems > 0 ? totalCartItems.toString() : undefined },
          { icon: Heart, label: "Wishlist", path: "/pharmacy/wishlist" },
        ],
      },
      {
        label: "Orders & Invoices",
        items: [
          { icon: FileText, label: "My Orders", path: "/pharmacy/orders" },
          // { icon: History, label: "Order History", path: "/pharmacy/order-history" },
          { icon: Receipt, label: "Invoices", path: "/pharmacy/invoices" },
          { icon: FileBarChart, label: "Statements", path: "/pharmacy/statements" },
        ],
      },
      {
        label: "Payments & Rewards",
        items: [
          { icon: Wallet, label: "Credit Balance", path: "/pharmacy/credit" },
          { icon: CreditCard, label: "Payment Methods", path: "/pharmacy/payment-methods" },
          { icon: Gift, label: "Rewards", path: "/pharmacy/rewards" },
        ],
      },
      {
        label: "Account",
        items: [
          { icon: Settings, label: "Settings", path: "/pharmacy/settings" },
        ],
      },
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

  const resolvedMenuItems = useMemo(() => {
    if (role !== "admin" || !isInternalAdminType(currentUserProfile?.type)) {
      return menuItems[role]
    }

    return (menuItems.admin as NavigationGroup[])
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasAdminPermission(currentUserProfile, item.requiredPermission)),
      }))
      .filter((group) => group.items.length > 0)
  }, [currentUserProfile, menuItems, role])

  useEffect(() => {
    if (!hideFinancialData) return

    const root = document.body

    const financialFieldPattern = /(price|pricing|cost|amount|subtotal|total|revenue|balance|paid|payable|expense|charge|payment)/i

    const maskFinancialText = (value: string) => {
      let nextValue = value.replace(/\$\s?\d[\d,]*(?:\.\d{2})?/g, "Restricted")
      nextValue = nextValue.replace(/(?<![:\d])-?\b\d[\d,]*\.\d{2}\b/g, "Restricted")

      if (!nextValue.includes("Restricted")) {
        const trimmed = nextValue.trim()
        if (/^-?\d[\d,]*\.\d{2}$/.test(trimmed)) {
          nextValue = nextValue.replace(trimmed, "Restricted")
        }
      }

      return nextValue
    }

    const shouldSkipNode = (node: Node | null) => {
      const parentElement = node?.parentElement
      if (!parentElement) return true

      const tagName = parentElement.tagName
      return ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(tagName) || parentElement.isContentEditable
    }

    const maskFinancialInputs = () => {
      const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")

      fields.forEach((field) => {
        const markers = [
          field.name,
          field.id,
          field.placeholder,
          field.getAttribute("aria-label"),
          field.getAttribute("data-testid"),
        ]
          .filter(Boolean)
          .join(" ")

        if (!financialFieldPattern.test(markers)) return

        if (field instanceof HTMLInputElement && field.type === "number") {
          field.value = ""
        } else if (/^-?\d[\d,]*(?:\.\d{2})?$/.test(field.value.trim())) {
          field.value = "Restricted"
        }

        field.placeholder = "Restricted"
        field.readOnly = true
      })
    }

    const applyMask = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let currentNode = walker.nextNode()

      while (currentNode) {
        if (!shouldSkipNode(currentNode) && currentNode.textContent) {
          const masked = maskFinancialText(currentNode.textContent)
          if (masked !== currentNode.textContent) {
            currentNode.textContent = masked
          }
        }
        currentNode = walker.nextNode()
      }

      maskFinancialInputs()
    }

    applyMask()

    const observer = new MutationObserver(() => {
      applyMask()
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [hideFinancialData])

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <Sidebar
          collapsible="icon"
          className={`border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-50 transition-all duration-300 shadow-lg ${
            isMobile ? "w-full max-w-[280px]" : ""
          }`}
        >
          <SidebarContent className="scrollbar-thin">
            <div className="flex flex-col h-full">
              <SidebarHeader />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarNavigation items={resolvedMenuItems} isGrouped={role === "group" || role === "admin" || role === "pharmacy"} />
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarProfile />
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <TopBar hideCartDrawer={hideCartDrawer} />
          <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 overflow-y-auto">
            <div ref={contentRef} className="mx-auto max-w-7xl w-full">
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
