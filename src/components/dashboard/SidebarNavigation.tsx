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
                <SidebarGroupLabel className="px-3 text-xs font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  {group.label}
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
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
                                group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02]
                                ${isCollapsed ? "justify-center" : ""}
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40"
                                    : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-gray-700 hover:text-gray-900 dark:hover:from-gray-800 dark:hover:to-gray-700"
                                }
                              `}
                            >
                              <div className={`relative ${isActive ? "animate-pulse" : ""}`}>
                                <item.icon
                                  className={`h-5 w-5 transition-all duration-300 flex-shrink-0 ${
                                    isActive ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 group-hover:rotate-3"
                                  }`}
                                />
                                {isActive && (
                                  <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                                )}
                              </div>

                              {!isCollapsed && (
                                <>
                                  <span className={`font-semibold text-sm truncate transition-all duration-300 ${
                                    isActive ? "tracking-wide" : ""
                                  }`}>
                                    {item.label}
                                  </span>

                                  <div className="ml-auto flex items-center gap-2">
                                    {item.badge && (
                                      <Badge
                                        variant={isActive ? "secondary" : "default"}
                                        className={`text-xs font-bold transition-all duration-300 ${
                                          isActive 
                                            ? "bg-white/30 text-white backdrop-blur-sm shadow-lg" 
                                            : "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 hover:from-blue-200 hover:to-purple-200"
                                        }`}
                                      >
                                        {item.badge}
                                      </Badge>
                                    )}

                                    {item.isNew && (
                                      <div className="relative">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-400 animate-ping"></div>
                                      </div>
                                    )}

                                    {isActive && (
                                      <ChevronRight className="h-4 w-4 opacity-90 animate-pulse" />
                                    )}
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
                      group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02]
                      ${isCollapsed ? "justify-center" : ""}
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40"
                          : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-gray-700 hover:text-gray-900 dark:hover:from-gray-800 dark:hover:to-gray-700"
                      }
                    `}
                  >
                    <div className={`relative ${isActive ? "animate-pulse" : ""}`}>
                      <item.icon
                        className={`h-5 w-5 transition-all duration-300 flex-shrink-0 ${
                          isActive ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 group-hover:rotate-3"
                        }`}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <>
                        <span className={`font-semibold text-sm truncate transition-all duration-300 ${
                          isActive ? "tracking-wide" : ""
                        }`}>
                          {item.label}
                        </span>

                        <div className="ml-auto flex items-center gap-2">
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "default"}
                              className={`text-xs font-bold transition-all duration-300 ${
                                isActive 
                                  ? "bg-white/30 text-white backdrop-blur-sm shadow-lg" 
                                  : "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 hover:from-blue-200 hover:to-purple-200"
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}

                          {item.isNew && (
                            <div className="relative">
                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                              <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-400 animate-ping"></div>
                            </div>
                          )}

                          {isActive && (
                            <ChevronRight className="h-4 w-4 opacity-90 animate-pulse" />
                          )}
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
