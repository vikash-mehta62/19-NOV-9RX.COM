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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Mail, Eye, Code, FileText, Wand2 } from "lucide-react";
import { VisualEmailEditor } from "@/components/email/VisualEmailEditor";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  template_type: string;
  html_content: string;
  text_content: string | null;
  variables: string[] | null;
  preview_text: string | null;
  is_active: boolean;
  created_at: string;
}

const templateTypes = [
  { value: "welcome", label: "Welcome Email" },
  { value: "abandoned_cart", label: "Abandoned Cart" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "order_shipped", label: "Order Shipped" },
  { value: "order_delivered", label: "Order Delivered" },
  { value: "promotional", label: "Promotional" },
  { value: "newsletter", label: "Newsletter" },
  { value: "restock_reminder", label: "Restock Reminder" },
  { value: "inactive_user", label: "Inactive User" },
  { value: "product_spotlight", label: "Product Spotlight" },
  { value: "feedback", label: "Feedback Request" },
  { value: "custom", label: "Custom" },
];

const initialFormState = {
  name: "",
  subject: "",
  template_type: "custom",
  html_content: "",
  text_content: "",
  variables: "",
  preview_text: "",
  is_active: true,
};

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const variablesArray = formData.variables
        ? formData.variables.split(",").map((v) => v.trim()).filter(Boolean)
        : null;

      const payload = {
        name: formData.name,
        subject: formData.subject,
        template_type: formData.template_type,
        html_content: formData.html_content,
        text_content: formData.text_content || null,
        variables: variablesArray,
        preview_text: formData.preview_text || null,
        is_active: formData.is_active,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "Success", description: "Template updated successfully" });
      } else {
        const { error } = await supabase.from("email_templates").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Template created successfully" });
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData(initialFormState);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      template_type: template.template_type,
      html_content: template.html_content,
      text_content: template.text_content || "",
      variables: template.variables?.join(", ") || "",
      preview_text: template.preview_text || "",
      is_active: template.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      console.log("🗑️ Starting deletion process for template:", templateToDelete);
      
      // Step 1: Update email_queue to remove template references
      console.log("Step 1: Updating email_queue...");
      const { error: queueError } = await supabase
        .from("email_queue")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      
      if (queueError) {
        console.error("❌ Error updating email_queue:", queueError);
      } else {
        console.log("✅ email_queue updated");
      }

      // Step 2: Update email_automations to remove template references
      console.log("Step 2: Updating email_automations...");
      const { error: automationsError } = await supabase
        .from("email_automations")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      
      if (automationsError) {
        console.error("❌ Error updating email_automations:", automationsError);
      } else {
        console.log("✅ email_automations updated");
      }

      // Step 3: Update email_campaigns to remove template references
      console.log("Step 3: Updating email_campaigns...");
      const { error: campaignsError } = await supabase
        .from("email_campaigns")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      
      if (campaignsError) {
        console.error("❌ Error updating email_campaigns:", campaignsError);
      } else {
        console.log("✅ email_campaigns updated");
      }

      // Step 4: Update email_tracking
      console.log("Step 4: Updating email_tracking...");
      const { error: trackingError } = await supabase
        .from("email_tracking")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      
      if (trackingError) {
        console.error("❌ Error updating email_tracking:", trackingError);
      } else {
        console.log("✅ email_tracking updated");
      }

      // Step 5: Update email_logs
      console.log("Step 5: Updating email_logs...");
      const { error: logsError } = await supabase
        .from("email_logs")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      
      if (logsError) {
        console.error("❌ Error updating email_logs:", logsError);
      } else {
        console.log("✅ email_logs updated");
      }

      // Step 6: Now delete the template
      console.log("Step 6: Deleting template...");
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", templateToDelete);
        
      if (error) {
        console.error("❌ Error deleting template:", error);
        throw error;
      }
      
      console.log("✅ Template deleted successfully!");
      toast({ 
        title: "Success ✅", 
        description: "Template and all related records deleted successfully" 
      });
      fetchTemplates();
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      
      let errorMsg = error.message || "Failed to delete template";
      if (error.message && error.message.includes("foreign key")) {
        errorMsg = "Database constraint error. Please run the migration: 20260206_fix_all_foreign_key_constraints.sql";
      }
      
      toast({ 
        title: "Error", 
        description: errorMsg,
        variant: "destructive" 
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handlePreview = (html: string) => {
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return templateTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">Create and manage email templates</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTemplate(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Welcome Email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                      placeholder="Welcome to 9RX! 🎉"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="preview_text">Preview Text (shown in inbox)</Label>
                    <Input
                      id="preview_text"
                      value={formData.preview_text}
                      onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                      placeholder="Thank you for joining us..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="variables">Variables (comma separated)</Label>
                    <Input
                      id="variables"
                      value={formData.variables}
                      onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                      placeholder="first_name, order_number, cart_total"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use {"{{variable_name}}"} in your template
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Tabs defaultValue="visual">
                      <TabsList>
                        <TabsTrigger value="visual"><Wand2 className="h-4 w-4 mr-2" /> Visual Editor</TabsTrigger>
                        <TabsTrigger value="html"><Code className="h-4 w-4 mr-2" /> HTML Code</TabsTrigger>
                        <TabsTrigger value="text"><FileText className="h-4 w-4 mr-2" /> Plain Text</TabsTrigger>
                      </TabsList>
                      <TabsContent value="visual" className="mt-4">
                        <VisualEmailEditor
                          key={editingTemplate?.id || 'new'}
                          initialHtml={formData.html_content}
                          onChange={(html) => setFormData({ ...formData, html_content: html })}
                          variables={formData.variables ? formData.variables.split(",").map(v => v.trim()).filter(Boolean) : []}
                        />
                      </TabsContent>
                      <TabsContent value="html">
                        <Label htmlFor="html_content">HTML Content *</Label>
                        <Textarea
                          id="html_content"
                          value={formData.html_content}
                          onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                          placeholder="<html><body>...</body></html>"
                          rows={15}
                          className="font-mono text-sm"
                          required
                        />
                      </TabsContent>
                      <TabsContent value="text">
                        <Label htmlFor="text_content">Plain Text Content</Label>
                        <Textarea
                          id="text_content"
                          value={formData.text_content}
                          onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                          placeholder="Plain text version for email clients that don't support HTML"
                          rows={15}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreview(formData.html_content)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingTemplate ? "Update" : "Create"} Template</Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[500px]"
                title="Email Preview"
              />
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-muted-foreground">Total Templates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter((t) => t.is_active).length}
              </div>
              <p className="text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {templates.filter((t) => t.template_type === "promotional").length}
              </div>
              <p className="text-muted-foreground">Promotional</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {templates.filter((t) => t.template_type === "abandoned_cart").length}
              </div>
              <p className="text-muted-foreground">Cart Recovery</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> All Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Create your first template!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(template.template_type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{template.subject}</TableCell>
                      <TableCell>
                        {template.variables?.length || 0} vars
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(template.html_content)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(template.id)}>
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

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete Email Template"
          description="Are you sure you want to delete this template? This will remove it from all automations, campaigns, and queued emails."
        />
      </div>
    </DashboardLayout>
  );
}
