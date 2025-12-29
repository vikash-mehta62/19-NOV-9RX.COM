import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Building2, MapPin, FileText, AlertCircle, Save, Clock } from "lucide-react";
import { BasicInformationSection } from "./sections/BasicInformationSection";
import { ContactInformationSection } from "./sections/ContactInformationSection";
import { AddressInformationSection } from "./sections/AddressInformationSection";
import { TaxAndDocumentsSection } from "./sections/TaxAndDocumentsSection";
import { CustomerTypeFields } from "./sections/CustomerTypeFields";
import { GroupUserFields } from "./GroupUserFields";
import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DRAFT_STORAGE_KEY = "customer_form_draft";

interface TabbedUserFormProps {
  form: UseFormReturn<BaseUserFormData>;
  onSubmit: (values: BaseUserFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  self?: boolean;
  isAdmin?: boolean;
}

// Define which fields belong to which tab for error tracking
const tabFields: Record<string, (keyof BaseUserFormData)[]> = {
  basic: ["firstName", "lastName", "email", "type", "status", "companyName", "role"],
  contact: ["workPhone", "mobilePhone", "alternativeEmail", "faxNumber", "contactPerson", "department"],
  address: ["billingAddress", "shippingAddress", "sameAsShipping", "freeShipping", "order_pay", "email_notifaction"],
  tax: ["taxPreference", "taxPercantage", "taxId", "paymentTerms", "documents"],
};

export function TabbedUserForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  self = false,
  isAdmin = false,
}: TabbedUserFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [tabErrors, setTabErrors] = useState<Record<string, number>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.timestamp && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, []);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const formValues = form.watch();
    
    const saveDraft = () => {
      const draft = {
        data: formValues,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
    };

    // Debounced auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(saveDraft, 5000); // Save 5 seconds after last change

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form.watch()]);

  // Restore draft
  const restoreDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        form.reset(draft.data);
        setHasDraft(false);
        toast({
          title: "Draft Restored",
          description: "Your previous form data has been restored.",
        });
      } catch (e) {
        toast({
          title: "Error",
          description: "Failed to restore draft.",
          variant: "destructive",
        });
      }
    }
  };

  // Discard draft
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    toast({
      title: "Draft Discarded",
      description: "The saved draft has been removed.",
    });
  };

  // Clear draft on successful submit
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLastSaved(null);
  };

  // Count errors per tab
  const updateTabErrors = useCallback(() => {
    const errors = form.formState.errors;
    const errorCounts: Record<string, number> = {};

    Object.entries(tabFields).forEach(([tab, fields]) => {
      let count = 0;
      fields.forEach((field) => {
        if (errors[field]) {
          count++;
        }
        // Check nested address errors
        if (field === "billingAddress" || field === "shippingAddress") {
          const addressErrors = errors[field] as any;
          if (addressErrors) {
            count += Object.keys(addressErrors).length;
          }
        }
      });
      if (count > 0) {
        errorCounts[tab] = count;
      }
    });

    setTabErrors(errorCounts);
  }, [form.formState.errors]);

  useEffect(() => {
    updateTabErrors();
  }, [form.formState.errors, updateTabErrors]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close (handled by dialog)
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        form.handleSubmit(handleSubmit)();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (values: BaseUserFormData) => {
    try {
      const validType = (type: string): "pharmacy" | "hospital" | "group" => {
        const validTypes = ["pharmacy", "hospital", "group"] as const;
        const normalizedType = type.toLowerCase();
        return validTypes.includes(normalizedType as any)
          ? (normalizedType as "pharmacy" | "hospital" | "group")
          : "pharmacy";
      };

      const validStatus = (
        status: string
      ): "active" | "inactive" | "pending" => {
        const validStatuses = ["active", "inactive", "pending"] as const;
        const normalizedStatus = status.toLowerCase();
        return validStatuses.includes(normalizedStatus as any)
          ? (normalizedStatus as "active" | "inactive" | "pending")
          : "active";
      };

      const validRole = (
        role: string
      ): "admin" | "manager" | "staff" | "user" => {
        const validRoles = ["admin", "manager", "staff", "user"] as const;
        const normalizedRole = role.toLowerCase();
        return validRoles.includes(normalizedRole as any)
          ? (normalizedRole as "admin" | "manager" | "staff" | "user")
          : "user";
      };

      const formattedValues: BaseUserFormData = {
        ...values,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.toLowerCase().trim(),
        type: validType(values.type),
        status: validStatus(values.status),
        role: validRole(values.role),
        companyName: values.companyName,
        displayName:
          values.displayName || `${values.firstName} ${values.lastName}`,
        workPhone: values.workPhone,
        mobilePhone: values.mobilePhone,
        pharmacyLicense: values.pharmacyLicense,
        groupStation: values.groupStation,
        taxId: values.taxId,
        documents: Array.isArray(values.documents) ? values.documents : [],
        billingAddress: values.billingAddress || {},
        shippingAddress: values.shippingAddress || {},
        sameAsShipping: values.sameAsShipping || false,
        freeShipping: values.freeShipping || false,
        order_pay: values.order_pay || false,
        taxPreference: values.taxPreference || "Taxable",
        currency: values.currency || "USD",
        paymentTerms: values.paymentTerms || "prepay",
        enablePortal: values.enablePortal || false,
        portalLanguage: values.portalLanguage || "English",
        alternativeEmail: values.alternativeEmail,
        website: values.website,
        faxNumber: values.faxNumber,
        contactPerson: values.contactPerson,
        department: values.department,
        notes: values.notes,
        taxPercantage: values.taxPercantage,
        preferredContactMethod: values.preferredContactMethod || "email",
        languagePreference: values.languagePreference || "English",
creditLimit: values.creditLimit
  ? Number(values.creditLimit)
  : 0,
        paymentMethod: values.paymentMethod,
        email_notifaction: values.email_notifaction,
      };

      await onSubmit(formattedValues);
      clearDraft(); // Clear draft on successful submit
    } catch (error) {
      console.error("TabbedUserForm: Error in form submission:", error);
      throw error;
    }
  };

  const userType = form.watch("type");

  useEffect(() => {
    form.setValue("billingAddress.phone", form.getValues("workPhone"));
    form.setValue("shippingAddress.phone", form.getValues("workPhone"));
  }, [form.watch("workPhone")]);

  useEffect(() => {
    form.setValue("shippingAddress.attention", form.getValues("contactPerson"));
    form.setValue("billingAddress.attention", form.getValues("contactPerson"));
  }, [form.watch("contactPerson")]);

  // Tab component with error indicator
  const TabTriggerWithError = ({ 
    value, 
    icon: Icon, 
    label, 
    shortLabel 
  }: { 
    value: string; 
    icon: React.ElementType; 
    label: string;
    shortLabel: string;
  }) => {
    const errorCount = tabErrors[value] || 0;
    
    return (
      <TabsTrigger 
        value={value} 
        className={cn(
          "flex items-center gap-1.5 relative",
          errorCount > 0 && "text-destructive data-[state=active]:text-destructive"
        )}
        title={label}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden text-xs">{shortLabel}</span>
        {errorCount > 0 && (
          <Badge 
            variant="destructive" 
            className="h-4 w-4 p-0 flex items-center justify-center text-[10px] absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 sm:ml-1"
          >
            {errorCount}
          </Badge>
        )}
      </TabsTrigger>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          (values) => {
            handleSubmit(values);
          },
          (errors) => {
            console.error("❌ Form validation errors:", errors);
            updateTabErrors();
            // Navigate to first tab with errors
            const firstTabWithError = Object.keys(tabFields).find(tab => {
              return Object.keys(errors).some(errorKey => 
                tabFields[tab].includes(errorKey as keyof BaseUserFormData)
              );
            });
            if (firstTabWithError) {
              setActiveTab(firstTabWithError);
            }
          }
        )}
        className="space-y-4"
      >
        {/* Draft Recovery Banner */}
        {hasDraft && (
          <div className="flex items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <Save className="h-4 w-4 shrink-0" />
              <span>You have an unsaved draft from a previous session.</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={discardDraft}
                className="h-7 text-xs"
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={restoreDraft}
                className="h-7 text-xs"
              >
                Restore
              </Button>
            </div>
          </div>
        )}

        {/* Error Summary */}
        {Object.keys(tabErrors).length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Please fix the errors in the highlighted tabs before submitting.
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabTriggerWithError value="basic" icon={User} label="Basic Info" shortLabel="Basic" />
            <TabTriggerWithError value="contact" icon={Building2} label="Contact" shortLabel="Contact" />
            <TabTriggerWithError value="address" icon={MapPin} label="Address" shortLabel="Address" />
            <TabTriggerWithError value="tax" icon={FileText} label="Tax & Docs" shortLabel="Tax" />
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <BasicInformationSection form={form} self={self} isAdmin={isAdmin} />
            {userType && <CustomerTypeFields form={form} type={userType as "pharmacy" | "hospital" | "group"} />}
            {userType === "group" && <GroupUserFields form={form as UseFormReturn<any>} />}
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <ContactInformationSection form={form} />
          </TabsContent>

          <TabsContent value="address" className="space-y-4 mt-4">
            <AddressInformationSection form={form} self={self} />
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 mt-4">
            <TaxAndDocumentsSection form={form} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex items-center gap-4 mr-auto">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to submit
            </p>
            {lastSaved && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Auto-saved {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full sm:w-auto min-w-[140px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
