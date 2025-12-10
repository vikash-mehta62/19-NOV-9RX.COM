import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Plus, Pencil, Trash2, Megaphone, Eye, EyeOff,
  Info, AlertTriangle, CheckCircle, XCircle, Gift,
  Bell, MessageSquare, Layers
} from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: "info" | "warning" | "success" | "error" | "promo";
  display_type: "banner" | "popup" | "toast";
  target_audience: "all" | "pharmacy" | "group" | "hospital" | "admin";
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  is_dismissible: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const initialFormState = {
  title: "",
  message: "",
  announcement_type: "info" as const,
  display_type: "banner" as const,
  target_audience: "all" as const,
  link_url: "",
  link_text: "",
  is_active: true,
  is_dismissible: true,
  priority: 0,
  start_date: "",
  end_date: "",
};

const typeIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  promo: <Gift className="h-4 w-4 text-purple-500" />,
};

const displayIcons = {
  banner: <Layers className="h-4 w-4" />,
  popup: <MessageSquare className="h-4 w-4" />,
  toast: <Bell className="h-4 w-4" />,
};

const typeColors = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  promo: "bg-purple-100 text-purple-800",
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        link_url: formData.link_url || null,
        link_text: formData.link_text || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", editingAnnouncement.id);
        if (error) throw error;
        toast({ title: "Success", description: "Announcement updated successfully" });
      } else {
        const { error } = await supabase.from("announcements").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Announcement created successfully" });
      }

      setDialogOpen(false);
      setEditingAnnouncement(null);
      setFormData(initialFormState);
      fetchAnnouncements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      announcement_type: announcement.announcement_type,
      display_type: announcement.display_type,
      target_audience: announcement.target_audience,
      link_url: announcement.link_url || "",
      link_text: announcement.link_text || "",
      is_active: announcement.is_active,
      is_dismissible: announcement.is_dismissible,
      priority: announcement.priority,
      start_date: announcement.start_date ? announcement.start_date.split("T")[0] : "",
      end_date: announcement.end_date ? announcement.end_date.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Announcement deleted successfully" });
      fetchAnnouncements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Manage notifications and important notices</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingAnnouncement(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Important Update"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="We are excited to announce..."
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="announcement_type">Type</Label>
                    <Select
                      value={formData.announcement_type}
                      onValueChange={(value: any) => setFormData({ ...formData, announcement_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">ℹ️ Info</SelectItem>
                        <SelectItem value="warning">⚠️ Warning</SelectItem>
                        <SelectItem value="success">✅ Success</SelectItem>
                        <SelectItem value="error">❌ Error</SelectItem>
                        <SelectItem value="promo">🎁 Promo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="display_type">Display Style</Label>
                    <Select
                      value={formData.display_type}
                      onValueChange={(value: any) => setFormData({ ...formData, display_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">Banner (Top of page)</SelectItem>
                        <SelectItem value="popup">Popup Modal</SelectItem>
                        <SelectItem value="toast">Toast Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value: any) => setFormData({ ...formData, target_audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy Only</SelectItem>
                        <SelectItem value="group">Group Only</SelectItem>
                        <SelectItem value="hospital">Hospital Only</SelectItem>
                        <SelectItem value="admin">Admin Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority (Higher = More Important)</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="link_url">Link URL (Optional)</Label>
                    <Input
                      id="link_url"
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      placeholder="/products or https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="link_text">Link Text</Label>
                    <Input
                      id="link_text"
                      value={formData.link_text}
                      onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_dismissible"
                      checked={formData.is_dismissible}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_dismissible: checked })}
                    />
                    <Label htmlFor="is_dismissible">User Can Dismiss</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAnnouncement ? "Update" : "Create"} Announcement
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{announcements.length}</div>
              <p className="text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {announcements.filter((a) => a.is_active).length}
              </div>
              <p className="text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {announcements.filter((a) => a.announcement_type === "promo").length}
              </div>
              <p className="text-muted-foreground">Promos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {announcements.filter((a) => a.announcement_type === "warning").length}
              </div>
              <p className="text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> All Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No announcements found. Create your first announcement!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[announcement.announcement_type]}
                          <span className={`px-2 py-1 rounded text-xs ${typeColors[announcement.announcement_type]}`}>
                            {announcement.announcement_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{announcement.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {announcement.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {displayIcons[announcement.display_type]}
                          <span className="capitalize">{announcement.display_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {announcement.target_audience}
                        </Badge>
                      </TableCell>
                      <TableCell>{announcement.priority}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(announcement.id, announcement.is_active)}
                        >
                          {announcement.is_active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(announcement)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement.id)}>
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
