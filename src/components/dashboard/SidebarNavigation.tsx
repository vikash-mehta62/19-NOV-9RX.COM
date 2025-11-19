"use client"

import { useLocation, useNavigate } from "react-router-dom"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface NavigationItem {
  icon: LucideIcon
  label: string
  path: string
  badge?: string
  isNew?: boolean
}

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

interface SidebarNavigationProps {
  items: NavigationItem[] | NavigationGroup[]
  isGrouped?: boolean
}

export const SidebarNavigation = ({ items, isGrouped = false }: SidebarNavigationProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (isGrouped) {
    const groupedItems = items as NavigationGroup[]
    return (
      <TooltipProvider>
        <div className="space-y-4">
          {groupedItems.map((group, groupIndex) => (
            <SidebarGroup key={groupIndex}>
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 px-2">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <SidebarMenuItem key={item.path}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => navigate(item.path)}
                              className={`
                                group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]
                                ${isCollapsed ? "justify-center" : ""}
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                                    : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                                }
                              `}
                            >
                              <item.icon
                                className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${
                                  isActive ? "scale-110" : "group-hover:scale-105"
                                }`}
                              />

                              {!isCollapsed && (
                                <>
                                  <span className="font-medium text-sm truncate">{item.label}</span>

                                  <div className="ml-auto flex items-center gap-2">
                                    {item.badge && (
                                      <Badge
                                        variant={isActive ? "secondary" : "default"}
                                        className={`text-xs ${
                                          isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                                        }`}
                                      >
                                        {item.badge}
                                      </Badge>
                                    )}

                                    {item.isNew && (
                                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    )}

                                    {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
                                  </div>
                                </>
                              )}

                              {/* Badge for collapsed state */}
                              {isCollapsed && item.badge && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="h-3 w-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                    {item.badge}
                                  </div>
                                </div>
                              )}

                              {/* New indicator for collapsed state */}
                              {isCollapsed && item.isNew && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                </div>
                              )}
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right" className="font-medium">
                              {item.label}
                              {item.badge && (
                                <Badge variant="secondary" className="ml-2">
                                  {item.badge}
                                </Badge>
                              )}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </TooltipProvider>
    )
  }

  const regularItems = items as NavigationItem[]
  return (
    <TooltipProvider>
      <SidebarMenu className="space-y-1 ">
        {regularItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <SidebarMenuItem key={item.path}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]
                      ${isCollapsed ? "justify-center" : ""}
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                      }
                    `}
                  >
                    <item.icon
                      className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="font-medium text-sm truncate">{item.label}</span>

                        <div className="ml-auto flex items-center gap-2">
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "default"}
                              className={`text-xs ${isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"}`}
                            >
                              {item.badge}
                            </Badge>
                          )}

                          {item.isNew && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>}

                          {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
                        </div>
                      </>
                    )}

                    {/* Badge for collapsed state */}
                    {isCollapsed && item.badge && (
                      <div className="absolute -top-1 -right-1">
                        <div className="h-3 w-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {item.badge}
                        </div>
                      </div>
                    )}

                    {/* New indicator for collapsed state */}
                    {isCollapsed && item.isNew && (
                      <div className="absolute -top-1 -right-1">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      </div>
                    )}
                  </SidebarMenuButton>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </TooltipProvider>
  )
}
