import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Upload, FileText, Trash2, Download, Loader2, Pencil } from "lucide-react";

import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import {
  CUSTOMER_DOCUMENT_CATEGORIES,
  getCustomerDocumentStatus,
  getDocumentCategoryLabel,
} from "@/lib/customerDocumentStatus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentInfo {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  document_category?: string | null;
  document_number?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  reminder_days_before?: number | null;
  created_at: string;
}

interface TaxAndDocumentsSectionProps {
  form: UseFormReturn<BaseUserFormData>;
  isAdmin?: boolean;
  userId?: string;
  isProfileCompletion?: boolean;
}

export function TaxAndDocumentsSection({
  form,
  isAdmin = false,
  userId,
  isProfileCompletion = false,
}: TaxAndDocumentsSectionProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [documentCategory, setDocumentCategory] = useState("other");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reminderDaysBefore, setReminderDaysBefore] = useState("30");
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const { data: documentsData, error } = await supabase
          .from("customer_documents")
          .select("*")
          .eq("customer_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching documents:", error);
          return;
        }

        setDocuments((documentsData as DocumentInfo[]) || []);
      } catch (error) {
        console.error("Error loading documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [userId]);

  const getDocumentType = (ext: string): string => {
    const types: Record<string, string> = {
      pdf: "PDF",
      doc: "Word",
      docx: "Word",
      xls: "Excel",
      xlsx: "Excel",
      jpg: "Image",
      jpeg: "Image",
      png: "Image",
      gif: "Image",
    };
    return types[ext.toLowerCase()] || "Other";
  };

  const resetDocumentMetadata = () => {
    setDocumentCategory("other");
    setDocumentNumber("");
    setIssuedAt("");
    setExpiresAt("");
    setReminderDaysBefore("30");
    setEditingDocumentId(null);
  };

  const startEditingDocument = (doc: DocumentInfo) => {
    setEditingDocumentId(doc.id);
    setDocumentCategory(doc.document_category || "other");
    setDocumentNumber(doc.document_number || "");
    setIssuedAt(doc.issued_at || "");
    setExpiresAt(doc.expires_at || "");
    setReminderDaysBefore(String(doc.reminder_days_before || 30));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userId) {
      toast({
        title: "Upload Not Available",
        description:
          "Document upload will be available after your account is verified and approved. Please complete your profile for now.",
        variant: "default",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    try {
      setIsUploading(true);

      const fileExt = file.name.split(".").pop() || "";
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(`customer-documents/${fileName}`, file);

      if (uploadError) throw uploadError;

      const docType = getDocumentType(fileExt);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: newDoc, error: dbError } = await supabase
        .from("customer_documents")
        .insert({
          customer_id: userId,
          name: file.name,
          file_path: uploadData.path,
          file_type: docType,
          document_category: documentCategory,
          document_number: documentNumber.trim() || null,
          issued_at: issuedAt || null,
          expires_at: expiresAt || null,
          reminder_days_before: Number(reminderDaysBefore) || 30,
          file_size: file.size,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setDocuments((prev) => [newDoc as DocumentInfo, ...prev]);
      toast({
        title: "Document Uploaded",
        description: "Document uploaded successfully.",
      });
      resetDocumentMetadata();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (doc: DocumentInfo) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: DocumentInfo) => {
    try {
      await supabase.storage.from("documents").remove([doc.file_path]);

      const { error } = await supabase
        .from("customer_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      toast({
        title: "Document Deleted",
        description: "The document has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  };

  const getReminderSummary = () => {
    let missingExpiry = 0;
    let expiringSoon = 0;
    let expired = 0;

    documents.forEach((doc) => {
      const status = getCustomerDocumentStatus(doc.expires_at).label;
      if (!doc.expires_at) {
        missingExpiry += 1;
      } else if (status === "Expired") {
        expired += 1;
      } else if (status.startsWith("Expiring in")) {
        const daysLeft = Number(status.replace("Expiring in ", "").replace("d", ""));
        const reminderWindow = Number(doc.reminder_days_before || 30);
        if (!Number.isNaN(daysLeft) && daysLeft <= reminderWindow) {
          expiringSoon += 1;
        }
      }
    });

    return { missingExpiry, expiringSoon, expired };
  };

  const handleUpdateMetadata = async () => {
    if (!editingDocumentId) return;

    try {
      const { data, error } = await supabase
        .from("customer_documents")
        .update({
          document_category: documentCategory,
          document_number: documentNumber.trim() || null,
          issued_at: issuedAt || null,
          expires_at: expiresAt || null,
          reminder_days_before: Number(reminderDaysBefore) || 30,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingDocumentId)
        .select()
        .single();

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === editingDocumentId ? (data as DocumentInfo) : doc))
      );
      toast({
        title: "Document Updated",
        description: "Document metadata updated successfully.",
      });
      resetDocumentMetadata();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update document metadata.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="prepay">Prepay</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="stateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter State ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Preference</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax preference" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Taxable">Taxable</SelectItem>
                  <SelectItem value="Non-taxable">Non-taxable</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("taxPreference") === "Taxable" && (
          <FormField
            control={form.control}
            name="taxPercantage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Percentage</FormLabel>
                <FormControl>
                  <Input placeholder="Tax Percentage" {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter Tax ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Documents (Optional)</FormLabel>

          {isProfileCompletion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Document Upload Available After Verification
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You can upload documents after your account is verified and approved.
                    For now, please complete the rest of your profile information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isProfileCompletion && !userId && isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                Documents can be uploaded after the customer is created and saved.
              </p>
            </div>
          )}

          {!isProfileCompletion && userId && (
            <>
              {documents.length > 0 && (() => {
                const summary = getReminderSummary();
                const totalAttention = summary.missingExpiry + summary.expiringSoon + summary.expired;

                if (totalAttention === 0) return null;

                return (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-medium">Document follow-up needed</p>
                    <p className="mt-1 text-xs">
                      {summary.expired > 0 && `${summary.expired} expired. `}
                      {summary.expiringSoon > 0 && `${summary.expiringSoon} expiring soon. `}
                      {summary.missingExpiry > 0 && `${summary.missingExpiry} missing expiry date.`}
                    </p>
                    <p className="mt-1 text-xs">
                      Select `Edit details` on a document below to complete or update its metadata.
                    </p>
                  </div>
                );
              })()}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel>Document Category</FormLabel>
                  <Select value={documentCategory} onValueChange={setDocumentCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_DOCUMENT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FormLabel>Document Number</FormLabel>
                  <Input
                    placeholder="License, permit, or reference number"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Issued Date</FormLabel>
                  <Input
                    type="date"
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Expiry Date</FormLabel>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Reminder Lead Time</FormLabel>
                  <Select value={reminderDaysBefore} onValueChange={setReminderDaysBefore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reminder lead time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  className="hidden"
                  id="document-upload"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                <Button asChild variant="outline" disabled={isUploading}>
                  <label htmlFor="document-upload" className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </label>
                </Button>
                {editingDocumentId && (
                  <>
                    <Button type="button" onClick={handleUpdateMetadata} disabled={isUploading}>
                      Save Details
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetDocumentMetadata}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              )}

              {!isLoading && documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Uploaded Documents ({documents.length}):
                  </p>
                  {documents.map((doc) => {
                    const status = getCustomerDocumentStatus(doc.expires_at);

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{doc.file_type}</span>
                              {formatFileSize(doc.file_size) && (
                                <span>{formatFileSize(doc.file_size)}</span>
                              )}
                              <span>{getDocumentCategoryLabel(doc.document_category)}</span>
                              <div
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                              >
                              {status.label}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                              {doc.document_number
                                ? `Doc #: ${doc.document_number}`
                                : "No document number"}
                              {" • "}
                              {formatDate(doc.issued_at)
                                ? `Issued ${formatDate(doc.issued_at)}`
                                : "Issued date not set"}
                              {" • "}
                              {formatDate(doc.expires_at)
                                ? `Expires ${formatDate(doc.expires_at)}`
                                : "No expiry date"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingDocument(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoading && documents.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your business documents with category and expiry metadata.
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
