import { useEffect, useState } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Eye,
  Code,
  FileText,
  Wand2,
  Monitor,
  Smartphone,
} from "lucide-react";
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
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
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
        ? formData.variables.split(",").map((value) => value.trim()).filter(Boolean)
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
      const { error: queueError } = await supabase
        .from("email_queue")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      if (queueError) console.error("Error updating email_queue:", queueError);

      const { error: automationsError } = await supabase
        .from("email_automations")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      if (automationsError) console.error("Error updating email_automations:", automationsError);

      const { error: campaignsError } = await supabase
        .from("email_campaigns")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      if (campaignsError) console.error("Error updating email_campaigns:", campaignsError);

      const { error: trackingError } = await supabase
        .from("email_tracking")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      if (trackingError) console.error("Error updating email_tracking:", trackingError);

      const { error: logsError } = await supabase
        .from("email_logs")
        .update({ template_id: null })
        .eq("template_id", templateToDelete);
      if (logsError) console.error("Error updating email_logs:", logsError);

      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", templateToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template and related references were removed successfully",
      });
      fetchTemplates();
    } catch (error: any) {
      let errorMsg = error.message || "Failed to delete template";
      if (error.message && error.message.includes("foreign key")) {
        errorMsg = "Database constraint error. Please run the migration: 20260206_fix_all_foreign_key_constraints.sql";
      }

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
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
    setPreviewDevice("desktop");
    setPreviewOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return templateTypes.find((template) => template.value === type)?.label || type;
  };

  const variableList = formData.variables
    ? formData.variables.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Manage reusable email layouts with a cleaner editor flow, responsive previews, and a better mobile editing experience.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditingTemplate(null);
                  setFormData(initialFormState);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> New Template
              </Button>
            </DialogTrigger>

            <DialogContent className="flex h-[95vh] w-[calc(100vw-1rem)] max-w-7xl flex-col overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
              <DialogHeader>
                <div className="border-b bg-background px-4 py-4 sm:px-6">
                  <DialogTitle className="text-xl">
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Update settings, copy, and layout in one workspace that is easier to review on desktop and mobile.
                  </p>
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="order-2 border-t bg-slate-50/70 p-4 sm:p-6 xl:order-1 xl:overflow-y-auto xl:border-r xl:border-t-0">
                    <div className="space-y-6">
                      <div className="rounded-2xl border bg-background p-4 shadow-sm">
                        <div className="space-y-4">
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

                          <div>
                            <Label htmlFor="subject">Email Subject *</Label>
                            <Input
                              id="subject"
                              value={formData.subject}
                              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                              placeholder="Welcome to 9RX!"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="preview_text">Preview Text</Label>
                            <Input
                              id="preview_text"
                              value={formData.preview_text}
                              onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                              placeholder="Short inbox preview copy"
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-3">
                            <div>
                              <Label htmlFor="is_active">Status</Label>
                              <p className="text-xs text-muted-foreground">
                                Control whether the template is available for campaigns and automations.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={formData.is_active ? "default" : "secondary"}>
                                {formData.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-background p-4 shadow-sm">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="variables">Variables</Label>
                            <Input
                              id="variables"
                              value={formData.variables}
                              onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                              placeholder="first_name, order_number, cart_total"
                            />
                            <p className="mt-2 text-xs text-muted-foreground">
                              Use {"{{variable_name}}"} placeholders anywhere in the template.
                            </p>
                          </div>
                          {variableList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {variableList.map((variable) => (
                                <Badge key={variable} variant="secondary" className="rounded-full px-3 py-1">
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-background p-4 shadow-sm">
                        <p className="text-sm font-medium">Writing Tips</p>
                        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <li>Keep the subject line concise so it survives smaller inbox widths.</li>
                          <li>Lead with one primary call-to-action.</li>
                          <li>Use preview text to support the subject instead of repeating it.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="order-1 min-h-0 p-4 sm:p-6 xl:order-2 xl:overflow-y-auto">
                    <Tabs defaultValue="visual" className="flex h-full min-h-0 flex-col">
                      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold">Template Content</h3>
                          <p className="text-sm text-muted-foreground">
                            Edit visually, inspect HTML directly, or maintain a plain-text fallback.
                          </p>
                        </div>
                        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                          <TabsTrigger value="visual"><Wand2 className="mr-2 h-4 w-4" /> Visual</TabsTrigger>
                          <TabsTrigger value="html"><Code className="mr-2 h-4 w-4" /> HTML</TabsTrigger>
                          <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Text</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="visual" className="mt-4 min-h-0 flex-1">
                        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                          <VisualEmailEditor
                            key={editingTemplate?.id || "new"}
                            initialHtml={formData.html_content}
                            onChange={(html) => setFormData({ ...formData, html_content: html })}
                            variables={variableList}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="html" className="mt-4 min-h-0 flex-1">
                        <div className="space-y-3">
                          <Label htmlFor="html_content">HTML Content *</Label>
                          <Textarea
                            id="html_content"
                            value={formData.html_content}
                            onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                            placeholder="<html><body>...</body></html>"
                            rows={18}
                            className="min-h-[420px] font-mono text-sm"
                            required
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="text" className="mt-4 min-h-0 flex-1">
                        <div className="space-y-3">
                          <Label htmlFor="text_content">Plain Text Content</Label>
                          <Textarea
                            id="text_content"
                            value={formData.text_content}
                            onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                            placeholder="Plain text version for email clients that don't support HTML"
                            rows={18}
                            className="min-h-[420px]"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                <div className="border-t bg-background px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePreview(formData.html_content)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Preview
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">{editingTemplate ? "Update" : "Create"} Template</Button>
                    </div>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
            <DialogHeader>
              <div className="border-b px-4 py-4 sm:px-6">
                <DialogTitle>Email Preview</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check spacing, readability, and CTA placement before saving the template.
                </p>
              </div>
            </DialogHeader>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex justify-end">
                <Tabs value={previewDevice} onValueChange={(value) => setPreviewDevice(value as "desktop" | "mobile")}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="desktop">
                      <Monitor className="mr-2 h-4 w-4" /> Desktop
                    </TabsTrigger>
                    <TabsTrigger value="mobile">
                      <Smartphone className="mr-2 h-4 w-4" /> Mobile
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex max-h-[68vh] justify-center overflow-auto rounded-2xl border bg-slate-100 p-4 sm:p-6">
                <div
                  className={
                    previewDevice === "mobile"
                      ? "overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-white shadow-xl"
                      : "w-full max-w-4xl overflow-hidden rounded-2xl border bg-white shadow-lg"
                  }
                  style={previewDevice === "mobile" ? { width: "375px", minWidth: "375px" } : undefined}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className={previewDevice === "mobile" ? "h-[667px] w-[375px]" : "h-[640px] w-full"}
                    title="Email Preview"
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-muted-foreground">Total Templates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter((template) => template.is_active).length}
              </div>
              <p className="text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {templates.filter((template) => template.template_type === "promotional").length}
              </div>
              <p className="text-muted-foreground">Promotional</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {templates.filter((template) => template.template_type === "abandoned_cart").length}
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
              <div className="py-8 text-center">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No templates found. Create your first template!
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{getTypeLabel(template.template_type)}</Badge>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{template.subject}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {template.variables?.length || 0} variables
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handlePreview(template.html_content)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(template.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
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
                          <TableCell className="max-w-[240px] truncate">{template.subject}</TableCell>
                          <TableCell>{template.variables?.length || 0} vars</TableCell>
                          <TableCell>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handlePreview(template.html_content)}>
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
                </div>
              </>
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
