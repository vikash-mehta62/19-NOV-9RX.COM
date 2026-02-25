import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, Send, Pause, Play, Clock, Users,
  Mail, MousePointer, Eye, BarChart3, Calendar, Rocket,
  Gift, Megaphone, Sparkles, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, RefreshCw, Copy, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { VisualEmailEditor } from "@/components/email/VisualEmailEditor";


interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id: string | null;
  html_content: string | null;
  campaign_type: string;
  status: string;
  target_audience: any;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  created_at: string;
  track_opens: boolean;
  track_clicks: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

// Pre-built campaign templates
const quickCampaigns = [
  {
    id: "welcome_series",
    name: "Welcome Series",
    icon: Sparkles,
    color: "bg-purple-500",
    description: "Welcome new customers with a warm introduction",
    subject: "Welcome to 9RX! 🎉 Here's 10% off your first order",
    type: "promotional",
    audience: "all",
  },
  {
    id: "flash_sale",
    name: "Flash Sale",
    icon: Rocket,
    color: "bg-red-500",
    description: "Create urgency with limited-time offers",
    subject: "⚡ 24-Hour Flash Sale - Up to 50% Off!",
    type: "promotional",
    audience: "active",
  },
  {
    id: "new_products",
    name: "New Products",
    icon: Gift,
    color: "bg-green-500",
    description: "Announce new product arrivals",
    subject: "🆕 New Arrivals Just Dropped - Check Them Out!",
    type: "product_launch",
    audience: "all",
  },
  {
    id: "reengagement",
    name: "Win-Back Campaign",
    icon: TrendingUp,
    color: "bg-orange-500",
    description: "Re-engage inactive customers",
    subject: "We Miss You! Here's 15% Off to Come Back 💝",
    type: "promotional",
    audience: "inactive",
  },
  {
    id: "newsletter",
    name: "Monthly Newsletter",
    icon: Mail,
    color: "bg-blue-500",
    description: "Share updates and industry news",
    subject: "📰 Your Monthly 9RX Newsletter",
    type: "newsletter",
    audience: "all",
  },
  {
    id: "announcement",
    name: "Important Update",
    icon: Megaphone,
    color: "bg-yellow-500",
    description: "Share important company announcements",
    subject: "📢 Important Update from 9RX",
    type: "announcement",
    audience: "all",
  },
];

const campaignTypes = [
  { value: "promotional", label: "Promotional", icon: "🎯" },
  { value: "newsletter", label: "Newsletter", icon: "📰" },
  { value: "product_launch", label: "Product Launch", icon: "🚀" },
  { value: "announcement", label: "Announcement", icon: "📢" },
  { value: "survey", label: "Survey", icon: "📋" },
  { value: "educational", label: "Educational", icon: "📚" },
  { value: "seasonal", label: "Seasonal", icon: "🎄" },
  { value: "custom", label: "Custom", icon: "✨" },
];

const audienceTypes = [
  { value: "all", label: "All Users", count: "~500" },
  { value: "pharmacy", label: "Pharmacy Users", count: "~200" },
  { value: "group", label: "Group Users", count: "~50" },
  { value: "hospital", label: "Hospital Users", count: "~30" },
  { value: "active", label: "Active Users (30 days)", count: "~300" },
  { value: "inactive", label: "Inactive Users (30+ days)", count: "~100" },
  { value: "high_value", label: "High Value Customers", count: "~75" },
  { value: "specific", label: "Specific Users", count: "Manual" },
];

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-gray-100 text-gray-800", icon: Pencil, label: "Draft" },
  scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Scheduled" },
  sending: { color: "bg-yellow-100 text-yellow-800", icon: RefreshCw, label: "Sending" },
  sent: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Sent" },
  paused: { color: "bg-orange-100 text-orange-800", icon: Pause, label: "Paused" },
  cancelled: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Cancelled" },
};

const initialFormState = {
  name: "",
  subject: "",
  template_id: "",
  html_content: "",
  campaign_type: "promotional",
  target_audience: "all",
  scheduled_at: "",
};


export default function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [recipientCount, setRecipientCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [userSelectionOpen, setUserSelectionOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchUsers = async () => {
    try {
      let query = supabase.from("profiles").select("id, email, first_name, last_name, type");
      
      if (userSearch) {
        query = query.or(`email.ilike.%${userSearch}%,first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%`);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (userSelectionOpen) {
      fetchUsers();
    }
  }, [userSelectionOpen, userSearch]);

  useEffect(() => {
    fetchRecipientCount(formData.target_audience);
  }, [formData.target_audience]);

  const handleUserSelection = (email: string, checked: boolean) => {
    if (checked) {
      setSelectedUserEmails(prev => [...prev, email]);
    } else {
      setSelectedUserEmails(prev => prev.filter(e => e !== email));
    }
  };

  const confirmUserSelection = () => {
    const currentEmails = (formData as any).specific_emails
      ? (formData as any).specific_emails.split(/[\n,]/).map((e: string) => e.trim()).filter(Boolean)
      : [];
    
    // Merge new selections with existing ones, removing duplicates
    const allEmails = Array.from(new Set([...currentEmails, ...selectedUserEmails]));
    
    setFormData({
      ...formData,
      specific_emails: allEmails.join(", ")
    } as any);
    
    setUserSelectionOpen(false);
    setSelectedUserEmails([]);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("html_content") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value || "";
      const newText = text.substring(0, start) + variable + text.substring(end);
      
      setFormData({ ...formData, html_content: newText });
      
      // Restore cursor position and focus
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      }, 0);
    } else {
       setFormData({ ...formData, html_content: (formData.html_content || "") + variable });
    }
    toast({ title: "Variable Inserted", description: `${variable} added to content.` });
  };

  const variableGroups = [
    {
      name: "User Information",
      description: "Data from user profile",
      variables: [
        { key: "{{user_name}}", label: "Full Name", example: "John Doe" },
        { key: "{{first_name}}", label: "First Name", example: "John" },
        { key: "{{last_name}}", label: "Last Name", example: "Doe" },
        { key: "{{email}}", label: "Email Address", example: "john@example.com" },
      ]
    },
    {
      name: "System & Links",
      description: "Auto-generated links and info",
      variables: [
        { key: "{{unsubscribe_url}}", label: "Unsubscribe Link", example: "https://..." },
        { key: "{{company_name}}", label: "Company Name", example: "9RX" },
        { key: "{{current_year}}", label: "Current Year", example: "2024" },
      ]
    }
  ];

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, html_content")
        .eq("is_active", true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchRecipientCount = async (audience: string) => {
    try {
      if (audience === "specific") {
        setRecipientCount(0);
        return;
      }

      let query = supabase.from("profiles").select("id", { count: "exact", head: true });
      
      if (audience === "pharmacy") {
        query = query.eq("type", "pharmacy");
      } else if (audience === "group") {
        query = query.eq("type", "group");
      } else if (audience === "hospital") {
        query = query.eq("type", "hospital");
      } else if (audience === "active") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("last_sign_in_at", thirtyDaysAgo);
      } else if (audience === "inactive") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.lt("last_sign_in_at", thirtyDaysAgo);
      }

      const { count } = await query;
      setRecipientCount(count || 0);
    } catch (error) {
      console.error("Error fetching recipient count:", error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") {
      setFormData({ ...formData, template_id: "", subject: "", html_content: "" });
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject,
        html_content: template.html_content,
      });
    }
  };

  const handleQuickCampaign = (quick: typeof quickCampaigns[0]) => {
    setFormData({
      ...initialFormState,
      name: quick.name,
      subject: quick.subject,
      campaign_type: quick.type,
      target_audience: quick.audience,
    });
    setEditingCampaign(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let targetAudience: any = { type: formData.target_audience };

      if (formData.target_audience === "specific") {
        const emails = (formData as any).specific_emails
          .split(/[\n,]/) // Split by newline or comma
          .map((e: string) => e.trim())
          .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
          
        if (emails.length === 0) {
          throw new Error("Please enter at least one valid email address");
        }
        
        targetAudience = {
          type: "specific",
          emails: emails
        };
      }

      const payload = {
        name: formData.name,
        subject: formData.subject,
        template_id: formData.template_id || null,
        html_content: formData.html_content || getDefaultEmailTemplate(formData.subject),
        campaign_type: formData.campaign_type,
        target_audience: targetAudience,
        scheduled_at: formData.scheduled_at || null,
        status: formData.scheduled_at ? "scheduled" : "draft",
        total_recipients: targetAudience.type === "specific" ? targetAudience.emails.length : recipientCount,
        track_opens: true,
        track_clicks: true,
      };

      console.log('Saving campaign with payload:', payload); // Debug log
      console.log('HTML content length:', payload.html_content?.length); // Debug log

      if (editingCampaign) {
        const { error } = await supabase
          .from("email_campaigns")
          .update(payload)
          .eq("id", editingCampaign.id);
        if (error) throw error;
        toast({ title: "Success", description: "Campaign updated successfully" });
      } else {
        const { error } = await supabase.from("email_campaigns").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Campaign created successfully" });
      }

      setDialogOpen(false);
      setEditingCampaign(null);
      setFormData(initialFormState);
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    
    // Handle both object and string formats for target_audience
    const audienceType = typeof campaign.target_audience === 'object' 
      ? campaign.target_audience?.type 
      : campaign.target_audience;

    let specificEmails = "";
    if (audienceType === "specific" && 
        typeof campaign.target_audience === 'object' && 
        Array.isArray(campaign.target_audience.emails)) {
        specificEmails = campaign.target_audience.emails.join(", ");
    }

    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      template_id: campaign.template_id || "",
      html_content: campaign.html_content || "",
      campaign_type: campaign.campaign_type,
      target_audience: audienceType || "all",
      scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : "",
      specific_emails: specificEmails,
    } as any);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCampaignToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", campaignToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Campaign deleted successfully" });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setConfirmDeleteOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleDuplicate = async (campaign: EmailCampaign) => {
    try {
      const { error } = await supabase.from("email_campaigns").insert([{
        name: `${campaign.name} (Copy)`,
        subject: campaign.subject,
        template_id: campaign.template_id,
        html_content: campaign.html_content,
        campaign_type: campaign.campaign_type,
        target_audience: campaign.target_audience,
        status: "draft",
        total_recipients: campaign.total_recipients,
        track_opens: true,
        track_clicks: true,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Campaign duplicated" });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const sendCampaign = async (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setConfirmSendOpen(true);
  };

  const confirmSend = async () => {
    if (!selectedCampaign) return;
    
    setSending(selectedCampaign.id);
    setConfirmSendOpen(false);

    try {
      // Update status to sending
      await supabase
        .from("email_campaigns")
        .update({ status: "sending" })
        .eq("id", selectedCampaign.id);

      // Get recipients based on audience
      const audience = selectedCampaign.target_audience?.type || "all";
      let recipients;

      if (audience === "specific") {
        const emails = selectedCampaign.target_audience.emails || [];
        
        // 1. Fetch profiles for these emails to get real user data
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .in("email", emails);

        // 2. Map emails to recipient objects, preferring profile data if found
        recipients = emails.map((email: string) => {
            const profile = profiles?.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
            return {
                id: profile?.id || null,
                email: email,
                first_name: profile?.first_name || "",
                last_name: profile?.last_name || ""
            };
        });
      } else {
        let query = supabase.from("profiles").select("id, email, first_name, last_name");
        
        if (audience === "pharmacy") {
          query = query.eq("type", "pharmacy");
        } else if (audience === "group") {
          query = query.eq("type", "group");
        } else if (audience === "active") {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("last_sign_in_at", thirtyDaysAgo);
        } else if (audience === "inactive") {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.lt("last_sign_in_at", thirtyDaysAgo);
        }

        const { data } = await query.not("email", "is", null);
        recipients = data;
      }

      if (!recipients || recipients.length === 0) {
        throw new Error("No recipients found for this audience");
      }

      // Queue emails for each recipient
      const emailsToQueue = recipients.map((recipient) => ({
        to_email: recipient.email,
        to_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || recipient.email,
        subject: selectedCampaign.subject,
        html_content: selectedCampaign.html_content || getDefaultEmailTemplate(selectedCampaign.subject),
        campaign_id: selectedCampaign.id,
        status: "pending",
        priority: 0,
        scheduled_at: new Date().toISOString(),
        metadata: {
          user_id: recipient.id,
          tracking_id: crypto.randomUUID(),
          first_name: recipient.first_name,
          last_name: recipient.last_name,
        },
      }));

      // Insert in batches
      const batchSize = 100;
      let queued = 0;
      for (let i = 0; i < emailsToQueue.length; i += batchSize) {
        const batch = emailsToQueue.slice(i, i + batchSize);
        const { error } = await supabase.from("email_queue").insert(batch);
        if (!error) queued += batch.length;
      }

      // Update campaign with recipient count
      await supabase
        .from("email_campaigns")
        .update({ 
          status: "sent",
          sent_at: new Date().toISOString(),
          total_recipients: recipients.length,
          sent_count: queued,
        })
        .eq("id", selectedCampaign.id);

      toast({
        title: "Campaign Sent! 🚀",
        description: `${queued} emails queued for delivery`,
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      
      // Reset status on error
      await supabase
        .from("email_campaigns")
        .update({ status: "draft" })
        .eq("id", selectedCampaign.id);
    } finally {
      setSending(null);
      setSelectedCampaign(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "cancelled") {
        // Cancel pending emails in queue
        await supabase
          .from("email_queue")
          .update({ status: "cancelled" })
          .eq("campaign_id", id)
          .eq("status", "pending");
      }
      const { error } = await supabase.from("email_campaigns").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: `Campaign ${status}` });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getOpenRate = (campaign: EmailCampaign) => {
    if (campaign.sent_count === 0) return "0";
    return ((campaign.open_count / campaign.sent_count) * 100).toFixed(1);
  };

  const getClickRate = (campaign: EmailCampaign) => {
    if (campaign.open_count === 0) return "0";
    return ((campaign.click_count / campaign.open_count) * 100).toFixed(1);
  };

  const getDefaultEmailTemplate = (subject: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">9RX</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333333; margin: 0 0 20px;">${subject}</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          Hello {{user_name}},
        </p>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 30px;">
          Thank you for being a valued customer. We have exciting news to share with you!
        </p>
        <a href="https://9rx.com" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Shop Now
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "all") return true;
    return c.status === activeTab;
  });

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === "sent").length,
    scheduled: campaigns.filter(c => c.status === "scheduled").length,
    draft: campaigns.filter(c => c.status === "draft").length,
    totalEmails: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
    totalOpens: campaigns.reduce((sum, c) => sum + (c.open_count || 0), 0),
    totalClicks: campaigns.reduce((sum, c) => sum + (c.click_count || 0), 0),
  };


  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground">Create and manage bulk email campaigns</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCampaign(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
                <DialogDescription>
                  {editingCampaign ? "Update your campaign details" : "Set up your email campaign"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Summer Sale 2024"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="campaign_type">Campaign Type</Label>
                    <Select
                      value={formData.campaign_type}
                      onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span> {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {audienceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex justify-between w-full items-center min-w-[240px]">
                              <span>{type.label}</span>
                              <span className="text-muted-foreground text-xs">{type.count}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3 inline mr-1" />
                      Estimated recipients: <strong>{recipientCount.toLocaleString()}</strong>
                    </p>
                  </div>

                  {formData.target_audience === "specific" && (
                    <div className="col-span-2">
                      <Label htmlFor="specific_emails">Specific Email Addresses *</Label>
                      <Textarea
                        id="specific_emails"
                        value={(formData as any).specific_emails || ""}
                        onChange={(e) => setFormData({ ...formData, specific_emails: e.target.value } as any)}
                        placeholder="user1@example.com, user2@example.com"
                        rows={4}
                        className="font-mono text-sm mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
              Enter email addresses separated by commas or new lines
            </p>
            
            <div className="mt-2">
                <Dialog open={userSelectionOpen} onOpenChange={setUserSelectionOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Users className="h-4 w-4" />
                            Select Users from List
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Select Users</DialogTitle>
                            <DialogDescription>
                                Search and select users to add to your campaign audience.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                            <Input
                                placeholder="Search by name or email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="w-full"
                            />
                            
                            <div className="border rounded-md flex-1 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Select</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Type</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availableUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No users found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            availableUsers.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <Checkbox 
                                                            checked={selectedUserEmails.includes(user.email)}
                                                            onCheckedChange={(checked) => handleUserSelection(user.email, checked as boolean)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{user.type || "User"}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-muted-foreground">
                                    {selectedUserEmails.length} users selected
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setUserSelectionOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={confirmUserSelection}>
                                        Add Selected Users
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        )}

                  <div className="col-span-2">
                    <Label htmlFor="template_id">Use Template (Optional)</Label>
                    <Select value={formData.template_id || "none"} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or write custom content..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template (custom content)</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="subject">Email Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="🔥 Summer Sale - Up to 50% Off!"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tip: Use emojis to increase open rates
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label>Email Content</Label>
                    <div className="mt-2">
                      <VisualEmailEditor
                        key={editingCampaign?.id || 'new'}
                        initialHtml={formData.html_content}
                        onChange={(html) => setFormData({ ...formData, html_content: html })}
                        variables={["user_name", "first_name", "last_name", "email", "unsubscribe_url", "company_name"]}
                        templates={templates}
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="scheduled_at">Schedule Send (Optional)</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty to save as draft and send manually
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    {formData.html_content && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                    )}
                    <Button type="submit">
                      {editingCampaign ? "Update" : "Create"} Campaign
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>


        {/* Quick Campaign Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>Launch a campaign in seconds with pre-built templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickCampaigns.map((quick) => {
                const Icon = quick.icon;
                return (
                  <button
                    key={quick.id}
                    onClick={() => handleQuickCampaign(quick)}
                    className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${quick.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-medium text-sm group-hover:text-primary">{quick.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{quick.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Campaigns</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.totalEmails.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Emails Sent</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-indigo-600">{stats.totalOpens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Opens</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-pink-600">{stats.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" /> All Campaigns
              </CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                  <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No campaigns found</h3>
                <p className="text-muted-foreground mt-1">
                  {activeTab === "all" 
                    ? "Create your first campaign to get started!" 
                    : `No ${activeTab} campaigns`}
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Campaign
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const statusInfo = statusConfig[campaign.status] || statusConfig.draft;
                    const StatusIcon = statusInfo.icon;
                    const isSending = sending === campaign.id;
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                              {campaign.subject}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {format(new Date(campaign.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {campaignTypes.find((t) => t.value === campaign.campaign_type)?.icon}{" "}
                            {campaignTypes.find((t) => t.value === campaign.campaign_type)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${statusInfo.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </span>
                          </div>
                          {campaign.scheduled_at && campaign.status === "scheduled" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {format(new Date(campaign.scheduled_at), "MMM d, h:mm a")}
                            </p>
                          )}
                          {campaign.sent_at && campaign.status === "sent" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent {format(new Date(campaign.sent_at), "MMM d, h:mm a")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{campaign.sent_count || 0}</span>
                            <span className="text-muted-foreground">/ {campaign.total_recipients || "—"}</span>
                          </div>
                          {campaign.status === "sending" && campaign.total_recipients > 0 && (
                            <Progress 
                              value={(campaign.sent_count / campaign.total_recipients) * 100} 
                              className="h-1 mt-2"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {campaign.status === "sent" && campaign.sent_count > 0 ? (
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3 text-blue-500" />
                                <span className="font-medium">{getOpenRate(campaign)}%</span>
                                <span className="text-muted-foreground">opens</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MousePointer className="h-3 w-3 text-green-500" />
                                <span className="font-medium">{getClickRate(campaign)}%</span>
                                <span className="text-muted-foreground">clicks</span>
                              </div>
                              {campaign.bounce_count > 0 && (
                                <div className="flex items-center gap-2 text-red-500">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{campaign.bounce_count} bounces</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {campaign.status === "draft" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => sendCampaign(campaign)}
                                disabled={isSending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isSending ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-1" /> Send
                                  </>
                                )}
                              </Button>
                            )}
                            {campaign.status === "sending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus(campaign.id, "paused")}
                              >
                                <Pause className="h-4 w-4 mr-1" /> Pause
                              </Button>
                            )}
                            {campaign.status === "paused" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus(campaign.id, "sending")}
                              >
                                <Play className="h-4 w-4 mr-1" /> Resume
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(campaign)} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(campaign)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>


        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <iframe
                srcDoc={formData.html_content || getDefaultEmailTemplate(formData.subject)}
                className="w-full h-[500px]"
                title="Email Preview"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Send Dialog */}
        <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-600" />
                Send Campaign?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You're about to send "{selectedCampaign?.name}" to {selectedCampaign?.total_recipients || recipientCount} users.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 px-6">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subject:</span>
                  <span className="font-medium">{selectedCampaign?.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span className="font-medium">{selectedCampaign?.total_recipients || recipientCount} users</span>
                </div>
                <div className="flex justify-between">
                  <span>Audience:</span>
                  <span className="font-medium">
                    {audienceTypes.find(a => a.value === selectedCampaign?.target_audience?.type)?.label || "All Users"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-amber-600">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                This action cannot be undone. Emails will be queued for immediate delivery.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSend} className="bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Delete Dialog */}
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Campaign?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this campaign? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 pb-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>The campaign and all its data will be permanently removed.</span>
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
