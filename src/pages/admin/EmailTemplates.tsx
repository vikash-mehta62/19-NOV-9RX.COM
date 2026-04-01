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
  ChevronLeft,
  ChevronRight,
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
  // { value: "welcome", label: "Welcome Email" },
  { value: "abandoned_cart", label: "Abandoned Cart" },
  // { value: "order_confirmation", label: "Order Confirmation" },
  // { value: "order_shipped", label: "Order Shipped" },
  // { value: "order_delivered", label: "Order Delivered" },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
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

            <DialogContent className="flex h-[98vh] w-[98vw] max-w-7xl flex-col overflow-hidden p-0 sm:h-[95vh] sm:w-[95vw]">
              <DialogHeader>
                <div className="flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-gray-900">
                        {editingTemplate ? "Edit Template" : "Create New Template"}
                      </DialogTitle>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Design beautiful emails with our visual editor
                      </p>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="relative grid min-h-0 flex-1 gap-0 overflow-hidden transition-all duration-300" style={{
                  gridTemplateColumns: sidebarCollapsed ? '0px 1fr' : 'clamp(240px, 30vw, 360px) 1fr'
                }}>
                  {/* Left Sidebar - Collapsible on all screens */}
                  <div className={`flex flex-col overflow-hidden border-r bg-gradient-to-b from-slate-50 to-slate-100/50 transition-all duration-300 ${
                    sidebarCollapsed 
                      ? 'w-0 opacity-0 pointer-events-none' 
                      : 'w-auto opacity-100'
                  }`}>
                    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
                      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                      <div className="group rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:p-4">
                        <div className="mb-2 flex items-center gap-2 sm:mb-3">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 sm:h-8 sm:w-8">
                            <FileText className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">Basic Details</h3>
                        </div>
                        <div className="space-y-2.5 sm:space-y-3 lg:space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Template Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g., Welcome Email"
                              className="mt-2 h-11 rounded-lg border-gray-300 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="template_type" className="text-sm font-semibold text-gray-700">Template Type</Label>
                            <Select
                              value={formData.template_type}
                              onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                            >
                              <SelectTrigger className="mt-2 h-11 rounded-lg border-gray-300 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {templateTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value} className="text-sm">
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="subject" className="text-sm font-semibold text-gray-700">Email Subject *</Label>
                            <Input
                              id="subject"
                              value={formData.subject}
                              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                              placeholder="e.g., Welcome to 9RX!"
                              className="mt-2 h-11 rounded-lg border-gray-300 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="preview_text" className="text-sm font-semibold text-gray-700">Preview Text</Label>
                            <Input
                              id="preview_text"
                              value={formData.preview_text}
                              onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                              placeholder="Short inbox preview copy"
                              className="mt-2 h-11 rounded-lg border-gray-300 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>

                          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <Label htmlFor="is_active" className="text-sm font-semibold text-gray-900">Status</Label>
                                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                                  Make template available for use
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Badge 
                                  variant={formData.is_active ? "default" : "secondary"} 
                                  className={`text-xs font-semibold ${formData.is_active ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                >
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
                      </div>

                      <div className="group rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-purple-300 hover:shadow-md sm:p-4">
                        <div className="mb-2 flex items-center gap-2 sm:mb-3">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 sm:h-8 sm:w-8">
                            <Code className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">Variables</h3>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <Label htmlFor="variables" className="text-sm font-semibold text-gray-700">Dynamic Fields</Label>
                            <Input
                              id="variables"
                              value={formData.variables}
                              onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                              placeholder="first_name, order_number"
                              className="mt-2 h-11 rounded-lg border-gray-300 text-sm shadow-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            />
                            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                              💡 Use {"{{variable_name}}"} placeholders in your template
                            </p>
                          </div>
                          {variableList.length > 0 && (
                            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-3">
                              <p className="mb-2 text-xs font-semibold text-gray-700">Available Variables:</p>
                              <div className="flex flex-wrap gap-2">
                                {variableList.map((variable) => (
                                  <Badge 
                                    key={variable} 
                                    variant="secondary" 
                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-mono font-semibold text-purple-700 shadow-sm"
                                  >
                                    {`{{${variable}}}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="group rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 shadow-sm transition-all hover:border-amber-300 hover:shadow-md sm:p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 sm:h-8 sm:w-8">
                            <Wand2 className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">Pro Tips</h3>
                        </div>
                        <ul className="space-y-1.5 text-xs text-gray-700 leading-relaxed sm:space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 text-amber-600">✓</span>
                            <span>Keep subject lines under 50 characters for mobile</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 text-amber-600">✓</span>
                            <span>Use one clear call-to-action button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 text-amber-600">✓</span>
                            <span>Preview text should complement, not repeat subject</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Main Content Area */}
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                    {/* Collapse Toggle Button - Visible on all screens */}
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-gray-300 bg-white shadow-md transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg sm:left-4 sm:top-4 sm:h-9 sm:w-9"
                      title={sidebarCollapsed ? "Show Settings" : "Hide Settings"}
                    >
                      {sidebarCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-700 sm:h-5 sm:w-5" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 text-gray-700 sm:h-5 sm:w-5" />
                      )}
                    </button>

                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 pt-14 sm:p-4 sm:pt-16 lg:p-6">
                      <Tabs defaultValue="visual" className="flex h-full min-h-0 flex-col">
                        <div className="flex flex-col gap-4 border-b-2 border-gray-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-gray-900 pl-8">Template Content</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Design with visual editor, code in HTML, or add plain text fallback
                            </p>
                          </div>
                          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-100 p-1 lg:w-auto">
                            <TabsTrigger 
                              value="visual" 
                              className="rounded-lg text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <Wand2 className="mr-2 h-4 w-4" /> 
                              Visual
                            </TabsTrigger>
                            <TabsTrigger 
                              value="html" 
                              className="rounded-lg text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <Code className="mr-2 h-4 w-4" /> HTML
                            </TabsTrigger>
                            <TabsTrigger 
                              value="text" 
                              className="rounded-lg text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <FileText className="mr-2 h-4 w-4" /> Text
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="visual" className="mt-5 min-h-0 flex-1">
                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <VisualEmailEditor
                              key={editingTemplate?.id || "new"}
                              initialHtml={formData.html_content}
                              onChange={(html) => setFormData({ ...formData, html_content: html })}
                              variables={variableList}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="html" className="mt-5 min-h-0 flex-1">
                          <div className="space-y-3">
                            <Label htmlFor="html_content" className="text-sm font-semibold text-gray-700">HTML Content *</Label>
                            <Textarea
                              id="html_content"
                              value={formData.html_content}
                              onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                              placeholder="<html><body>...</body></html>"
                              rows={18}
                              className="min-h-[420px] rounded-lg border border-gray-300 font-mono text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                              required
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="text" className="mt-5 min-h-0 flex-1">
                          <div className="space-y-3">
                            <Label htmlFor="text_content" className="text-sm font-semibold text-gray-700">Plain Text Content</Label>
                            <Textarea
                              id="text_content"
                              value={formData.text_content}
                              onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                              placeholder="Plain text version for email clients that don't support HTML"
                              rows={18}
                              className="min-h-[420px] rounded-lg border border-gray-300 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePreview(formData.html_content)}
                      className="h-11 rounded-xl border-2 border-gray-300 text-sm font-semibold shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Eye className="mr-2 h-4 w-4" /> Preview Email
                    </Button>
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDialogOpen(false)}
                        className="h-11 flex-1 rounded-xl border-2 border-gray-300 text-sm font-semibold shadow-sm transition-all hover:border-gray-400 hover:bg-gray-100 sm:flex-none sm:min-w-[120px]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="h-11 flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-sm font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl sm:flex-none sm:min-w-[160px]"
                      >
                        {editingTemplate ? "💾 Update" : "✨ Create"} Template
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-h-[96vh] w-[98vw] max-w-5xl overflow-hidden p-0 sm:max-h-[92vh] sm:w-[95vw]">
            <DialogHeader>
              <div className="border-b px-3 py-3 sm:px-6 sm:py-4">
                <DialogTitle className="text-base sm:text-lg">Email Preview</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Check spacing, readability, and CTA placement before saving the template.
                </p>
              </div>
            </DialogHeader>
            <div className="space-y-3 p-3 sm:space-y-4 sm:p-6">
              <div className="flex justify-center sm:justify-end">
                <Tabs value={previewDevice} onValueChange={(value) => setPreviewDevice(value as "desktop" | "mobile")}>
                  <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                    <TabsTrigger value="desktop" className="text-xs sm:text-sm">
                      <Monitor className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" /> Desktop
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="text-xs sm:text-sm">
                      <Smartphone className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" /> Mobile
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex max-h-[70vh] justify-center overflow-auto rounded-xl border bg-slate-100 p-2 sm:max-h-[68vh] sm:rounded-2xl sm:p-6">
                <div
                  className={
                    previewDevice === "mobile"
                      ? "overflow-hidden rounded-[1.5rem] border-[8px] border-slate-900 bg-white shadow-xl sm:rounded-[2rem] sm:border-[10px]"
                      : "w-full max-w-4xl overflow-hidden rounded-xl border bg-white shadow-lg sm:rounded-2xl"
                  }
                  style={previewDevice === "mobile" ? { width: "320px", minWidth: "320px" } : undefined}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className={previewDevice === "mobile" ? "h-[568px] w-[320px] sm:h-[667px] sm:w-[375px]" : "h-[500px] w-full sm:h-[640px]"}
                    title="Email Preview"
                    style={previewDevice === "mobile" ? { width: "320px" } : undefined}
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
