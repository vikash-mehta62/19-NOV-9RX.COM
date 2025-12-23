import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  User,
  ShoppingCart,
  BarChart3,
  StickyNote,
  CheckSquare,
  Plus,
  Pin,
  Calendar as CalendarIcon,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Copy,
  Check,
  Pencil,
  Trash2,
  Search,
  Clock,
  Stethoscope,
  Users,
  Download,
  Send,
  UserX,
  UserCheck,
  Eye,
  MoreHorizontal,
  Shield,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderDetailsSheet } from "@/components/orders/table/OrderDetailsSheet";
import { EditUserModal } from "./EditUserModal";
import { supabase } from "@/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { EnhancedPaymentTab } from "./EnhancedPaymentTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { GroupManagementTab } from "./tabs/GroupManagementTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { orderStatementService } from "@/services/orderStatementService";
import { orderStatementDownloadService } from "@/services/orderStatementDownloadService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { cn } from "@/lib/utils";

// Helper: Relative time display
const getRelativeTime = (date: string | Date) => {
  const d = new Date(date);
  const now = new Date();
  // Show relative time for dates within last 7 days
  if (isAfter(d, subDays(now, 7))) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  return format(d, "MMM d, yyyy");
};

// Helper: Consistent status colors
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    // Order status
    pending: "bg-yellow-500",
    processing: "bg-blue-500",
    shipped: "bg-purple-500",
    delivered: "bg-green-500",
    cancelled: "bg-gray-500",
    // Payment status
    paid: "bg-green-500",
    unpaid: "bg-red-500",
    partial: "bg-orange-500",
    refunded: "bg-gray-500",
    // Task status
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    // General
    active: "bg-green-500",
    inactive: "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
};

// Helper: Type-specific colors and icons
const getTypeConfig = (type: string) => {
  const configs: Record<string, { color: string; bgColor: string; icon: any }> = {
    pharmacy: { color: "text-blue-600", bgColor: "bg-blue-100", icon: Building2 },
    hospital: { color: "text-red-600", bgColor: "bg-red-100", icon: Stethoscope },
    group: { color: "text-purple-600", bgColor: "bg-purple-100", icon: Users },
  };
  return configs[type] || { color: "text-gray-600", bgColor: "bg-gray-100", icon: User };
};

// Helper: Calculate profile completion
const calculateProfileCompletion = (profile: any) => {
  const fields = [
    "first_name", "last_name", "email", "display_name", "company_name",
    "work_phone", "mobile_phone", "billing_address", "shipping_address",
    "tax_id", "pharmacy_license", "payment_terms", "credit_limit"
  ];
  const filled = fields.filter(f => {
    const val = profile?.[f];
    return val && (typeof val === "object" ? Object.keys(val).length > 0 : true);
  }).length;
  return Math.round((filled / fields.length) * 100);
};

interface ViewProfileModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewProfileModal({
  userId,
  open,
  onOpenChange,
}: ViewProfileModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    type: "branch",
    manager: "",
    contact_phone: "",
    contact_email: "",
    address: {
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip_code: "",
    },
  });

  // Check if current user is admin
  const isAdmin = currentUserProfile?.role === "admin" || currentUserProfile?.role === "superadmin";

  // Orders pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");

  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Search/Filter states
  const [noteSearch, setNoteSearch] = useState("");
  const [noteFilterCategory, setNoteFilterCategory] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterStatus, setTaskFilterStatus] = useState("all");
  const [taskFilterPriority, setTaskFilterPriority] = useState("all");

  // Copy states
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Order statement download states
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadStartDate, setDownloadStartDate] = useState<Date | undefined>(undefined);
  const [downloadEndDate, setDownloadEndDate] = useState<Date | undefined>(new Date());
  const [isDownloading, setIsDownloading] = useState(false);

  // Edit profile modal state (uses existing EditUserModal)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Order details sheet state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);

  // Staff list for task assignment
  const [staffList, setStaffList] = useState<any[]>([]);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch current user's profile to check role
      if (user) {
        const { data: currentUserData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setCurrentUserProfile(currentUserData);
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch locations for this profile
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (!locationsError) setLocations(locationsData || []);

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
      const totalAmount =
        ordersData?.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        ) || 0;

      // Calculate paid and pending amounts from orders based on payment_status
      const paidAmount =
        ordersData
          ?.filter((order) => (order.payment_status || "").toLowerCase() === "paid")
          .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const pendingAmount =
        ordersData
          ?.filter((order) => 
            (order.payment_status || "").toLowerCase() !== "paid" && 
            (order.status || "").toLowerCase() !== "cancelled" && 
            (order.status || "").toLowerCase() !== "void"
          )
          .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setAnalytics({
        totalOrders,
        totalAmount,
        paidAmount,
        pendingAmount,
      });

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("customer_notes")
        .select(
          "*, created_by_profile:profiles!customer_notes_created_by_fkey(first_name, last_name)"
        )
        .eq("customer_id", userId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!notesError) setNotes(notesData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("customer_tasks")
        .select(
          "*, assigned_to_profile:profiles!customer_tasks_assigned_to_fkey(first_name, last_name)"
        )
        .eq("customer_id", userId)
        .order("due_date", { ascending: true });

      if (!tasksError) setTasks(tasksData || []);

      // Fetch staff list for task assignment (admin/staff users)
      const { data: staffData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .in("role", ["admin", "superadmin", "staff"])
        .eq("status", "active")
        .order("first_name");

      if (staffData) setStaffList(staffData);

      // Fetch customer documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("customer_documents")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (documentsError) {
        console.error("Error fetching documents:", documentsError);
      }
      setDocuments(documentsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({ title: "Copied!", description: `${field} copied to clipboard` });
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  // Open the existing EditUserModal
  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  // Toggle account status (suspend/activate)
  const handleToggleAccountStatus = async () => {
    const newStatus = profile?.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Account ${newStatus === "active" ? "activated" : "suspended"} successfully` 
      });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Change credit status
  const handleChangeCreditStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ credit_status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({ title: "Success", description: `Credit status changed to ${newStatus}` });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // NEW: Create order for customer
  const handleCreateOrder = () => {
    // Store customer data in sessionStorage for the order creation wizard
    const customerData = {
      customer: {
        id: profile.id,
        name: profile.display_name || `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.work_phone || profile.mobile_phone,
        type: profile.type,
        company_name: profile.company_name,
        tax_percentage: profile.taxPercantage || 0,
        freeShipping: profile.freeShipping || false,
        billing_address: profile.billing_address,
        shipping_address: profile.shipping_address,
      },
      billingAddress: profile.billing_address ? {
        company_name: profile.company_name || "",
        attention: "",
        street: profile.billing_address.street1 || profile.billing_address.street || "",
        city: profile.billing_address.city || "",
        state: profile.billing_address.state || "",
        zip_code: profile.billing_address.zip_code || "",
      } : undefined,
      shippingAddress: profile.shipping_address ? {
        fullName: profile.display_name || `${profile.first_name} ${profile.last_name}`,
        email: profile.email || "",
        phone: profile.work_phone || profile.mobile_phone || "",
        street: profile.shipping_address.street1 || profile.shipping_address.street || "",
        city: profile.shipping_address.city || "",
        state: profile.shipping_address.state || "",
        zip_code: profile.shipping_address.zip_code || "",
      } : undefined,
      skipToProducts: true, // Flag to skip directly to product selection
    };
    
    sessionStorage.setItem("preselectedCustomer", JSON.stringify(customerData));
    sessionStorage.setItem("taxper", (profile.taxPercantage || 0).toString());
    sessionStorage.setItem("shipping", (profile.freeShipping || false).toString());
    
    onOpenChange(false);
    navigate("/admin/orders/create");
  };

  // NEW: Send email to customer
  const handleSendEmail = () => {
    if (profile?.email) {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  // NEW: View order details
  const handleViewOrder = async (orderId: string) => {
    try {
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setSelectedOrder(orderData);
      setIsOrderSheetOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load order details", variant: "destructive" });
    }
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = noteSearch === "" || 
        note.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        note.content.toLowerCase().includes(noteSearch.toLowerCase());
      const matchesCategory = noteFilterCategory === "all" || note.category === noteFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, noteSearch, noteFilterCategory]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = taskSearch === "" || 
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(taskSearch.toLowerCase()));
      const matchesStatus = taskFilterStatus === "all" || task.status === taskFilterStatus;
      const matchesPriority = taskFilterPriority === "all" || task.priority === taskFilterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, taskSearch, taskFilterStatus, taskFilterPriority]);

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
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from("customer_notes")
          .update({
            title: noteForm.title,
            content: noteForm.content,
            category: noteForm.category,
            is_pinned: noteForm.is_pinned,
          })
          .eq("id", editingNote.id);

        if (error) throw error;
        toast({ title: "Success", description: "Note updated successfully" });
      } else {
        // Create new note
        const { error } = await supabase.from("customer_notes").insert({
          customer_id: userId,
          title: noteForm.title,
          content: noteForm.content,
          category: noteForm.category,
          is_pinned: noteForm.is_pinned,
          created_by: currentUser?.id,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Note added successfully" });
      }

      setNoteForm({ title: "", content: "", category: "general", is_pinned: false });
      setEditingNote(null);
      setIsNoteDialogOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      const { error } = await supabase.from("customer_notes").delete().eq("id", deleteNoteId);
      if (error) throw error;
      toast({ title: "Success", description: "Note deleted successfully" });
      setDeleteNoteId(null);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditNote = (note: any) => {
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
      is_pinned: note.is_pinned,
    });
    setEditingNote(note);
    setIsNoteDialogOpen(true);
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
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from("customer_tasks")
          .update({
            title: taskForm.title,
            description: taskForm.description,
            priority: taskForm.priority,
            status: taskForm.status,
            due_date: taskForm.due_date,
            reminder_date: taskForm.reminder_date || null,
            assigned_to: taskForm.assigned_to || userId,
          })
          .eq("id", editingTask.id);

        if (error) throw error;
        toast({ title: "Success", description: "Task updated successfully" });
      } else {
        // Create new task
        const { error } = await supabase.from("customer_tasks").insert({
          customer_id: userId,
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          due_date: taskForm.due_date,
          reminder_date: taskForm.reminder_date || null,
          assigned_to: taskForm.assigned_to || userId,
          created_by: currentUser?.id,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Task added successfully" });
      }

      setTaskForm({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
        reminder_date: "",
        assigned_to: "",
      });
      setEditingTask(null);
      setIsTaskDialogOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      const { error } = await supabase.from("customer_tasks").delete().eq("id", deleteTaskId);
      if (error) throw error;
      toast({ title: "Success", description: "Task deleted successfully" });
      setDeleteTaskId(null);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditTask = (task: any) => {
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      reminder_date: task.reminder_date || "",
      assigned_to: task.assigned_to || userId,
    });
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  // Location CRUD functions
  const handleAddLocation = async () => {
    if (!locationForm.name) {
      toast({ title: "Error", description: "Location name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingLocation) {
        const { error } = await supabase
          .from("locations")
          .update({
            name: locationForm.name,
            type: locationForm.type,
            manager: locationForm.manager,
            contact_phone: locationForm.contact_phone,
            contact_email: locationForm.contact_email,
            address: locationForm.address,
          })
          .eq("id", editingLocation.id);

        if (error) throw error;
        toast({ title: "Success", description: "Location updated successfully" });
      } else {
        const { error } = await supabase.from("locations").insert({
          profile_id: userId,
          name: locationForm.name,
          type: locationForm.type,
          manager: locationForm.manager,
          contact_phone: locationForm.contact_phone,
          contact_email: locationForm.contact_email,
          address: locationForm.address,
          status: "active",
        });

        if (error) throw error;
        toast({ title: "Success", description: "Location added successfully" });
      }

      setLocationForm({
        name: "", type: "branch", manager: "", contact_phone: "", contact_email: "",
        address: { street1: "", street2: "", city: "", state: "", zip_code: "" },
      });
      setEditingLocation(null);
      setIsLocationDialogOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLocation = async () => {
    if (!deleteLocationId) return;
    try {
      const { error } = await supabase.from("locations").delete().eq("id", deleteLocationId);
      if (error) throw error;
      toast({ title: "Success", description: "Location deleted successfully" });
      setDeleteLocationId(null);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditLocation = (location: any) => {
    setLocationForm({
      name: location.name,
      type: location.type,
      manager: location.manager || "",
      contact_phone: location.contact_phone || "",
      contact_email: location.contact_email || "",
      address: location.address || { street1: "", street2: "", city: "", state: "", zip_code: "" },
    });
    setEditingLocation(location);
    setIsLocationDialogOpen(true);
  };

  const toggleLocationStatus = async (locationId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("locations")
        .update({ status: newStatus })
        .eq("id", locationId);

      if (error) throw error;
      toast({ title: "Success", description: `Location ${newStatus === "active" ? "activated" : "deactivated"}` });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Document upload handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 10MB", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingDocument(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`customer-documents/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get the document type from file extension
      const docType = getDocumentType(fileExt || '');

      // Save document record to database
      const { error: dbError } = await supabase.from("customer_documents").insert({
        customer_id: userId,
        name: file.name,
        file_path: uploadData.path,
        file_type: docType,
        file_size: file.size,
        uploaded_by: currentUser?.id,
      });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Document uploaded successfully" });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploadingDocument(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Get document type from extension
  const getDocumentType = (ext: string): string => {
    const types: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      xls: 'Excel',
      xlsx: 'Excel',
      jpg: 'Image',
      jpeg: 'Image',
      png: 'Image',
      gif: 'Image',
    };
    return types[ext.toLowerCase()] || 'Other';
  };

  // Download document
  const handleDownloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  };

  // Delete document
  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;
    
    try {
      const docToDelete = documents.find(d => d.id === deleteDocumentId);
      
      // Delete from storage
      if (docToDelete?.file_path) {
        await supabase.storage.from('documents').remove([docToDelete.file_path]);
      }

      // Delete from database
      const { error } = await supabase.from("customer_documents").delete().eq("id", deleteDocumentId);
      if (error) throw error;

      toast({ title: "Success", description: "Document deleted successfully" });
      setDeleteDocumentId(null);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle order statement download
  const handleDownloadOrderStatement = async () => {
    if (!downloadStartDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);

      // If end date is not selected, use today's date
      const endDate = downloadEndDate || new Date();

      // Validate date range
      if (downloadStartDate >= endDate) {
        toast({
          title: "Error",
          description: "Start date must be before end date",
          variant: "destructive",
        });
        return;
      }

      // Fetch order statement data
      const statementData = await orderStatementService.fetchOrderData(
        userId,
        downloadStartDate,
        endDate
      );

      // Download the PDF using quickDownload (simpler method without retry)
      const result = await orderStatementDownloadService.quickDownload(statementData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Order statement downloaded successfully",
        });
        setIsDownloadDialogOpen(false);
        setDownloadStartDate(undefined);
        setDownloadEndDate(new Date());
      } else {
        throw new Error(result.error || "Failed to download statement");
      }
    } catch (err: any) {
      console.error("Error downloading order statement:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to download order statement",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Ellipsis pagination helper
  const getPaginationRange = (current: number, total: number) => {
    const delta = 2;
    const range: (number | string)[] = [];
    
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
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
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...allOrders];

    // Apply filter
    if (orderFilter === "paid") {
      filtered = filtered.filter((order) => order.payment_status === "paid");
    } else if (orderFilter === "pending") {
      filtered = filtered.filter((order) => order.payment_status !== "paid");
    } else if (orderFilter === "shipped") {
      filtered = filtered.filter(
        (order) => order.status === "shipped" || order.status === "delivered"
      );
    }

    // Apply sort
    if (orderSort === "newest") {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (orderSort === "oldest") {
      filtered.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
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
        <DialogHeader className="pb-0">
          <DialogTitle className="sr-only">Customer Profile</DialogTitle>
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
          <TooltipProvider>
          <>
            {/* Enhanced Header with Avatar, Quick Stats, Copy Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg mb-4">
              {/* Type-Specific Avatar */}
              <div className="flex-shrink-0">
                {(() => {
                  const typeConfig = getTypeConfig(profile.type);
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div className={cn("h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold", typeConfig.bgColor, typeConfig.color)}>
                      <TypeIcon className="h-7 w-7" />
                    </div>
                  );
                })()}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 min-w-0 max-w-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold truncate">
                    {profile.display_name || `${profile.first_name} ${profile.last_name}`}
                  </h2>
                  <Badge className={getStatusColor(profile.status)}>
                    {profile.status}
                  </Badge>
                  {(() => {
                    const typeConfig = getTypeConfig(profile.type);
                    return (
                      <Badge variant="outline" className={cn("border-current", typeConfig.color)}>
                        {profile.type}
                      </Badge>
                    );
                  })()}
                </div>
                
                {/* Contact with Copy Buttons & Tooltips */}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {profile.email && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => copyToClipboard(profile.email, "Email")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[180px]">{profile.email}</span>
                          {copiedField === "Email" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Click to copy email</TooltipContent>
                    </Tooltip>
                  )}
                  {profile.work_phone && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => copyToClipboard(profile.work_phone, "Phone")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{profile.work_phone}</span>
                          {copiedField === "Phone" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Click to copy phone</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Last Updated with Relative Time */}
                {profile.updated_at && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last updated: {getRelativeTime(profile.updated_at)}
                  </div>
                )}

                {/* Profile Completion Indicator */}
                <div className="mt-2 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Profile Completion</span>
                    <span className="font-medium">{calculateProfileCompletion(profile)}%</span>
                  </div>
                  <Progress value={calculateProfileCompletion(profile)} className="h-1.5" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap ml-auto items-start">
                <div className="text-center px-4 py-2 bg-background rounded-md border">
                  <div className="text-xl font-bold">{analytics?.totalOrders || 0}</div>
                  <div className="text-xs text-muted-foreground">Orders</div>
                </div>
                <div className="text-center px-4 py-2 bg-background rounded-md border">
                  <div className="text-xl font-bold text-green-600">${(analytics?.paidAmount || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Paid</div>
                </div>
                <div className="text-center px-4 py-2 bg-background rounded-md border">
                  <div className="text-xl font-bold text-orange-600">${(analytics?.pendingAmount || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel - Admin Only */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={handleEditProfile}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Profile
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit customer profile</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={handleCreateOrder}>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      New Order
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create order for this customer</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={handleSendEmail}>
                      <Send className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send email to customer</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Shield className="h-4 w-4 mr-1" />
                      Credit Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleChangeCreditStatus("good")}>
                      <Badge className="bg-green-500 mr-2">Good</Badge>
                      Set to Good
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeCreditStatus("warning")}>
                      <Badge className="bg-yellow-500 mr-2">Warning</Badge>
                      Set to Warning
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeCreditStatus("suspended")}>
                      <Badge className="bg-orange-500 mr-2">Suspended</Badge>
                      Set to Suspended
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeCreditStatus("blocked")}>
                      <Badge className="bg-red-500 mr-2">Blocked</Badge>
                      Set to Blocked
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant={profile.status === "active" ? "destructive" : "default"}
                      onClick={handleToggleAccountStatus}
                    >
                      {profile.status === "active" ? (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {profile.status === "active" ? "Suspend this account" : "Activate this account"}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.print()}>
                      <FileText className="h-4 w-4 mr-2" />
                      Print Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => copyToClipboard(userId, "Customer ID")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Customer ID
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <Tabs defaultValue="basic" className="w-full">
              {/* Scrollable tabs for mobile */}
              <div className="overflow-x-auto -mx-2 px-2">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-7 gap-1">
                  <TabsTrigger value="basic" className="flex-shrink-0">
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex-shrink-0">
                    <Building2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Contact</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex-shrink-0">
                    <BarChart3 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex-shrink-0">
                    <CreditCard className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Payments</span>
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Orders</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-shrink-0">
                    <StickyNote className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Notes</span>
                    {notes.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{notes.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex-shrink-0">
                    <CheckSquare className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Tasks</span>
                    {tasks.filter(t => t.status !== "completed").length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">{tasks.filter(t => t.status !== "completed").length}</Badge>
                    )}
                  </TabsTrigger>
                  {profile.type === "group" && (
                    <TabsTrigger value="group-management" className="flex-shrink-0">
                      <Users className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Group</span>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="settings" className="flex-shrink-0">
                      <Settings className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Settings</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.totalOrders || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analytics?.totalAmount?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Paid Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ${analytics?.paidAmount?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ${analytics?.pendingAmount?.toFixed(2) || "0.00"}
                    </div>
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
                      <span className="text-sm text-muted-foreground">
                        Last Order
                      </span>
                      <span className="font-medium">
                        {orders[0]?.created_at
                          ? new Date(orders[0].created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Account Created
                      </span>
                      <span className="font-medium">
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Last Updated
                      </span>
                      <span className="font-medium">
                        {profile.updated_at
                          ? new Date(profile.updated_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card> */}

              <AnalyticsTab userId={userId} />
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
                    <p className="text-sm text-muted-foreground">
                      Display Name
                    </p>
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
                    <Badge
                      variant={
                        profile.status === "active" ? "default" : "secondary"
                      }
                    >
                      {profile.status || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge variant="outline">{profile.role || "-"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Company Name
                    </p>
                    <p className="font-medium">{profile.company_name || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin-Only: Referral Information */}
              {isAdmin && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-600">Admin Only</Badge>
                      Referral Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-sm text-muted-foreground">Referral Name</p>
                      <p className="font-medium">{profile.referral_name || "No referral"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Tax & Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tax Preference
                    </p>
                    <p className="font-medium">
                      {profile.tax_preference || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tax Percentage
                    </p>
                    <p className="font-medium">
                      {profile.taxPercantage || "0"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{profile.tax_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Terms
                    </p>
                    <Badge variant="outline">
                      {profile.payment_terms || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{profile.currency || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Credit Limit
                    </p>
                    <p className="font-medium">
                      {profile.credit_limit ? `$${profile.credit_limit}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <p className="font-medium">
                      {profile.payment_method || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Free Shipping
                    </p>
                    <Badge
                      variant={profile.freeShipping ? "default" : "secondary"}
                    >
                      {profile.freeShipping ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Pay</p>
                    <Badge
                      variant={profile.order_pay ? "default" : "secondary"}
                    >
                      {profile.order_pay ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Portal Enabled
                    </p>
                    <Badge
                      variant={profile.enable_portal ? "default" : "secondary"}
                    >
                      {profile.enable_portal ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Portal Language
                    </p>
                    <p className="font-medium">
                      {profile.portal_language || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Account Status
                    </p>
                    <Badge
                      variant={
                        profile.account_status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
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
                    <p className="text-sm text-muted-foreground">
                      Pharmacy License
                    </p>
                    <p className="font-medium">
                      {profile.pharmacy_license || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Group Station
                    </p>
                    <p className="font-medium">
                      {profile.group_station || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{profile.department || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Language Preference
                    </p>
                    <p className="font-medium">
                      {profile.language_preference || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Preferred Contact Method
                    </p>
                    <p className="font-medium">
                      {profile.preferred_contact_method || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Email Notifications
                    </p>
                    <Badge
                      variant={
                        profile.email_notifaction ? "default" : "secondary"
                      }
                    >
                      {profile.email_notifaction ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Order Updates
                    </p>
                    <Badge
                      variant={profile.order_updates ? "default" : "secondary"}
                    >
                      {profile.order_updates ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Login</p>
                    <p className="font-medium">
                      {profile.last_login
                        ? new Date(profile.last_login).toLocaleDateString()
                        : "-"}
                    </p>
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

              {/* Documents Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents
                        {documents.length > 0 && (
                          <Badge variant="secondary">{documents.length}</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Licenses, contracts, agreements, and other documents
                      </p>
                    </div>
                    <div>
                      <Input
                        type="file"
                        className="hidden"
                        id="document-upload-profile"
                        onChange={handleDocumentUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      />
                      <Button asChild variant="outline" disabled={isUploadingDocument}>
                        <label htmlFor="document-upload-profile" className="cursor-pointer">
                          {isUploadingDocument ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Upload Document
                        </label>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground mt-2 font-medium">No documents uploaded</p>
                      <p className="text-sm text-muted-foreground">Upload licenses, contracts, or other important documents</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {doc.file_type}
                                </Badge>
                                <span>{formatFileSize(doc.file_size || 0)}</span>
                                <span>•</span>
                                <span>{getRelativeTime(doc.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadDocument(doc)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteDocumentId(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                    <p className="text-sm text-muted-foreground">
                      Mobile Phone
                    </p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profile.mobile_phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Contact Person
                    </p>
                    <p className="font-medium">
                      {profile.contact_person || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Alternative Email
                    </p>
                    <p className="font-medium">
                      {profile.alternative_email || "-"}
                    </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>{profile.billing_address?.street1 || "-"}</p>
                    {profile.billing_address?.street2 && (
                      <p>{profile.billing_address.street2}</p>
                    )}
                    <p>
                      {profile.billing_address?.city || "-"},{" "}
                      {profile.billing_address?.state || "-"}{" "}
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
                      <p className="text-muted-foreground">
                        Same as billing address
                      </p>
                    ) : (
                      <>
                        <p>{profile.shipping_address?.street1 || "-"}</p>
                        {profile.shipping_address?.street2 && (
                          <p>{profile.shipping_address.street2}</p>
                        )}
                        <p>
                          {profile.shipping_address?.city || "-"},{" "}
                          {profile.shipping_address?.state || "-"}{" "}
                          {profile.shipping_address?.zip_code || "-"}
                        </p>
                        <p>{profile.shipping_address?.phone || "-"}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Locations Section - For pharmacies with multiple locations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Locations
                        {locations.length > 0 && (
                          <Badge variant="secondary">{locations.length}</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage multiple locations for this {profile.type}
                      </p>
                    </div>
                    <Button onClick={() => { 
                      setEditingLocation(null); 
                      setLocationForm({
                        name: "", type: "branch", manager: "", contact_phone: "", contact_email: "",
                        address: { street1: "", street2: "", city: "", state: "", zip_code: "" },
                      }); 
                      setIsLocationDialogOpen(true); 
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground mt-2 font-medium">No additional locations</p>
                      <p className="text-sm text-muted-foreground">Add locations if this {profile.type} has multiple branches</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {locations.map((location) => (
                        <Card key={location.id} className={cn(
                          "relative overflow-hidden",
                          location.status === "inactive" && "opacity-60"
                        )}>
                          <div className={cn(
                            "absolute top-0 left-0 w-1 h-full",
                            location.status === "active" ? "bg-green-500" : "bg-gray-400"
                          )} />
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{location.name}</CardTitle>
                                <Badge variant="outline" className="text-xs">{location.type}</Badge>
                                <Badge className={getStatusColor(location.status)}>{location.status}</Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => toggleLocationStatus(location.id, location.status)}>
                                      {location.status === "active" ? "🔴" : "🟢"}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{location.status === "active" ? "Deactivate" : "Activate"}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => openEditLocation(location)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit location</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setDeleteLocationId(location.id)} className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete location</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {location.manager && (
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{location.manager}</span>
                              </div>
                            )}
                            {location.contact_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{location.contact_phone}</span>
                              </div>
                            )}
                            {location.contact_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{location.contact_email}</span>
                              </div>
                            )}
                            {location.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                <div>
                                  <p>{location.address.street1}</p>
                                  {location.address.street2 && <p>{location.address.street2}</p>}
                                  <p>{location.address.city}, {location.address.state} {location.address.zip_code}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>Order History</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDownloadDialogOpen(true)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Statement
                      </Button>
                      <Select
                        value={orderFilter}
                        onValueChange={setOrderFilter}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orders</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">
                            Pending Payment
                          </SelectItem>
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
                          <SelectItem value="amount_high">
                            Amount: High to Low
                          </SelectItem>
                          <SelectItem value="amount_low">
                            Amount: Low to High
                          </SelectItem>
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
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrders.length > 0 ? (
                        currentOrders.map((order) => (
                          <TableRow 
                            key={order.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewOrder(order.id)}
                          >
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge>{order.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.payment_status === "paid"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {order.payment_status || "unpaid"}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={
                                order.payment_status === "paid"
                                  ? "text-green-600 font-semibold"
                                  : "text-orange-600 font-semibold"
                              }
                            >
                              ${order.total_amount?.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewOrder(order.id); }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View order details</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination with Ellipsis */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                      <div className="text-sm text-muted-foreground">
                        Showing {indexOfFirstOrder + 1} to{" "}
                        {Math.min(indexOfLastOrder, orders.length)} of{" "}
                        {orders.length} orders
                      </div>
                      <div className="flex gap-1 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {getPaginationRange(currentPage, totalPages).map((page, idx) => (
                            page === "..." ? (
                              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                            ) : (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page as number)}
                                className="w-8"
                              >
                                {page}
                              </Button>
                            )
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

            <TabsContent value="payments" className="mt-6">
              <EnhancedPaymentTab userId={userId} />
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notes..."
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={noteFilterCategory} onValueChange={setNoteFilterCategory}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { setEditingNote(null); setNoteForm({ title: "", content: "", category: "general", is_pinned: false }); setIsNoteDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className={note.is_pinned ? "border-primary/50 bg-primary/5" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {note.is_pinned && <Pin className="h-4 w-4 fill-primary text-primary" />}
                          <CardTitle className="text-base">{note.title}</CardTitle>
                          <Badge variant="outline">{note.category}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => togglePinNote(note.id, note.is_pinned)}>
                                <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{note.is_pinned ? "Unpin note" : "Pin note"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => openEditNote(note)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit note</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteNoteId(note.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete note</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {note.created_by_profile?.first_name} {note.created_by_profile?.last_name} · {getRelativeTime(note.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {filteredNotes.length === 0 && notes.length > 0 && (
                  <p className="text-center text-muted-foreground py-8">No notes match your search</p>
                )}
                {notes.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground mt-2">No notes yet</p>
                    <p className="text-sm text-muted-foreground">Add a note to keep track of important information about this customer</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="flex gap-2 flex-1 flex-wrap">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={taskFilterPriority} onValueChange={setTaskFilterPriority}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { setEditingTask(null); setTaskForm({ title: "", description: "", priority: "medium", status: "pending", due_date: "", reminder_date: "", assigned_to: "" }); setIsTaskDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className={cn("text-base", task.status === "completed" && "line-through")}>{task.title}</CardTitle>
                          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                          <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Select value={task.status} onValueChange={(value) => updateTaskStatus(task.id, value)}>
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => openEditTask(task)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit task</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTaskId(task.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete task</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && <p className="text-sm mb-2 whitespace-pre-wrap">{task.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className={cn("flex items-center gap-1", new Date(task.due_date) < new Date() && task.status !== "completed" && "text-destructive font-medium")}>
                          <CalendarIcon className="h-3 w-3" />
                          Due: {getRelativeTime(task.due_date)}
                          {new Date(task.due_date) < new Date() && task.status !== "completed" && " (Overdue)"}
                        </span>
                        {task.reminder_date && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Reminder: {getRelativeTime(task.reminder_date)}
                          </span>
                        )}
                        <span>Assigned to: {task.assigned_to_profile?.first_name} {task.assigned_to_profile?.last_name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTasks.length === 0 && tasks.length > 0 && (
                  <p className="text-center text-muted-foreground py-8">No tasks match your filters</p>
                )}
                {tasks.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground mt-2">No tasks yet</p>
                    <p className="text-sm text-muted-foreground">Create tasks to track follow-ups and action items for this customer</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Group Management Tab - Only for group type profiles */}
            {profile.type === "group" && (
              <TabsContent value="group-management" className="space-y-4 mt-4">
                <GroupManagementTab 
                  groupId={profile.id} 
                  groupName={profile.display_name || `${profile.first_name} ${profile.last_name}`} 
                />
              </TabsContent>
            )}

            {/* Settings Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="settings" className="space-y-4 mt-4">
                <SettingsTab userId={userId} profile={profile} onUpdate={fetchAllData} />
              </TabsContent>
            )}
          </Tabs>
          </>
          </TooltipProvider>
        )}

        {/* Add/Edit Note Dialog */}
        <Dialog open={isNoteDialogOpen} onOpenChange={(open) => { setIsNoteDialogOpen(open); if (!open) setEditingNote(null); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit Note" : "Add New Note"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="note-title" className="text-sm font-medium">Title</label>
                <Input
                  id="note-title"
                  placeholder="Note Title"
                  value={noteForm.title}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="note-content" className="text-sm font-medium">Content</label>
                  <span className={cn(
                    "text-xs",
                    noteForm.content.length > 1000 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {noteForm.content.length}/1000 characters
                  </span>
                </div>
                <Textarea
                  id="note-content"
                  placeholder="Note Content"
                  value={noteForm.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setNoteForm({ ...noteForm, content: e.target.value });
                    }
                  }}
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="note-category" className="text-sm font-medium">Category</label>
                <Select
                  value={noteForm.category}
                  onValueChange={(value) =>
                    setNoteForm({ ...noteForm, category: value })
                  }
                >
                  <SelectTrigger id="note-category">
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
                <Checkbox
                  id="pin-note"
                  checked={noteForm.is_pinned}
                  onCheckedChange={(checked) =>
                    setNoteForm({ ...noteForm, is_pinned: checked === true })
                  }
                />
                <label 
                  htmlFor="pin-note" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Pin this note
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsNoteDialogOpen(false); setEditingNote(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote}>
                  {editingNote ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingNote ? "Update Note" : "Add Note"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) setEditingTask(null); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="task-title" className="text-sm font-medium">Title</label>
                <Input
                  id="task-title"
                  placeholder="Task Title"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="task-description" className="text-sm font-medium">Description</label>
                  <span className={cn(
                    "text-xs",
                    taskForm.description.length > 1000 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {taskForm.description.length}/1000 characters
                  </span>
                </div>
                <Textarea
                  id="task-description"
                  placeholder="Task Description"
                  value={taskForm.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setTaskForm({ ...taskForm, description: e.target.value });
                    }
                  }}
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="task-priority" className="text-sm font-medium">Priority</label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, priority: value })
                    }
                  >
                    <SelectTrigger id="task-priority">
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
                  <label htmlFor="task-status" className="text-sm font-medium">Status</label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, status: value })
                    }
                  >
                    <SelectTrigger id="task-status">
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
                  <label className="text-sm font-medium">Due Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !taskForm.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskForm.due_date ? format(new Date(taskForm.due_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={taskForm.due_date ? new Date(taskForm.due_date) : undefined}
                        onSelect={(date) =>
                          setTaskForm({ 
                            ...taskForm, 
                            due_date: date ? format(date, "yyyy-MM-dd") : "" 
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !taskForm.reminder_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskForm.reminder_date ? format(new Date(taskForm.reminder_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={taskForm.reminder_date ? new Date(taskForm.reminder_date) : undefined}
                        onSelect={(date) =>
                          setTaskForm({ 
                            ...taskForm, 
                            reminder_date: date ? format(date, "yyyy-MM-dd") : "" 
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="task-assigned" className="text-sm font-medium">Assigned To</label>
                <Select
                  value={taskForm.assigned_to || userId}
                  onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}
                >
                  <SelectTrigger id="task-assigned">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={userId}>
                      {profile?.display_name || `${profile?.first_name} ${profile?.last_name}`} (Customer)
                    </SelectItem>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} ({staff.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign to customer or a staff member
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsTaskDialogOpen(false); setEditingTask(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask}>
                  {editingTask ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingTask ? "Update Task" : "Add Task"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Note Confirmation */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this note? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Task Confirmation */}
        <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Document Confirmation */}
        <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this document? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Location Dialog */}
        <Dialog open={isLocationDialogOpen} onOpenChange={(open) => { setIsLocationDialogOpen(open); if (!open) setEditingLocation(null); }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="location-name" className="text-sm font-medium">Location Name *</label>
                  <Input
                    id="location-name"
                    placeholder="e.g., Downtown Branch"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="location-type" className="text-sm font-medium">Type</label>
                  <Select value={locationForm.type} onValueChange={(value) => setLocationForm({ ...locationForm, type: value })}>
                    <SelectTrigger id="location-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Office</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="retail">Retail Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="location-manager" className="text-sm font-medium">Manager Name</label>
                  <Input
                    id="location-manager"
                    placeholder="Manager name"
                    value={locationForm.manager}
                    onChange={(e) => setLocationForm({ ...locationForm, manager: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="location-phone" className="text-sm font-medium">Contact Phone</label>
                  <Input
                    id="location-phone"
                    placeholder="(555) 123-4567"
                    value={locationForm.contact_phone}
                    onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="location-email" className="text-sm font-medium">Contact Email</label>
                <Input
                  id="location-email"
                  type="email"
                  placeholder="location@example.com"
                  value={locationForm.contact_email}
                  onChange={(e) => setLocationForm({ ...locationForm, contact_email: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Address</label>
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Input
                    placeholder="Street Address"
                    value={locationForm.address.street1}
                    onChange={(e) => setLocationForm({ 
                      ...locationForm, 
                      address: { ...locationForm.address, street1: e.target.value } 
                    })}
                  />
                  <Input
                    placeholder="Apt, Suite, Unit (optional)"
                    value={locationForm.address.street2}
                    onChange={(e) => setLocationForm({ 
                      ...locationForm, 
                      address: { ...locationForm.address, street2: e.target.value } 
                    })}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="City"
                      value={locationForm.address.city}
                      onChange={(e) => setLocationForm({ 
                        ...locationForm, 
                        address: { ...locationForm.address, city: e.target.value } 
                      })}
                    />
                    <Input
                      placeholder="State"
                      value={locationForm.address.state}
                      onChange={(e) => setLocationForm({ 
                        ...locationForm, 
                        address: { ...locationForm.address, state: e.target.value } 
                      })}
                    />
                    <Input
                      placeholder="ZIP Code"
                      value={locationForm.address.zip_code}
                      onChange={(e) => setLocationForm({ 
                        ...locationForm, 
                        address: { ...locationForm.address, zip_code: e.target.value } 
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setIsLocationDialogOpen(false); setEditingLocation(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddLocation}>
                  {editingLocation ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingLocation ? "Update Location" : "Add Location"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Location Confirmation */}
        <AlertDialog open={!!deleteLocationId} onOpenChange={(open) => !open && setDeleteLocationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Location</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this location? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLocation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Download Order Statement Dialog */}
        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Download Order Statement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !downloadStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {downloadStartDate ? format(downloadStartDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={downloadStartDate}
                      onSelect={setDownloadStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Select the start date for the statement period
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  End Date <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !downloadEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {downloadEndDate ? format(downloadEndDate, "PPP") : "Select end date (defaults to today)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={downloadEndDate}
                      onSelect={setDownloadEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  If not selected, today's date will be used
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDownloadDialogOpen(false);
                    setDownloadStartDate(undefined);
                    setDownloadEndDate(new Date());
                  }}
                  disabled={isDownloading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDownloadOrderStatement}
                  disabled={isDownloading || !downloadStartDate}
                  className="gap-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Statement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal - Uses existing EditUserModal component */}
        {profile && (
          <EditUserModal
            user={{
              id: profile.id,
              name: profile.display_name || `${profile.first_name} ${profile.last_name}`,
              email: profile.email,
              type: profile.type || "pharmacy",
              status: profile.status || "active",
            }}
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            onUserUpdated={fetchAllData}
          />
        )}

        {/* Order Details Sheet */}
        {selectedOrder && (
          <OrderDetailsSheet
            open={isOrderSheetOpen}
            order={selectedOrder}
            isEditing={false}
            onOpenChange={(open) => {
              setIsOrderSheetOpen(open);
              if (!open) setSelectedOrder(null);
            }}
            onSave={() => {
              fetchAllData();
              setIsOrderSheetOpen(false);
              setSelectedOrder(null);
            }}
            loadOrders={fetchAllData}
            userRole="admin"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
