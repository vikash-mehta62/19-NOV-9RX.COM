import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, Send, Pause, Play, Clock, Users,
  Mail, MousePointer, Eye, BarChart3, Calendar
} from "lucide-react";
import { format } from "date-fns";

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
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

const campaignTypes = [
  { value: "promotional", label: "Promotional" },
  { value: "newsletter", label: "Newsletter" },
  { value: "product_launch", label: "Product Launch" },
  { value: "announcement", label: "Announcement" },
  { value: "survey", label: "Survey" },
  { value: "educational", label: "Educational" },
  { value: "seasonal", label: "Seasonal" },
  { value: "custom", label: "Custom" },
];

const audienceTypes = [
  { value: "all", label: "All Users" },
  { value: "pharmacy", label: "Pharmacy Users" },
  { value: "group", label: "Group Users" },
  { value: "hospital", label: "Hospital Users" },
  { value: "active", label: "Active Users (30 days)" },
  { value: "inactive", label: "Inactive Users" },
  { value: "high_value", label: "High Value Customers" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  sending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

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

  const handleTemplateSelect = (templateId: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        subject: formData.subject,
        template_id: formData.template_id || null,
        html_content: formData.html_content || null,
        campaign_type: formData.campaign_type,
        target_audience: { type: formData.target_audience },
        scheduled_at: formData.scheduled_at || null,
        status: formData.scheduled_at ? "scheduled" : "draft",
      };

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
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      template_id: campaign.template_id || "",
      html_content: campaign.html_content || "",
      campaign_type: campaign.campaign_type,
      target_audience: campaign.target_audience?.type || "all",
      scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Campaign deleted successfully" });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "sent") {
        updates.sent_at = new Date().toISOString();
      }
      const { error } = await supabase.from("email_campaigns").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: `Campaign ${status}` });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const sendCampaign = async (campaign: EmailCampaign) => {
    if (!confirm(`Send campaign "${campaign.name}" to all recipients?`)) return;
    // In real implementation, this would trigger the email sending process
    await updateStatus(campaign.id, "sending");
    toast({
      title: "Campaign Started",
      description: "Emails are being sent. Check back for progress.",
    });
  };

  const getOpenRate = (campaign: EmailCampaign) => {
    if (campaign.sent_count === 0) return 0;
    return ((campaign.open_count / campaign.sent_count) * 100).toFixed(1);
  };

  const getClickRate = (campaign: EmailCampaign) => {
    if (campaign.open_count === 0) return 0;
    return ((campaign.click_count / campaign.open_count) * 100).toFixed(1);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                            {type.label}
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
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="template_id">Use Template (Optional)</Label>
                    <Select
                      value={formData.template_id}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No template</SelectItem>
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
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="html_content">Email Content (HTML)</Label>
                    <Textarea
                      id="html_content"
                      value={formData.html_content}
                      onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                      placeholder="<html><body>...</body></html>"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="scheduled_at">Schedule Send (Optional)</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty to save as draft
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingCampaign ? "Update" : "Create"} Campaign</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <p className="text-muted-foreground">Total Campaigns</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {campaigns.filter((c) => c.status === "sent").length}
              </div>
              <p className="text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {campaigns.filter((c) => c.status === "scheduled").length}
              </div>
              <p className="text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">
                {campaigns.filter((c) => c.status === "draft").length}
              </div>
              <p className="text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {campaigns.reduce((sum, c) => sum + c.sent_count, 0).toLocaleString()}
              </div>
              <p className="text-muted-foreground">Emails Sent</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> All Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No campaigns found. Create your first campaign!
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {campaign.subject}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {campaignTypes.find((t) => t.value === campaign.campaign_type)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[campaign.status]}`}>
                          {campaign.status}
                        </span>
                        {campaign.scheduled_at && campaign.status === "scheduled" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(campaign.scheduled_at), "MMM d, h:mm a")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {campaign.sent_count}/{campaign.total_recipients || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.status === "sent" ? (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3" /> {getOpenRate(campaign)}% opens
                            </div>
                            <div className="flex items-center gap-2">
                              <MousePointer className="h-3 w-3" /> {getClickRate(campaign)}% clicks
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendCampaign(campaign)}
                              title="Send Now"
                            >
                              <Send className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {campaign.status === "sending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(campaign.id, "paused")}
                              title="Pause"
                            >
                              <Pause className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          {campaign.status === "paused" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(campaign.id, "sending")}
                              title="Resume"
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(campaign)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
