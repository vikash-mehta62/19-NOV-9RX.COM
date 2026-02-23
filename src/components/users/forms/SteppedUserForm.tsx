import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { UseFormReturn, FieldErrors } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { Loader2, Store, Building2, FileText, Key, ChevronLeft, ChevronRight, Check, Rocket, AlertCircle } from "lucide-react";
import { BasicInformationSection } from "./sections/BasicInformationSection";
import { ContactInformationSection } from "./sections/ContactInformationSection";
import { AddressInformationSection } from "./sections/AddressInformationSection";
import { TaxAndDocumentsSection } from "./sections/TaxAndDocumentsSection";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

// Helper to extract readable error messages from validation errors
const getErrorMessages = (errors: FieldErrors<BaseUserFormData>): string[] => {
  const messages: string[] = [];
  const extractErrors = (obj: any, prefix = "") => {
    for (const key in obj) {
      if (obj[key]?.message) {
        // Format field name to be more readable
        const fieldName = prefix ? `${prefix} ${key}` : key;
        const readableName = fieldName
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace('_', ' ')
          .trim();
        messages.push(`${readableName}: ${obj[key].message}`);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        extractErrors(obj[key], key);
      }
    }
  };
  extractErrors(errors);
  return messages;
};

const STEPS = [
  { id: 1, title: "Business", icon: Store },
  { id: 2, title: "Address", icon: Building2 },
  { id: 3, title: "Documents", icon: FileText },
  { id: 4, title: "Review", icon: Key },
];

interface SteppedUserFormProps {
  form: UseFormReturn<BaseUserFormData>;
  onSubmit: (values: BaseUserFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  hideSteps?: boolean;
  userId?: string;
}

export function SteppedUserForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  hideSteps = false,
  userId,
}: SteppedUserFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Watch for form errors and update validation errors display
  useEffect(() => {
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      const errorMessages = getErrorMessages(errors);
      setValidationErrors(errorMessages);
    } else {
      setValidationErrors([]);
    }
  }, [form.formState.errors]);

  const validateStep = (step: number): { valid: boolean; message?: string } => {
    const values = form.getValues();
    // Clear previous validation errors when moving between steps
    setValidationErrors([]);
    
    switch (step) {
      case 1:
        // Business Information validation
        if (!values.firstName?.trim()) return { valid: false, message: "First name is required" };
        if (!values.lastName?.trim()) return { valid: false, message: "Last name is required" };
        if (!values.companyName?.trim()) return { valid: false, message: "Store/Company name is required" };
        if (!values.email?.trim()) return { valid: false, message: "Email is required" };
        if (!values.workPhone?.trim()) return { valid: false, message: "Work phone is required" };
        if (values.workPhone && values.workPhone.replace(/\D/g, '').length < 10) {
          return { valid: false, message: "Work phone must be at least 10 digits" };
        }
        if (!values.contactPerson?.trim()) return { valid: false, message: "Contact person is required" };
        return { valid: true };
      case 2:
        // Address validation
        const billing = values.billingAddress;
        if (!billing?.street1?.trim()) return { valid: false, message: "Billing street address is required" };
        if (!billing?.city?.trim()) return { valid: false, message: "Billing city is required" };
        if (!billing?.state?.trim()) return { valid: false, message: "Billing state is required" };
        if (!billing?.zip_code?.trim()) return { valid: false, message: "Billing ZIP code is required" };
        if (!billing?.countryRegion?.trim()) return { valid: false, message: "Billing country is required" };
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      setStepError(validation.message || "Please fill all required fields");
      return;
    }
    setStepError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setStepError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };


  const handleSubmit = async (values: BaseUserFormData) => {
    // Clear previous errors
    setStepError(null);
    setValidationErrors([]);

    // Check if terms are accepted on final step
    if (!termsAccepted) {
      setStepError("Please accept the Terms and Conditions to continue");
      return;
    }

    try {
      const validType = (type: string): "pharmacy" | "hospital" | "group" | "vendor" => {
        const validTypes = ["pharmacy", "hospital", "group", "vendor"] as const;
        return validTypes.includes(type.toLowerCase() as any) ? (type.toLowerCase() as any) : "pharmacy";
      };
      const validStatus = (status: string): "active" | "inactive" | "pending" => {
        const validStatuses = ["active", "inactive", "pending"] as const;
        return validStatuses.includes(status.toLowerCase() as any) ? (status.toLowerCase() as any) : "active";
      };
      const validRole = (role: string): "admin" | "manager" | "staff" | "user" => {
        const validRoles = ["admin", "manager", "staff", "user"] as const;
        return validRoles.includes(role.toLowerCase() as any) ? (role.toLowerCase() as any) : "user";
      };

      // Create terms_and_conditions JSON with timestamp
      const termsAndConditions = {
        accepted: true,
        accepted_at: new Date().toISOString(),
        ip_address: null, // Can be captured server-side if needed
        version: "1.0"
      };

      const formattedValues: BaseUserFormData = {
        ...values,
        email: values.email.toLowerCase().trim(),
        type: validType(values.type),
        status: validStatus(values.status),
        role: validRole(values.role),
        displayName: values.displayName || `${values.firstName} ${values.lastName}`,
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
        preferredContactMethod: values.preferredContactMethod || "email",
        languagePreference: values.languagePreference || "English",
        creditLimit: values.creditLimit ? Number(values.creditLimit) : 0,
        terms_and_conditions: termsAndConditions as any,
        // Add Privacy Policy acceptance
        privacy_policy_accepted: true,
        privacy_policy_accepted_at: new Date().toISOString(),
        // Add ACH Authorization acceptance (if checkbox was checked)
        ach_authorization_accepted: values.achAuthorizationAccepted || false,
        ach_authorization_accepted_at: values.achAuthorizationAccepted ? new Date().toISOString() : null,
        ach_authorization_version: values.achAuthorizationAccepted ? "1.0" : null,
      };
      await onSubmit(formattedValues);
    } catch (error: any) {
      console.error("SteppedUserForm: Error in form submission:", error);
      // Display the error message from the API or validation
      const errorMessage = error?.message || "Failed to update profile. Please try again.";
      setStepError(errorMessage);
      throw error;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                <Store className="h-3 w-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900">Business Information</h3>
              </div>
            </div>
            <BasicInformationSection form={form} self={true} isAdmin={false} />
            <ContactInformationSection form={form} self={true} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                <Building2 className="h-3 w-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900">Address Information</h3>
              </div>
            </div>
            <AddressInformationSection form={form} self={true} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded flex items-center justify-center">
                <FileText className="h-3 w-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900">Business Documents</h3>
              </div>
            </div>
            <TaxAndDocumentsSection form={form} isAdmin={false} userId={userId} />
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900">Review & Submit</h3>
              </div>
            </div>
            
            {/* Business Information */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Store className="h-3 w-3 text-blue-600" /> Business Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{form.getValues("firstName")} {form.getValues("lastName")}</span></div>
                <div><span className="text-gray-500">Company:</span> <span className="font-medium">{form.getValues("companyName") || "-"}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{form.getValues("email") || "-"}</span></div>
                <div><span className="text-gray-500">Work Phone:</span> <span className="font-medium">{form.getValues("workPhone") || "-"}</span></div>
                <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{form.getValues("mobilePhone") || "-"}</span></div>
                <div><span className="text-gray-500">Contact Person:</span> <span className="font-medium">{form.getValues("contactPerson") || "-"}</span></div>
                <div><span className="text-gray-500">Fax:</span> <span className="font-medium">{form.getValues("faxNumber") || "-"}</span></div>
                <div><span className="text-gray-500">Department:</span> <span className="font-medium">{form.getValues("department") || "-"}</span></div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-blue-600" /> Billing Address
              </h4>
              <div className="text-[10px] space-y-1">
                <p className="font-medium text-gray-900">
                  {form.getValues("billingAddress.street1") || "-"}
                  {form.getValues("billingAddress.street2") && `, ${form.getValues("billingAddress.street2")}`}
                </p>
                <p className="text-gray-600">
                  {form.getValues("billingAddress.city") || ""}
                  {form.getValues("billingAddress.state") && `, ${form.getValues("billingAddress.state")}`}
                  {form.getValues("billingAddress.zip_code") && ` ${form.getValues("billingAddress.zip_code")}`}
                </p>
                <p className="text-gray-600">{form.getValues("billingAddress.countryRegion") || ""}</p>
              </div>
            </div>

            {/* Shipping Address */}
            {!form.getValues("sameAsShipping") && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <h4 className="text-[11px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-green-600" /> Shipping Address
                </h4>
                <div className="text-[10px] space-y-1">
                  <p className="font-medium text-gray-900">
                    {form.getValues("shippingAddress.street1") || "-"}
                    {form.getValues("shippingAddress.street2") && `, ${form.getValues("shippingAddress.street2")}`}
                  </p>
                  <p className="text-gray-600">
                    {form.getValues("shippingAddress.city") || ""}
                    {form.getValues("shippingAddress.state") && `, ${form.getValues("shippingAddress.state")}`}
                    {form.getValues("shippingAddress.zip_code") && ` ${form.getValues("shippingAddress.zip_code")}`}
                  </p>
                  <p className="text-gray-600">{form.getValues("shippingAddress.countryRegion") || ""}</p>
                </div>
              </div>
            )}
            {form.getValues("sameAsShipping") && (
              <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                <p className="text-[10px] text-green-700">✓ Shipping address same as billing</p>
              </div>
            )}

            {/* Tax & Documents */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-purple-600" /> Tax Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-gray-500">State ID:</span> <span className="font-medium">{form.getValues("stateId") || "-"}</span></div>
                <div><span className="text-gray-500">Tax ID:</span> <span className="font-medium">{form.getValues("taxId") || "-"}</span></div>
                <div><span className="text-gray-500">Tax Preference:</span> <span className="font-medium">{form.getValues("taxPreference") || "Taxable"}</span></div>
                <div><span className="text-gray-500">Tax %:</span> <span className="font-medium">{form.getValues("taxPercantage") || "0"}%</span></div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className={`rounded-lg p-3 border ${termsAccepted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => {
                    setTermsAccepted(checked === true);
                    if (checked) setStepError(null);
                  }}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-[11px] text-gray-700 leading-relaxed cursor-pointer">
                  I agree to the <a href="https://www.9rx.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Terms and Conditions</a> and <a href="https://www.9rx.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Privacy Policy</a>. I confirm that all information provided is accurate and complete.
                </label>
              </div>
            </div>

            {/* ACH Authorization (Optional) */}
            <div className="rounded-lg p-3 border bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="achAuthorization" 
                  checked={form.watch("achAuthorizationAccepted") || false}
                  onCheckedChange={(checked) => {
                    form.setValue("achAuthorizationAccepted", checked === true);
                  }}
                  className="mt-0.5"
                />
                <label htmlFor="achAuthorization" className="text-[11px] text-gray-700 leading-relaxed cursor-pointer">
                  <span className="font-semibold text-blue-800">ACH Authorization (Optional):</span> I authorize 9RX to electronically debit my bank account for payments. I understand that this authorization will remain in effect until I cancel it in writing.
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
              <p className="text-[10px] text-blue-700"><span className="font-medium">Note:</span> Please review all information above and accept the terms to save changes.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  // Handle form validation errors from react-hook-form
  const handleFormError = (errors: FieldErrors<BaseUserFormData>) => {
    console.log("Form validation errors:", errors);
    const errorMessages = getErrorMessages(errors);
    setValidationErrors(errorMessages);
    
    // If there are errors, determine which step has the first error and navigate there
    if (Object.keys(errors).length > 0) {
      // Check which step has errors
      const step1Fields = ['firstName', 'lastName', 'companyName', 'email', 'workPhone', 'mobilePhone', 'contactPerson', 'department', 'faxNumber'];
      const step2Fields = ['billingAddress', 'shippingAddress'];
      
      const hasStep1Error = step1Fields.some(field => errors[field as keyof BaseUserFormData]);
      const hasStep2Error = step2Fields.some(field => errors[field as keyof BaseUserFormData]);
      
      if (hasStep1Error && currentStep > 1) {
        setCurrentStep(1);
        setStepError("Please fix the errors in Business Information");
      } else if (hasStep2Error && currentStep > 2) {
        setCurrentStep(2);
        setStepError("Please fix the errors in Address Information");
      }
    }
  };

  // Prevent form submission on Enter key (only submit on final step button click)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentStep < STEPS.length) {
      e.preventDefault();
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(handleSubmit, handleFormError)} 
        onKeyDown={handleKeyDown}
        className="h-full flex flex-col"
      >
        {/* Step Indicator - Hidden when hideSteps is true */}
        {!hideSteps && (
          <div className="flex items-center justify-between py-2 sm:py-3 shrink-0">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all ${
                      isCompleted ? "bg-green-500 text-white" : isActive ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-400"
                    }`}>
                      {isCompleted ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <StepIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    </div>
                    <span className={`text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 font-medium ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-3 sm:w-8 h-0.5 mx-0.5 sm:mx-1 mt-[-10px] sm:mt-[-14px] ${currentStep > step.id ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {renderStepContent()}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-gray-100 shrink-0">
          {/* Display validation errors from Zod schema */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mb-3 py-2.5 px-3 border border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <AlertDescription className="text-xs text-red-800 leading-relaxed">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>...and {validationErrors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </div>
            </Alert>
          )}
          {/* Display step-specific errors */}
          {stepError && validationErrors.length === 0 && (
            <Alert variant="destructive" className="mb-3 py-2.5 px-3 border border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <AlertDescription className="text-xs text-red-800">{stepError}</AlertDescription>
              </div>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={(e) => handlePrevious(e)} disabled={currentStep === 1 || isSubmitting} className="flex-1 h-8 sm:h-9 rounded-lg text-[10px] sm:text-xs">
              <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5" /> Back
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={(e) => handleNext(e)} disabled={isSubmitting} className="flex-1 h-8 sm:h-9 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] sm:text-xs">
                Next <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || !termsAccepted} className={`flex-1 h-8 sm:h-9 rounded-lg text-white text-[10px] sm:text-xs ${termsAccepted ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                {isSubmitting ? (<><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</>) : (<><Rocket className="h-3 w-3 mr-1" /> {submitLabel}</>)}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
