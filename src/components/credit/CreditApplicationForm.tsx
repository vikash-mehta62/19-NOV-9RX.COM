import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import SignaturePad from "./SignaturePad";
import { 
  CreditCard, Building2, DollarSign, FileText, 
  CheckCircle, AlertCircle, Loader2, Info, Shield,
  ArrowRight, ArrowLeft, PenTool, Check
} from "lucide-react";

interface CreditTerms {
  version: string;
  title: string;
  content: string;
  net_terms_options: number[];
  penalty_rate: number;
}

import { EnhancedPaymentTab } from "@/components/users/EnhancedPaymentTab";

const CreditApplicationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creditTerms, setCreditTerms] = useState<CreditTerms | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [existingCreditLine, setExistingCreditLine] = useState<any>(null);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [signature, setSignature] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [signedTitle, setSignedTitle] = useState("");
  const signedDate = new Date().toLocaleDateString();

  const [formData, setFormData] = useState({
    requested_amount: "",
    net_terms: "30",
    business_name: "",
    business_type: "",
    years_in_business: "",
    annual_revenue: "",
    tax_id: "",
    bank_name: "",
    bank_account_number: "",
    bank_routing_number: "",
    trade_ref_1_name: "",
    trade_ref_1_phone: "",
    trade_ref_1_email: "",
    trade_ref_2_name: "",
    trade_ref_2_phone: "",
    trade_ref_2_email: "",
  });

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    if (!userProfile?.id) return;
    setLoading(true);

    try {
      const { data: terms } = await supabase
        .from("credit_terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (terms) setCreditTerms(terms);

      const { data: application } = await supabase
        .from("credit_applications")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (application) setExistingApplication(application);

      const { data: creditLine } = await supabase
        .from("user_credit_lines")
        .select("*")
        .eq("user_id", userProfile.id)
        .single();

      if (creditLine) setExistingCreditLine(creditLine);

      if (userProfile) {
        setFormData(prev => ({
          ...prev,
          business_name: userProfile.company_name || "",
          tax_id: userProfile.tax_id || "",
        }));
        setSignedName(userProfile.full_name || "");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };


  const validateStep1 = () => {
    if (!formData.requested_amount || parseFloat(formData.requested_amount) < 1000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum credit line request is $1,000.",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.business_name) {
      toast({
        title: "Business Name Required",
        description: "Please enter your business name.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please sign the application to submit.",
        variant: "destructive",
      });
      return false;
    }
    if (!signedName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your printed name.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("credit_applications").insert({
        user_id: userProfile?.id,
        requested_amount: parseFloat(formData.requested_amount),
        net_terms: parseInt(formData.net_terms),
        business_name: formData.business_name,
        business_type: formData.business_type,
        years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
        tax_id: formData.tax_id,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_routing_number: formData.bank_routing_number,
        trade_reference_1: {
          name: formData.trade_ref_1_name,
          phone: formData.trade_ref_1_phone,
          email: formData.trade_ref_1_email,
        },
        trade_reference_2: {
          name: formData.trade_ref_2_name,
          phone: formData.trade_ref_2_phone,
          email: formData.trade_ref_2_email,
        },
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: creditTerms?.version || "1.0",
        signature: signature,
        signed_name: signedName,
        signed_title: signedTitle,
        signed_date: new Date().toISOString(),
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "We'll review your application within 1-2 business days.",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show existing credit line status
  if (existingCreditLine) {
    return <EnhancedPaymentTab userId={userProfile.id} readOnly={true} />;
  }

  // Show pending application status
  if (existingApplication && existingApplication.status !== 'rejected') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              existingApplication.status === 'approved' ? 'bg-blue-100' : 'bg-amber-100'
            }`}>
              {existingApplication.status === 'approved' ? (
                <CheckCircle className="w-6 h-6 text-blue-600" />
              ) : (
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              )}
            </div>
            <div>
              <CardTitle>Application {existingApplication.status === 'approved' ? 'Approved' : 'Under Review'}</CardTitle>
              <CardDescription>
                {existingApplication.status === 'approved' 
                  ? 'Your credit line has been approved!'
                  : 'We are reviewing your application'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Requested Amount</p>
              <p className="text-xl font-bold">${existingApplication.requested_amount?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Net Terms</p>
              <p className="text-xl font-bold">Net {existingApplication.net_terms}</p>
            </div>
          </div>

          {existingApplication.status === 'approved' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Approved Amount</p>
              <p className="text-2xl font-bold text-blue-700">
                ${existingApplication.approved_amount?.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            <span>Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Step indicators
  const steps = [
    { number: 1, title: "Application Info", icon: FileText },
    { number: 2, title: "Review Terms", icon: Shield },
    { number: 3, title: "Sign & Submit", icon: PenTool },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Credit Line</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Get approved for a credit line and enjoy flexible payment terms for your pharmacy orders.
        </p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              currentStep === step.number 
                ? 'bg-blue-600 text-white' 
                : currentStep > step.number 
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {currentStep > step.number ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
              <span className="font-medium hidden sm:inline">{step.title}</span>
              <span className="font-medium sm:hidden">{step.number}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-1 mx-2 rounded ${
                currentStep > step.number ? 'bg-blue-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Benefits (only on step 1) */}
      {currentStep === 1 && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-800">Up to $50,000</h3>
              <p className="text-sm text-blue-600">Credit limit available</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-800">Net 30/45/60</h3>
              <p className="text-sm text-blue-600">Flexible payment terms</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-800">Quick Approval</h3>
              <p className="text-sm text-purple-600">1-2 business days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Application Info */}
      {currentStep === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Credit Request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Credit Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Requested Credit Limit *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    placeholder="10000"
                    className="pl-8"
                    value={formData.requested_amount}
                    onChange={(e) => setFormData({ ...formData, requested_amount: e.target.value })}
                    min="1000"
                    max="50000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Min: $1,000 | Max: $50,000</p>
              </div>

              <div>
                <Label>Preferred Net Terms *</Label>
                <Select
                  value={formData.net_terms}
                  onValueChange={(value) => setFormData({ ...formData, net_terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Net 30 (Due in 30 days)</SelectItem>
                    <SelectItem value="45">Net 45 (Due in 45 days)</SelectItem>
                    <SelectItem value="60">Net 60 (Due in 60 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent_pharmacy">Independent Pharmacy</SelectItem>
                    <SelectItem value="chain_pharmacy">Chain Pharmacy</SelectItem>
                    <SelectItem value="hospital_pharmacy">Hospital Pharmacy</SelectItem>
                    <SelectItem value="compounding_pharmacy">Compounding Pharmacy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Years in Business</Label>
                  <Input
                    type="number"
                    value={formData.years_in_business}
                    onChange={(e) => setFormData({ ...formData, years_in_business: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Annual Revenue</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={formData.annual_revenue}
                    onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Tax ID / EIN</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Bank Information
              </CardTitle>
              <CardDescription>For verification purposes only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  type="password"
                />
              </div>
              <div>
                <Label>Routing Number</Label>
                <Input
                  value={formData.bank_routing_number}
                  onChange={(e) => setFormData({ ...formData, bank_routing_number: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Trade References */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Trade References
              </CardTitle>
              <CardDescription>Provide 2 business references</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Reference 1</p>
                <Input
                  placeholder="Company Name"
                  value={formData.trade_ref_1_name}
                  onChange={(e) => setFormData({ ...formData, trade_ref_1_name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Phone"
                    value={formData.trade_ref_1_phone}
                    onChange={(e) => setFormData({ ...formData, trade_ref_1_phone: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={formData.trade_ref_1_email}
                    onChange={(e) => setFormData({ ...formData, trade_ref_1_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Reference 2</p>
                <Input
                  placeholder="Company Name"
                  value={formData.trade_ref_2_name}
                  onChange={(e) => setFormData({ ...formData, trade_ref_2_name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Phone"
                    value={formData.trade_ref_2_phone}
                    onChange={(e) => setFormData({ ...formData, trade_ref_2_phone: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={formData.trade_ref_2_email}
                    onChange={(e) => setFormData({ ...formData, trade_ref_2_email: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Step 2: Review Terms */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Credit Line Terms and Conditions
            </CardTitle>
            <CardDescription>
              Please review the terms carefully before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Application Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Your Application Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Requested Amount</p>
                  <p className="font-semibold text-blue-600">${parseFloat(formData.requested_amount || "0").toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Terms</p>
                  <p className="font-semibold">Net {formData.net_terms}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business</p>
                  <p className="font-semibold">{formData.business_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Late Penalty</p>
                  <p className="font-semibold text-amber-600">3% / month</p>
                </div>
              </div>
            </div>

            {/* Terms Content */}
            <div className="border rounded-xl">
              <div className="bg-blue-50 px-4 py-3 border-b rounded-t-xl">
                <h3 className="font-semibold text-blue-800">{creditTerms?.title || "Terms and Conditions"}</h3>
              </div>
              <ScrollArea className="h-[400px] p-4">
                <div className="prose prose-sm max-w-none text-gray-700">
                  {creditTerms?.content ? (
                    <div className="space-y-4">
                      {creditTerms.content.split('\n\n').map((paragraph, idx) => {
                        if (paragraph.startsWith('##')) {
                          return <h3 key={idx} className="text-lg font-semibold text-gray-900 mt-4">{paragraph.replace('## ', '').replace('### ', '')}</h3>;
                        }
                        if (paragraph.startsWith('- ')) {
                          return (
                            <ul key={idx} className="list-disc pl-5 space-y-1">
                              {paragraph.split('\n').map((item, i) => (
                                <li key={i}>{item.replace('- ', '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={idx}>{paragraph}</p>;
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">1. Credit Line Agreement</h3>
                      <p>By applying for and using a 9RX Credit Line, you agree to these terms and conditions.</p>
                      
                      <h3 className="text-lg font-semibold">2. Payment Terms</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Net 30: Payment due within 30 days of invoice date</li>
                        <li>Net 45: Payment due within 45 days of invoice date</li>
                        <li>Net 60: Payment due within 60 days of invoice date</li>
                      </ul>
                      
                      <h3 className="text-lg font-semibold">3. Late Payment Penalty</h3>
                      <p>A <span className="font-bold text-amber-600">3% monthly penalty</span> will be applied to any unpaid balance after the due date. Penalties are calculated on the outstanding balance at the end of each 30-day period.</p>
                      
                      <h3 className="text-lg font-semibold">4. Payment Allocation</h3>
                      <p>Payments are first applied to any outstanding penalties, then to the principal balance.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Key Terms Highlight */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Important: Late Payment Penalty</p>
                  <p className="text-sm text-amber-700 mt-1">
                    By proceeding, you acknowledge that a <span className="font-bold">3% monthly penalty</span> will be applied 
                    to any unpaid balance after the due date. For example, a $1,000 overdue balance will incur a $30 penalty each month.
                  </p>
                </div>
              </div>
            </div>

            {/* Accept Terms */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                I have read, understood, and agree to the Credit Line Terms and Conditions, including the 
                <span className="font-semibold text-amber-600"> 3% monthly late payment penalty</span>. 
                I understand that this agreement is legally binding.
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sign & Submit */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-blue-600" />
              Sign Your Application
            </CardTitle>
            <CardDescription>
              Please sign below to complete your credit line application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Final Summary */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-blue-800">Application Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">Requested Credit Limit</p>
                  <p className="font-bold text-lg">${parseFloat(formData.requested_amount || "0").toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-600">Payment Terms</p>
                  <p className="font-bold text-lg">Net {formData.net_terms}</p>
                </div>
                <div>
                  <p className="text-blue-600">Business Name</p>
                  <p className="font-semibold">{formData.business_name}</p>
                </div>
                <div>
                  <p className="text-blue-600">Late Payment Penalty</p>
                  <p className="font-semibold text-amber-600">3% per month</p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Printed Name *</Label>
                  <Input
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label>Title / Position</Label>
                  <Input
                    value={signedTitle}
                    onChange={(e) => setSignedTitle(e.target.value)}
                    placeholder="e.g., Owner, Manager, Pharmacist"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Signature *</Label>
                <SignaturePad onSignatureChange={setSignature} />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                <span>Date: {signedDate}</span>
                {signature && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Check className="w-4 h-4" />
                    Signature captured
                  </span>
                )}
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Electronic Signature Agreement</p>
                  <p className="mt-1">
                    By signing above, I certify that I am authorized to apply for credit on behalf of the business listed, 
                    and I agree that my electronic signature is legally binding and equivalent to my handwritten signature.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 3 ? (
          <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="gap-2 bg-blue-600 hover:bg-blue-700 min-w-[200px]"
            disabled={submitting || !signature || !signedName.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Submit Application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreditApplicationForm;
