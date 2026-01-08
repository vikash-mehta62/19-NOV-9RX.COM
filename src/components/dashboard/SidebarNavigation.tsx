"use client"

import { useState } from "react"
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
import { ChevronRight, ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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

  // Track which groups are open - default first group open
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true })

  const toggleGroup = (index: number) => {
    setOpenGroups(prev => ({ ...prev, [index]: !prev[index] }))
  }

  // Check if any item in a group is active
  const isGroupActive = (group: NavigationGroup) => {
    return group.items.some(item => location.pathname === item.path)
  }

  if (isGrouped) {
    const groupedItems = items as NavigationGroup[]
    return (
      <TooltipProvider>
        <div className="space-y-1">
          {groupedItems.map((group, groupIndex) => {
            const isOpen = openGroups[groupIndex] ?? isGroupActive(group)
            const hasActiveItem = isGroupActive(group)
            
            return (
              <Collapsible
                key={groupIndex}
                // When sidebar is collapsed, keep group content open so icons remain visible
                open={isCollapsed ? true : isOpen}
                onOpenChange={() => !isCollapsed && toggleGroup(groupIndex)}
              >
                <SidebarGroup className="py-0">
                  {!isCollapsed ? (
                    <CollapsibleTrigger className="w-full">
                      <SidebarGroupLabel 
                        className={`
                          px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer
                          rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[40px]
                          ${hasActiveItem 
                            ? "text-blue-700" 
                            : "text-gray-500 hover:text-gray-700"
                          }
                        `}
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 text-gray-400 ${
                            isOpen ? "" : "-rotate-90"
                          }`} 
                        />
                        {group.label}
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent ml-2"></div>
                        {hasActiveItem && (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                  ) : null}
                  
                  <CollapsibleContent className="transition-all duration-200">
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1 px-2 mt-1">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.path
                          return (
                            <SidebarMenuItem key={item.path}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton
                                    onClick={() => navigate(item.path)}
                                    className={`
                                      group relative flex items-center transition-all duration-200
                                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                                      ${
                                        isCollapsed
                                          ? "justify-center p-2 gap-0 rounded-lg"
                                          : "gap-3 px-3 py-2.5 rounded-xl min-h-[44px]"
                                      }
                                      ${
                                        isActive
                                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                          : "hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                                      }
                                    `}
                                  >
                                    <item.icon
                                      className={`h-4 w-4 transition-all duration-300 flex-shrink-0 ${
                                        isActive ? "scale-110" : "group-hover:scale-110"
                                      }`}
                                    />

                                    {!isCollapsed && (
                                      <>
                                        <span className={`font-medium text-sm truncate ${
                                          isActive ? "tracking-wide" : ""
                                        }`}>
                                          {item.label}
                                        </span>

                                        <div className="ml-auto flex items-center gap-2">
                                          {item.badge && (
                                            <Badge
                                              variant={isActive ? "secondary" : "default"}
                                              className={`text-xs font-bold ${
                                                isActive 
                                                  ? "bg-white/30 text-white" 
                                                  : "bg-blue-100 text-blue-700"
                                              }`}
                                            >
                                              {item.badge}
                                            </Badge>
                                          )}

                                          {item.isNew && (
                                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                          )}

                                          {isActive && (
                                            <ChevronRight className="h-4 w-4 opacity-80" />
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                {isCollapsed && (
                                  <TooltipContent side="right" className="font-medium">
                                    {item.label}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )
          })}
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
                      group relative flex items-center transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                      ${
                        isCollapsed
                          ? "justify-center p-2 gap-0 rounded-lg"
                          : "gap-3 px-3 py-3 rounded-xl min-h-[44px]"
                      }
                      ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                          : "hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                      }
                    `}
                  >
                    <div className={`relative`}>
                      <item.icon
                        className={`h-5 w-5 transition-all duration-200 flex-shrink-0 ${
                          isActive ? "scale-110" : "group-hover:scale-110"
                        }`}
                      />
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
                              className={`text-xs font-bold transition-all duration-200 ${
                                isActive 
                                  ? "bg-white/30 text-white" 
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}

                          {item.isNew && (
                            <div className="relative">
                              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                              <div className="absolute inset-0 h-2 w-2 rounded-full bg-blue-400 animate-ping"></div>
                            </div>
                          )}

                          {isActive && (
                            <ChevronRight className="h-4 w-4 opacity-90" />
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
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
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
