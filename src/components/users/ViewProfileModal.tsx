import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Mail, Phone, Building2, MapPin, FileText, User, ShoppingCart, BarChart3, StickyNote, CheckSquare, Plus, Pin, Calendar, AlertTriangle, DollarSign } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ViewProfileModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewProfileModal({ userId, open, onOpenChange }: ViewProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Orders pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  
  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Note form state
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    category: "general",
    is_pinned: false,
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    due_date: "",
    reminder_date: "",
    assigned_to: "",
  });

  useEffect(() => {
    if (open && userId) {
      fetchAllData();
    }
  }, [open, userId]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch orders and calculate analytics
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setAllOrders(ordersData || []);
      setOrders(ordersData || []);

      // Calculate analytics from orders
      const totalOrders = ordersData?.length || 0;
      const totalAmount = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      // Calculate paid and pending amounts from orders based on payment_status
      const paidAmount = ordersData?.filter(order => order.payment_status === "paid").reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const pendingAmount = ordersData?.filter(order => order.payment_status !== "paid").reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setAnalytics({
        totalOrders,
        totalAmount,
        paidAmount,
        pendingAmount,
      });

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("customer_notes")
        .select("*, created_by_profile:profiles!customer_notes_created_by_fkey(first_name, last_name)")
        .eq("customer_id", userId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!notesError) setNotes(notesData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("customer_tasks")
        .select("*, assigned_to_profile:profiles!customer_tasks_assigned_to_fkey(first_name, last_name)")
        .eq("customer_id", userId)
        .order("due_date", { ascending: true });

      if (!tasksError) setTasks(tasksData || []);

    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.title || !noteForm.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("customer_notes").insert({
        customer_id: userId,
        title: noteForm.title,
        content: noteForm.content,
        category: noteForm.category,
        is_pinned: noteForm.is_pinned,
        created_by: currentUser?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNoteForm({ title: "", content: "", category: "general", is_pinned: false });
      setIsNoteDialogOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.title || !taskForm.due_date) {
      toast({
        title: "Error",
        description: "Title and due date are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("customer_tasks").insert({
        customer_id: userId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: taskForm.status,
        due_date: taskForm.due_date,
        reminder_date: taskForm.reminder_date || null,
        assigned_to: userId, // Auto-assign to the customer
        created_by: currentUser?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task added successfully",
      });

      setTaskForm({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
        reminder_date: "",
        assigned_to: "",
      });
      setIsTaskDialogOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const togglePinNote = async (noteId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("customer_notes")
        .update({ is_pinned: !currentPinned })
        .eq("id", noteId);

      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("customer_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      fetchAllData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "cancelled": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...allOrders];

    // Apply filter
    if (orderFilter === "paid") {
      filtered = filtered.filter(order => order.payment_status === "paid");
    } else if (orderFilter === "pending") {
      filtered = filtered.filter(order => order.payment_status !== "paid");
    } else if (orderFilter === "shipped") {
      filtered = filtered.filter(order => order.status === "shipped" || order.status === "delivered");
    }

    // Apply sort
    if (orderSort === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (orderSort === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (orderSort === "amount_high") {
      filtered.sort((a, b) => b.total_amount - a.total_amount);
    } else if (orderSort === "amount_low") {
      filtered.sort((a, b) => a.total_amount - b.total_amount);
    }

    setOrders(filtered);
    setCurrentPage(1);
  }, [orderFilter, orderSort, allOrders]);

  // Paginate orders
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Profile - {profile?.display_name || profile?.first_name}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading profile...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && profile && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">
                <User className="h-4 w-4 mr-2" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="contact">
                <Building2 className="h-4 w-4 mr-2" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalOrders || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${analytics?.totalAmount?.toFixed(2) || "0.00"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Paid Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">${analytics?.paidAmount?.toFixed(2) || "0.00"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">${analytics?.pendingAmount?.toFixed(2) || "0.00"}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Order</span>
                      <span className="font-medium">{orders[0]?.created_at ? new Date(orders[0].created_at).toLocaleDateString() : "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Account Created</span>
                      <span className="font-medium">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="font-medium">{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">First Name</p>
                    <p className="font-medium">{profile.first_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Name</p>
                    <p className="font-medium">{profile.last_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{profile.display_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {profile.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge>{profile.type || "-"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                      {profile.status || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge variant="outline">{profile.role || "-"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{profile.company_name || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax & Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Preference</p>
                    <p className="font-medium">{profile.tax_preference || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Percentage</p>
                    <p className="font-medium">{profile.taxPercantage || "0"}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{profile.tax_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <Badge variant="outline">{profile.payment_terms || "-"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{profile.currency || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="font-medium">{profile.credit_limit ? `$${profile.credit_limit}` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{profile.payment_method || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Free Shipping</p>
                    <Badge variant={profile.freeShipping ? "default" : "secondary"}>
                      {profile.freeShipping ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Pay</p>
                    <Badge variant={profile.order_pay ? "default" : "secondary"}>
                      {profile.order_pay ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portal Enabled</p>
                    <Badge variant={profile.enable_portal ? "default" : "secondary"}>
                      {profile.enable_portal ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portal Language</p>
                    <p className="font-medium">{profile.portal_language || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <Badge variant={profile.account_status === "active" ? "default" : "secondary"}>
                      {profile.account_status || "-"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pharmacy License</p>
                    <p className="font-medium">{profile.pharmacy_license || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Group Station</p>
                    <p className="font-medium">{profile.group_station || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{profile.department || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language Preference</p>
                    <p className="font-medium">{profile.language_preference || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Contact Method</p>
                    <p className="font-medium">{profile.preferred_contact_method || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Notifications</p>
                    <Badge variant={profile.email_notifaction ? "default" : "secondary"}>
                      {profile.email_notifaction ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Updates</p>
                    <Badge variant={profile.order_updates ? "default" : "secondary"}>
                      {profile.order_updates ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Login</p>
                    <p className="font-medium">{profile.last_login ? new Date(profile.last_login).toLocaleDateString() : "-"}</p>
                  </div>
                </CardContent>
              </Card>

              {profile.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{profile.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Work Phone</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profile.work_phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mobile Phone</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profile.mobile_phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{profile.contact_person || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Alternative Email</p>
                    <p className="font-medium">{profile.alternative_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <p className="font-medium">{profile.website || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fax Number</p>
                    <p className="font-medium">{profile.fax_number || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>{profile.billing_address?.street1 || "-"}</p>
                    {profile.billing_address?.street2 && <p>{profile.billing_address.street2}</p>}
                    <p>
                      {profile.billing_address?.city || "-"}, {profile.billing_address?.state || "-"}{" "}
                      {profile.billing_address?.zip_code || "-"}
                    </p>
                    <p>{profile.billing_address?.phone || "-"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profile.same_as_shipping ? (
                      <p className="text-muted-foreground">Same as billing address</p>
                    ) : (
                      <>
                        <p>{profile.shipping_address?.street1 || "-"}</p>
                        {profile.shipping_address?.street2 && <p>{profile.shipping_address.street2}</p>}
                        <p>
                          {profile.shipping_address?.city || "-"}, {profile.shipping_address?.state || "-"}{" "}
                          {profile.shipping_address?.zip_code || "-"}
                        </p>
                        <p>{profile.shipping_address?.phone || "-"}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Order History</CardTitle>
                    <div className="flex gap-2">
                      <Select value={orderFilter} onValueChange={setOrderFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orders</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending Payment</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={orderSort} onValueChange={setOrderSort}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="amount_high">Amount: High to Low</SelectItem>
                          <SelectItem value="amount_low">Amount: Low to High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrders.length > 0 ? (
                        currentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge>{order.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                                {order.payment_status || "unpaid"}
                              </Badge>
                            </TableCell>
                            <TableCell className={order.payment_status === "paid" ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                              ${order.total_amount?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, orders.length)} of {orders.length} orders
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsNoteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              <div className="space-y-2">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{note.title}</CardTitle>
                          <Badge variant="outline">{note.category}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePinNote(note.id, note.is_pinned)}
                        >
                          <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {note.created_by_profile?.first_name} {note.created_by_profile?.last_name} on{" "}
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No notes yet</p>
                )}
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => updateTaskStatus(task.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && <p className="text-sm mb-2">{task.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        {task.reminder_date && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Reminder: {new Date(task.reminder_date).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          Assigned to: {task.assigned_to_profile?.first_name} {task.assigned_to_profile?.last_name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Add Note Dialog */}
        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Note Title"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Note Content"
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={noteForm.category}
                  onValueChange={(value) => setNoteForm({ ...noteForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={noteForm.is_pinned}
                  onChange={(e) => setNoteForm({ ...noteForm, is_pinned: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="pin-note" className="text-sm font-medium">
                  Pin this note
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Task Title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Task Description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Date</label>
                  <Input
                    type="date"
                    value={taskForm.reminder_date}
                    onChange={(e) => setTaskForm({ ...taskForm, reminder_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned To</label>
                <Input
                  value={profile?.display_name || `${profile?.first_name} ${profile?.last_name}`}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Task will be assigned to this customer</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
