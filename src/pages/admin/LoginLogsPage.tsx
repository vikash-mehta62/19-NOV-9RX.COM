"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CheckCircle,
  XCircle,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogIn,
  Activity,
  TrendingUp,
  AlertTriangle,
  Users as UsersIcon,
  AlertCircle,
  Eye,
} from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import axios from "../../../axiosconfig"
import DashboardLayout from "@/components/DashboardLayout"
import { supabase } from "@/integrations/supabase/client"

interface LoginLog {
  _id: string
  userId: string
  action: "login" | "login_failed"
  details: {
    email: string
    ip: string
    device?: string
    browser?: string
    os?: string
    reason?: string
    location?: {
      country?: string
      city?: string
    }
  }
  timestamp: string
}

interface FilterState {
  email: string
  startDate: Date | undefined
  endDate: Date | undefined
  actions: string[]
}

interface Stats {
  totalLogins: number
  successfulLogins: number
  failedLogins: number
  successRate: string
  uniqueUsers: number
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    email: "",
    startDate: undefined,
    endDate: undefined,
    actions: [],
  })

  const actionTypes = [
    { value: "login", label: "Login Success" },
    { value: "login_failed", label: "Login Failed" },
  ]

  useEffect(() => {
    fetchLoginLogs()
    fetchStats()
  }, [currentPage, itemsPerPage, filters])

  const fetchLoginLogs = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setLoading(false)
        return
      }

      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      }

      if (filters.email) params.email = filters.email
      if (filters.startDate) params.startDate = format(filters.startDate, "yyyy-MM-dd")
      if (filters.endDate) params.endDate = format(filters.endDate, "yyyy-MM-dd")
      if (filters.actions.length > 0) params.action = filters.actions.join(",")

      const res = await axios.get("/api/login-logs", {
        params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.data.success) {
        setLogs(res.data.data)
        setTotalItems(res.data.pagination.totalCount)
      }
    } catch (error) {
      console.error("Failed to fetch login logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      const params: any = {}
      if (filters.startDate) params.startDate = format(filters.startDate, "yyyy-MM-dd")
      if (filters.endDate) params.endDate = format(filters.endDate, "yyyy-MM-dd")

      const res = await axios.get("/api/login-logs/stats", {
        params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.data.success) {
        setStats(res.data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const toggleActionFilter = (action: string) => {
    setFilters((prev) => {
      const currentActions = [...prev.actions]
      if (currentActions.includes(action)) {
        return { ...prev, actions: currentActions.filter((a) => a !== action) }
      } else {
        return { ...prev, actions: [...currentActions, action] }
      }
    })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      email: "",
      startDate: undefined,
      endDate: undefined,
      actions: [],
    })
    setCurrentPage(1)
  }

  const getActionIcon = (action: string) => {
    return action === "login" ? (
      <CheckCircle className="h-4 w-4" />
    ) : (
      <XCircle className="h-4 w-4" />
    )
  }

  const getActionBadge = (action: string) => {
    return (
      <Badge variant={action === "login" ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
        {getActionIcon(action)}
        {action === "login" ? "SUCCESS" : "FAILED"}
      </Badge>
    )
  }

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Monitor className="h-4 w-4" />
    
    switch (device.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <DashboardLayout>
      {loading && !stats ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Login Logs</CardTitle>
              <CardDescription>Loading login logs...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto p-6 space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Logins</p>
                      <p className="text-2xl font-bold">{stats.totalLogins}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{stats.successRate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Failed Attempts</p>
                      <p className="text-2xl font-bold">{stats.failedLogins}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                      <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login Logs
              </CardTitle>
              <CardDescription>Track all login attempts - successful and failed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search by Email */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by Email"
                      className="pl-8"
                      value={filters.email}
                      onChange={(e) => handleFilterChange("email", e.target.value)}
                    />
                  </div>
                  <Button onClick={() => fetchLoginLogs()}>Search</Button>
                </div>

                {/* Date and Action Filters */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.startDate && filters.endDate ? (
                          <>
                            {format(filters.startDate, "PPP")} - {format(filters.endDate, "PPP")}
                          </>
                        ) : (
                          <span>Select date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="grid gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="px-4 pt-2 block">Start Date</Label>
                            <CalendarComponent
                              mode="single"
                              selected={filters.startDate}
                              onSelect={(date) => handleFilterChange("startDate", date)}
                              initialFocus
                            />
                          </div>
                          <div>
                            <Label className="px-4 pt-2 block">End Date</Label>
                            <CalendarComponent
                              mode="single"
                              selected={filters.endDate}
                              onSelect={(date) => handleFilterChange("endDate", date)}
                              initialFocus
                            />
                          </div>
                        </div>
                        <div className="flex justify-end px-4 pb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleFilterChange("startDate", undefined)
                              handleFilterChange("endDate", undefined)
                            }}
                          >
                            Clear Dates
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Action Type Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Filter className="mr-2 h-4 w-4" />
                        {filters.actions.length > 0 ? `${filters.actions.length} filters` : "Filter Status"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                      <div className="p-4 space-y-2">
                        {actionTypes.map((action) => (
                          <div key={action.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`filter-${action.value}`}
                              checked={filters.actions.includes(action.value)}
                              onCheckedChange={() => toggleActionFilter(action.value)}
                            />
                            <label
                              htmlFor={`filter-${action.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {action.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="p-2 flex justify-between">
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear All
                        </Button>
                        <Button size="sm" onClick={() => document.body.click()}>
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Reason/Details</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-medium">{log.details.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{log.details.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {getDeviceIcon(log.details.device)}
                            <span>
                              {log.details.browser || "Unknown"} / {log.details.os || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(log.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.action === "login_failed" && log.details.reason ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-sm text-red-600 dark:text-red-400">
                                {log.details.reason}
                              </span>
                            </div>
                          ) : log.details.location?.country ? (
                            <span className="text-sm text-muted-foreground">
                              {log.details.location.city ? `${log.details.location.city}, ` : ""}
                              {log.details.location.country}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {getActionIcon(log.action)}
                                  Login Log Details
                                </DialogTitle>
                                <DialogDescription>Complete information for this login attempt</DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                <div className="space-y-6">
                                  {/* Basic Information */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Log ID</label>
                                        <p className="font-mono text-sm">{log._id}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">{getActionBadge(log.action)}</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                                        <p className="text-sm">{log.details.email}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                        <p className="font-mono text-sm">{log.userId || "N/A"}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                                        <p className="text-sm">{formatTimestamp(log.timestamp)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <Separator />

                                  {/* Device & Location Info */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Device & Location</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                                        <p className="font-mono text-sm">{log.details.ip}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Device Type</label>
                                        <p className="text-sm">{log.details.device || "Desktop"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Browser</label>
                                        <p className="text-sm">{log.details.browser || "N/A"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Operating System</label>
                                        <p className="text-sm">{log.details.os || "N/A"}</p>
                                      </div>
                                      {log.details.location && (
                                        <>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">Country</label>
                                            <p className="text-sm">{log.details.location.country || "N/A"}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">City</label>
                                            <p className="text-sm">{log.details.location.city || "N/A"}</p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Failure Reason */}
                                  {log.action === "login_failed" && log.details.reason && (
                                    <>
                                      <Separator />
                                      <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400">Failure Information</h3>
                                        <div className="bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 p-4 rounded-md">
                                          <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                                                Login Failed
                                              </p>
                                              <p className="text-base text-red-700 dark:text-red-300">
                                                <strong>Reason:</strong> {log.details.reason}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Raw Data */}
                                  <Separator />
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Complete Log Data</h3>
                                    <div className="bg-muted p-3 rounded-md">
                                      <pre className="text-xs overflow-auto">{JSON.stringify(log, null, 2)}</pre>
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {logs.length === 0 && (
                  <div className="text-center py-8">
                    <LogIn className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No login logs found</h3>
                    <p className="text-muted-foreground">There are no login logs matching your filters.</p>
                    {(filters.email || filters.startDate || filters.endDate || filters.actions.length > 0) && (
                      <Button variant="outline" className="mt-4" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {logs.length > 0 && (
                  <div className="flex items-center justify-between p-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="itemsPerPage">Show</Label>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number.parseInt(value))
                            setCurrentPage(1)
                          }}
                        >
                          <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="50" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="250">250</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>entries</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
