import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";




import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"


interface TaxAndDocumentsSectionProps {
  form: UseFormReturn<BaseUserFormData>;
}

export function TaxAndDocumentsSection({ form }: TaxAndDocumentsSectionProps) {
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(`user-documents/${fileName}`, file);

      if (error) throw error;

      if (data) {
        const documents = form.getValues('documents') || [];
        form.setValue('documents', [...documents, data.path]);

        toast({
          title: "Document Uploaded",
          description: "The document has been uploaded successfully.",
        });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
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

        {/* <FormField
          control={form.control}
          name="paymentTerms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Terms</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DueOnReceipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net15">Net 15</SelectItem>
                  <SelectItem value="Net30">Net 30</SelectItem>
                  <SelectItem value="Net45">Net 45</SelectItem>
                  <SelectItem value="Net60">Net 60</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        /> */}


        <FormField
          control={form.control}
          name="taxPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Preference</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
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
           {
          form.getValues("taxPreference") === "Taxable"
          &&   <FormField
          control={form.control}
          name="taxPercantage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Percantage</FormLabel>
              <FormControl>
                <Input placeholder="Tax Percantage" {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        }
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
          <FormLabel>Documents</FormLabel>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              className="hidden"
              id="document-upload"
              onChange={handleFileUpload}
            />
            <Button asChild variant="outline">
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}