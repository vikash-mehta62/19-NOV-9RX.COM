"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Eye,
    Calendar,
    Package,
    AlertCircle,
    CheckCircle,
    XCircle,
    Edit,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import axios from "../../../axiosconfig"
import DashboardLayout from "@/components/DashboardLayout"

interface LogEntry {
    _id: string
    userId: string
    orderId: string
    action: string
    details: {
        message: string
        oldOrder?: any
        updateOrder?: any
        items?: any[]
        [key: string]: any
    }
    timestamp: string
    __v: number
}

interface FilterState {
    orderNumber: string
    startDate: Date | undefined
    endDate: Date | undefined
    actions: string[]
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
    const [loading, setLoading] = useState(true)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(50)
    const [totalItems, setTotalItems] = useState(0)

    // Filters
    const [filters, setFilters] = useState<FilterState>({
        orderNumber: "",
        startDate: undefined,
        endDate: undefined,
        actions: [],
    })

    const actionTypes = [
        { value: "order_created", label: "Order Created" },
        { value: "order_edited", label: "Order Edited" },
        { value: "payment_success", label: "Payment Success" },
        { value: "payment_failed", label: "Payment Failed" },
        { value: "order_and_payment_success", label: "Prepaid Order" },
    ]

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Replace with actual API call with query parameters
                const res = await axios.get("/logs/get-logs", {
                    params: {
                        page: currentPage,
                        limit: itemsPerPage,
                        orderNumber: filters.orderNumber || undefined,
                        startDate: filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : undefined,
                        endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : undefined,
                        actions: filters.actions.length > 0 ? filters.actions.join(",") : undefined,
                    },
                })

                setLogs(res.data.logs)
                setFilteredLogs(res.data.logs)
                setTotalItems(res.data.total || res.data.logs.length)
                setLoading(false)
            } catch (error) {
                console.error("Failed to fetch logs:", error)
                setLoading(false)
            }
        }

        fetchLogs()
    }, [currentPage, itemsPerPage, filters])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // The search is already handled by the useEffect dependency on filters
    }

    const handleFilterChange = (key: keyof FilterState, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
        setCurrentPage(1) // Reset to first page when filters change
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
        setCurrentPage(1) // Reset to first page when filters change
    }

    const clearFilters = () => {
        setFilters({
            orderNumber: "",
            startDate: undefined,
            endDate: undefined,
            actions: [],
        })
        setCurrentPage(1)
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case "order_created":
                return <Package className="h-4 w-4" />
            case "order_edited":
                return <Edit className="h-4 w-4" />
            case "payment_success":
                return <CheckCircle className="h-4 w-4" />
            case "payment_failed":
                return <XCircle className="h-4 w-4" />
            default:
                return <AlertCircle className="h-4 w-4" />
        }
    }

    const getActionBadge = (action: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            order_created: "default",
            order_edited: "secondary",
            payment_success: "default",
            payment_failed: "destructive",
        }

        return (
            <Badge variant={variants[action] || "outline"} className="flex items-center gap-1">
                {getActionIcon(action)}
                {action.replace("_", " ").toUpperCase()}
            </Badge>
        )
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-US", {
            timeZone: "America/New_York",  // Delaware shares the New York timezone (ET)
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,  // optional, if you want AM/PM format
        });
    };


    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    const currentItems = filteredLogs.slice(startIndex, endIndex)

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Logs</CardTitle>
                        <CardDescription>Loading system logs...</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <DashboardLayout>

            <div className="container mx-auto p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Admin Logs
                        </CardTitle>
                        <CardDescription>System activity logs showing all actions performed in the application</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search and Filter Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Search by Order Number */}
                            <form onSubmit={handleSearch} className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by Order Number"
                                        className="pl-8"
                                        value={filters.orderNumber}
                                        onChange={(e) => handleFilterChange("orderNumber", e.target.value)}
                                    />
                                </div>
                                <Button type="submit">Search</Button>
                            </form>

                            {/* Date Filter */}
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
                                            {filters.actions.length > 0 ? `${filters.actions.length} filters` : "Filter Actions"}
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
                                        <TableHead>Action</TableHead>
                                        <TableHead>Order Number</TableHead>
                                        {/* <TableHead>User ID</TableHead> */}
                                        <TableHead>Timestamp</TableHead>
                                        {/* <TableHead>Message</TableHead> */}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log._id}>
                                            <TableCell>{getActionBadge(log.action)}</TableCell>
                                            <TableCell className="font-mono font-medium">{log.orderId}</TableCell>
                                            {/* <TableCell className="font-mono text-sm text-muted-foreground">
                                                {log.userId.slice(0, 8)}...
                                            </TableCell> */}
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </TableCell>
                                            {/* <TableCell className="max-w-xs truncate">{log.details.message}</TableCell> */}
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View Details
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh]">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                {getActionIcon(log.action)}
                                                                Log Details - {log.action.replace("_", " ").toUpperCase()}
                                                            </DialogTitle>
                                                            <DialogDescription>Complete information for log entry {log._id}</DialogDescription>
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
                                                                            <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                                                                            <div className="mt-1">{getActionBadge(log.action)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                                                                            <p className="font-mono text-sm">{log.orderId}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                                                            <p className="font-mono text-sm">{log.userId}</p>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                                                                            <p className="text-sm">{formatTimestamp(log.timestamp)}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <Separator />

                                                                {/* Message */}
                                                                <div>
                                                                    <h3 className="text-lg font-semibold mb-3">Message</h3>
                                                                    <div className="bg-muted p-3 rounded-md">
                                                                        <p className="text-sm">{log.details.message}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Order Details */}
                                                                {(log.details.oldOrder || log.details.updateOrder) && (
                                                                    <>
                                                                        <Separator />
                                                                        <div>
                                                                            <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                                                                            <div className="space-y-4">
                                                                                {log.details.oldOrder && (
                                                                                    <div>
                                                                                        <h4 className="font-medium mb-2">Previous Order Data</h4>
                                                                                        <div className="bg-muted p-3 rounded-md">
                                                                                            <pre className="text-xs overflow-auto">
                                                                                                {JSON.stringify(log.details.oldOrder, null, 2)}
                                                                                            </pre>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                {log.details.updateOrder && (
                                                                                    <div>
                                                                                        <h4 className="font-medium mb-2">Updated Order Data</h4>
                                                                                        <div className="bg-muted p-3 rounded-md">
                                                                                            <pre className="text-xs overflow-auto">
                                                                                                {JSON.stringify(log.details.updateOrder, null, 2)}
                                                                                            </pre>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {/* Items */}
                                                                {log.details.items && (
                                                                    <>
                                                                        <Separator />
                                                                        <div>
                                                                            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                                                                            <div className="bg-muted p-3 rounded-md">
                                                                                <pre className="text-xs overflow-auto">
                                                                                    {JSON.stringify(log.details.items, null, 2)}
                                                                                </pre>
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
                        </div>

                        {logs.length === 0 && (
                            <div className="text-center py-8">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">No logs found</h3>
                                <p className="text-muted-foreground">There are no system logs matching your filters.</p>
                                {(filters.orderNumber || filters.startDate || filters.endDate || filters.actions.length > 0) && (
                                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {logs.length > 0 && (
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Showing {startIndex + 1} to {endIndex} of {totalItems} entries
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
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-sm font-medium">Orders Created</p>
                                    <p className="text-2xl font-bold">{logs.filter((log) => log.action === "order_created").length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Edit className="h-4 w-4 text-orange-500" />
                                <div>
                                    <p className="text-sm font-medium">Orders Edited</p>
                                    <p className="text-2xl font-bold">{logs.filter((log) => log.action === "order_edited").length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium">Successful Payments</p>
                                    <p className="text-2xl font-bold">{logs.filter((log) => log.action === "payment_success").length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <div>
                                    <p className="text-sm font-medium">Failed Payments</p>
                                    <p className="text-2xl font-bold">{logs.filter((log) => log.action === "payment_failed").length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>

    )
}
