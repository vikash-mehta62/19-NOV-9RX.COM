import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DocumentInfo {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface TaxAndDocumentsSectionProps {
  form: UseFormReturn<BaseUserFormData>;
  isAdmin?: boolean;
  userId?: string;
  isProfileCompletion?: boolean; // NEW: Flag to indicate if this is initial profile completion
}

export function TaxAndDocumentsSection({ form, isAdmin = false, userId, isProfileCompletion = false }: TaxAndDocumentsSectionProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load documents from customer_documents table
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

        setDocuments(documentsData || []);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocuments();
  }, [userId]);

  const getDocumentType = (ext: string): string => {
    const types: Record<string, string> = {
      pdf: 'PDF', doc: 'Word', docx: 'Word',
      xls: 'Excel', xlsx: 'Excel',
      jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image',
    };
    return types[ext.toLowerCase()] || 'Other';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userId) {
      toast({ 
        title: "Upload Not Available", 
        description: "Document upload will be available after your account is verified and approved. Please complete your profile for now.", 
        variant: "default" 
      });
      e.target.value = ''; // Reset file input
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 10MB", variant: "destructive" });
      e.target.value = ''; // Reset file input
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      // Upload to storage in customer-documents folder
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`customer-documents/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get the document type from file extension
      const docType = getDocumentType(fileExt);

      // Get current user for uploaded_by field
      const { data: { user } } = await supabase.auth.getUser();

      // Save document record to customer_documents table
      const { data: newDoc, error: dbError } = await supabase
        .from("customer_documents")
        .insert({
          customer_id: userId,
          name: file.name,
          file_path: uploadData.path,
          file_type: docType,
          file_size: file.size,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update local state
      setDocuments(prev => [newDoc, ...prev]);

      toast({
        title: "Document Uploaded",
        description: "Document uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: DocumentInfo) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Download Failed", description: "Failed to download document.", variant: "destructive" });
    }
  };

  const handleDelete = async (doc: DocumentInfo) => {
    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from("customer_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== doc.id));

      toast({ title: "Document Deleted", description: "The document has been deleted." });
    } catch (error) {
      toast({ title: "Delete Failed", description: "Failed to delete document.", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
          
          {/* CASE 1: Magic link users (profile completion) - Show info message */}
          {isProfileCompletion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    📄 Document Upload Available After Verification
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You can upload documents (licenses, certifications, etc.) after your account is verified and approved by our team. 
                    For now, please complete the rest of your profile information.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* CASE 2: Admin creating NEW customer (no userId) - Show info message */}
          {!isProfileCompletion && !userId && isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                📄 Documents can be uploaded after the customer is created and saved.
              </p>
            </div>
          )}
          
          {/* CASE 3: Admin editing existing customer OR logged-in user - Show upload functionality */}
          {!isProfileCompletion && userId && (
            <>
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
                    {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </label>
                </Button>
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              )}

              {!isLoading && documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Uploaded Documents ({documents.length}):</p>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.file_type} {formatFileSize(doc.file_size) && `• ${formatFileSize(doc.file_size)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && documents.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">Upload your business documents (licenses, certifications, etc.)</p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

