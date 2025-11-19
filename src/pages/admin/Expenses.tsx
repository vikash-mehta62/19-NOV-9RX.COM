"use client"

import { useState, useEffect } from "react"
import {
  PlusCircle,
  Calendar,
  Trash2,
  Banknote,
  ArrowDownUp,
  Filter,
  Download,
  DollarSign,
  Receipt,
  BarChart3,
  PieChart,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Added DialogTrigger
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { format, parseISO, isValid } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import DashboardLayout from "@/components/DashboardLayout"
import { CSVLink } from "react-csv"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

export interface Expense {
  id: string
  name: string
  amount: number
  description?: string
  date: string
  created_at: string
}

// Get all expenses
export const getAllExpenses = async (): Promise<Expense[]> => {
  try {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return []
  }
}

// Add a new expense
export const addExpense = async (expense: Partial<Expense>): Promise<Expense | null> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          name: expense.name,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
        },
      ])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error("Error adding expense:", error)
    throw error
  }
}

// Delete an expense
export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (error) throw error
  } catch (error) {
    console.error("Error deleting expense:", error)
    throw error
  }
}

const mapToExpenses = (data: any[]): Expense[] => {
  if (!Array.isArray(data)) {
    console.error("Expected array for expenses mapping, got:", data)
    return []
  }
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    description: item.description,
    date: item.date,
    created_at: item.created_at,
  }))
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false) // State for filter dialog
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    name: "",
    amount: 0,
    description: "",
    date: new Date().toISOString(),
  })
  // Initializing startDate and endDate to undefined to show all expenses by default
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const { toast } = useToast()

  // Local states for filter dialog inputs
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate)
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate)

  const headers = [
    { label: "ID", key: "id" },
    { label: "Name", key: "name" },
    { label: "Amount", key: "amount" },
    { label: "Description", key: "description" },
    { label: "Date", key: "date" },
    { label: "Created At", key: "created_at" },
  ]

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const allExpenses = await getAllExpenses()
      const typedExpenses = mapToExpenses(allExpenses)
      setExpenses(typedExpenses)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  // Sync local filter states with global states when dialog opens
  useEffect(() => {
    if (showFilterDialog) {
      setLocalSearchTerm(searchTerm)
      setLocalStartDate(startDate)
      setLocalEndDate(endDate)
    }
  }, [showFilterDialog, searchTerm, startDate, endDate])

  const handleApplyFilters = () => {
    setSearchTerm(localSearchTerm)
    setStartDate(localStartDate)
    setEndDate(localEndDate)
    setShowFilterDialog(false)
  }

  const handleClearFilters = () => {
    setLocalSearchTerm("")
    setLocalStartDate(undefined)
    setLocalEndDate(undefined)
    setSearchTerm("")
    setStartDate(undefined)
    setEndDate(undefined)
    setShowFilterDialog(false)
  }

  const handleAddExpense = async () => {
    if (!newExpense.name) {
      toast({
        title: "Missing fields",
        description: "Please provide a name for the expense",
        variant: "destructive",
      })
      return
    }
    if (!newExpense.amount || newExpense.amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please provide a valid amount for the expense",
        variant: "destructive",
      })
      return
    }
    try {
      await addExpense(newExpense)
      toast({
        title: "Success",
        description: "Expense added successfully",
      })
      setShowAddExpense(false)
      setNewExpense({
        name: "",
        amount: 0,
        description: "",
        date: new Date().toISOString(),
      })
      fetchExpenses()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      })
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id)
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      })
      fetchExpenses()
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      })
    }
  }

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch =
        expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!matchesSearch) return false

      if (startDate || endDate) {
        const expenseDate = parseISO(expense.date)
        if (!isValid(expenseDate)) return false

        if (startDate && expenseDate < startDate) return false
        if (endDate) {
          const endOfDay = new Date(endDate)
          endOfDay.setHours(23, 59, 59, 999)
          if (expenseDate > endOfDay) return false
        }
      }
      return true
    })
    .sort((a, b) => {
      const dateA = parseISO(a.date)
      const dateB = parseISO(b.date)

      if (sortOrder === "asc") {
        return dateA.getTime() - dateB.getTime()
      } else {
        return dateB.getTime() - dateA.getTime()
      }
    })

  const totalFilteredExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  // For monthly grouping
  const groupedExpenses = filteredExpenses.reduce(
    (groups, expense) => {
      const date = parseISO(expense.date)
      if (!isValid(date)) return groups
      const monthYear = format(date, "MMMM yyyy")
      if (!groups[monthYear]) {
        groups[monthYear] = {
          expenses: [],
          total: 0,
        }
      }
      groups[monthYear].expenses.push(expense)
      groups[monthYear].total += Number(expense.amount)
      return groups
    },
    {} as Record<string, { expenses: Expense[]; total: number }>,
  )

  // Calculate statistics
  const currentMonthExpenses = expenses.filter((expense) => {
    const expenseDate = parseISO(expense.date)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return isValid(expenseDate) && expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
  })
  const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  const previousMonthExpenses = expenses.filter((expense) => {
    const expenseDate = parseISO(expense.date)
    const now = new Date()
    const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const previousMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return (
      isValid(expenseDate) &&
      expenseDate.getMonth() === previousMonth &&
      expenseDate.getFullYear() === previousMonthYear
    )
  })
  const previousMonthTotal = previousMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  const monthOverMonthChange =
    previousMonthTotal === 0
      ? currentMonthTotal > 0
        ? 100
        : 0 // If previous month was 0, and current is > 0, it's a 100% increase, else 0
      : ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100

  return (
    <DashboardLayout role="admin">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Tracker</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Manage and track your business expenses efficiently
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button
                onClick={() => setShowAddExpense(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-sm border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses (Filtered)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalFilteredExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Based on current filters</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Month Expenses</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentMonthTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total for {format(new Date(), "MMMM yyyy")}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Previous Month Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${previousMonthTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total for {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "MMMM yyyy")}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Month-over-Month Change</CardTitle>
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${monthOverMonthChange >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {monthOverMonthChange.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">vs. previous month</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid grid-cols-2 mb-6 w-full max-w-md mx-auto">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Expense List
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <Card className="shadow-lg border-gray-200 dark:border-gray-700">
                <CardHeader className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Expenses</h2>
                    <div className="flex space-x-2">
                      {/* Filter Dialog Trigger */}
                      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                            <Filter className="h-4 w-4" />
                            Filter
                            {(searchTerm || startDate || endDate) && (
                              <Badge className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white">Active</Badge>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Filter Expenses</DialogTitle>
                            <DialogDescription>Apply filters to narrow down your expense list.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="filter-search">Search</Label>
                              <Input
                                id="filter-search"
                                placeholder="Search by name or description..."
                                value={localSearchTerm}
                                onChange={(e) => setLocalSearchTerm(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Date Range</Label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <DatePicker
                                  date={localStartDate}
                                  setDate={setLocalStartDate}
                                  placeholder="Start Date"
                                />
                                <DatePicker date={localEndDate} setDate={setLocalEndDate} placeholder="End Date" />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={handleClearFilters}>
                              Clear Filters
                            </Button>
                            <Button
                              onClick={handleApplyFilters}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Apply Filters
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* View Mode and Sort Controls (remain outside filter dialog) */}
                      <Select value={viewMode} onValueChange={(value) => setViewMode(value as "daily" | "monthly")}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="View Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily View</SelectItem>
                          <SelectItem value="monthly">Monthly View</SelectItem>
                        </SelectContent>
                      </Select>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            >
                              <ArrowDownUp
                                className={`h-4 w-4 ${sortOrder === "desc" ? "text-emerald-500" : "text-gray-500"}`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sort by date: {sortOrder === "asc" ? "Oldest first" : "Newest first"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expenses...</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === "daily" ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="font-semibold">Name</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    Date
                                  </div>
                                </TableHead>
                                <TableHead className="font-semibold">Description</TableHead>
                                <TableHead className="w-20 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredExpenses.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                    <div className="flex flex-col items-center">
                                      <Receipt className="h-12 w-12 text-gray-300 mb-2" />
                                      <p>No expenses found for the selected period</p>
                                      <Button
                                        variant="link"
                                        onClick={handleClearFilters} // Use the new clear filters handler
                                        className="mt-2 text-emerald-500"
                                      >
                                        Clear filters
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredExpenses.map((expense) => (
                                  <TableRow
                                    key={expense.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"
                                        >
                                          {expense.name.charAt(0).toUpperCase()}
                                        </Badge>
                                        {expense.name}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      ${Number.parseFloat(expense.amount as any).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      {isValid(parseISO(expense.date))
                                        ? format(parseISO(expense.date), "dd MMM yyyy")
                                        : "Invalid date"}
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                      {expense.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteExpense(expense.id)}
                                              className="hover:bg-red-50 hover:text-red-600 text-gray-500"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Delete expense</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="space-y-6 p-4">
                          {Object.keys(groupedExpenses).length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <div className="flex flex-col items-center">
                                <PieChart className="h-12 w-12 text-gray-300 mb-2" />
                                <p>No expenses found for the selected period</p>
                                <Button
                                  variant="link"
                                  onClick={handleClearFilters} // Use the new clear filters handler
                                  className="mt-2 text-emerald-500"
                                >
                                  Clear filters
                                </Button>
                              </div>
                            </div>
                          ) : (
                            Object.entries(groupedExpenses).map(([month, data]) => (
                              <div
                                key={month}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
                              >
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 flex justify-between items-center">
                                  <h3 className="font-medium text-lg flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    {month}
                                  </h3>
                                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                    <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      ${data.total.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                        <TableHead className="font-semibold">Name</TableHead>
                                        <TableHead className="font-semibold">Amount</TableHead>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="w-20 text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {data.expenses.map((expense) => (
                                        <TableRow
                                          key={expense.id}
                                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        >
                                          <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"
                                              >
                                                {expense.name.charAt(0).toUpperCase()}
                                              </Badge>
                                              {expense.name}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            ${Number.parseFloat(expense.amount as any).toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            {isValid(parseISO(expense.date))
                                              ? format(parseISO(expense.date), "dd MMM yyyy")
                                              : "Invalid date"}
                                          </TableCell>
                                          <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                            {expense.description || "-"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    className="hover:bg-red-50 hover:text-red-600 text-gray-500"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Delete expense</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Expense Count */}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} found
                  </span>
                  {/* Right Side Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                    {/* CSV Download Button */}
                    <CSVLink
                      data={filteredExpenses}
                      headers={headers}
                      filename="expenses.csv"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium text-sm px-4 py-2 rounded-md shadow transition duration-200"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </CSVLink>
                    {/* Total Display */}
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ${totalFilteredExpenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="shadow-lg border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Expense Analytics</CardTitle>
                  <CardDescription>Visualize your spending patterns and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium mb-4">Monthly Breakdown</h3>
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-2" />
                          <p>Monthly expense chart will appear here</p>
                          <p className="text-sm mt-2">Upgrade to premium for analytics</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium mb-4">Expense Categories</h3>
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <PieChart className="h-16 w-16 mx-auto text-gray-300 mb-2" />
                          <p>Category distribution chart will appear here</p>
                          <p className="text-sm mt-2">Upgrade to premium for analytics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Add Expense Dialog */}
        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Enter the details of the expense you want to add.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Expense Name</Label>
                <Input
                  id="name"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                  placeholder="Rent, Utilities, Materials, etc."
                  className="focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number.parseFloat(e.target.value) })}
                  placeholder="Enter amount"
                  className="focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <DatePicker
                  date={newExpense.date ? parseISO(newExpense.date) : undefined}
                  setDate={(date) =>
                    setNewExpense({ ...newExpense, date: date ? date.toISOString() : new Date().toISOString() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newExpense.description || ""}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Add additional details"
                  rows={3}
                  className="focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>
            <DialogFooter className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Add Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default Expenses
