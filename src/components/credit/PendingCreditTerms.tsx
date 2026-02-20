import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SignaturePad from "./SignaturePad";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  PenTool,
  DollarSign,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface PendingTerms {
  id: string;
  credit_limit: number;
  net_terms: number;
  interest_rate: number;
  terms_version: string;
  custom_message: string | null;
  status: string;
  sent_at: string;
  expires_at: string | null;
}

interface CreditTermsContent {
  version: string;
  title: string;
  content: string;
}

const PendingCreditTerms = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTerms, setPendingTerms] = useState<PendingTerms | null>(null);
  const [termsContent, setTermsContent] = useState<CreditTermsContent | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  // Signature state
  const [currentStep, setCurrentStep] = useState(1); // 1: Review, 2: Sign
  const [signature, setSignature] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [signedTitle, setSignedTitle] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (userProfile?.id) {
      fetchPendingTerms();
    }
  }, [userProfile]);

  const fetchPendingTerms = async () => {
    setLoading(true);
    try {
      // Fetch pending or viewed terms
      const { data: terms } = await supabase
        .from("sent_credit_terms")
        .select("*")
        .eq("user_id", userProfile?.id)
        .in("status", ["pending", "viewed"])
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (terms) {
        setPendingTerms(terms);
        
        // Mark as viewed if pending
        if (terms.status === "pending") {
          await supabase
            .from("sent_credit_terms")
            .update({ status: "viewed", viewed_at: new Date().toISOString() })
            .eq("id", terms.id);
        }

        // Fetch terms content
        const { data: content, error: termsError } = await supabase
          .from("credit_terms")
          .select("*")
          .eq("version", terms.terms_version)
          .eq("is_active", true)
          .single();

        if (termsError) {
          console.error("Error fetching terms content:", termsError);
          toast({
            title: "Error Loading Terms",
            description: `Could not load terms version ${terms.terms_version}. Please contact support.`,
            variant: "destructive",
          });
        }

        if (content) setTermsContent(content);
      }
    } catch (error) {
      console.error("Error fetching pending terms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!signature || !signedName.trim()) {
      toast({
        title: "Signature Required",
        description: "Please sign and enter your name to accept the terms.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("sent_credit_terms")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
          user_signature: signature,
          user_signed_name: signedName,
          user_signed_title: signedTitle,
          user_signed_date: new Date().toISOString(),
        })
        .eq("id", pendingTerms?.id);

      if (error) throw error;

      // Update profiles with credit details (for EnhancedPaymentTab)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          credit_limit: pendingTerms.credit_limit,
          available_credit: pendingTerms.credit_limit,
          credit_used: 0,
          payment_terms: `net_${pendingTerms.net_terms}`,
          credit_days: pendingTerms.net_terms,
          late_payment_fee_percentage: pendingTerms.interest_rate,
          credit_status: 'good',
        })
        .eq("id", userProfile?.id);

      if (profileError) throw profileError;

      // Create/Update active credit line (for Admin Credit Lines tab)
      // Check for existing line first to avoid duplicates
      const { data: existingLine } = await supabase
        .from("user_credit_lines")
        .select("id, used_credit")
        .eq("user_id", userProfile?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const usedCredit = existingLine?.used_credit || 0;
      const newLimit = pendingTerms.credit_limit;
      const availableCredit = newLimit - usedCredit;

      const creditLineData = {
          user_id: userProfile?.id,
          credit_limit: newLimit,
          available_credit: availableCredit,
          used_credit: usedCredit,
          net_terms: pendingTerms.net_terms,
          interest_rate: pendingTerms.interest_rate,
          status: "active",
          payment_score: 100
      };

      let lineError;

      if (existingLine) {
        const { error } = await supabase
          .from("user_credit_lines")
          .update({
            credit_limit: newLimit,
            available_credit: availableCredit,
            net_terms: pendingTerms.net_terms,
            interest_rate: pendingTerms.interest_rate,
            status: "active"
          })
          .eq("id", existingLine.id);
        lineError = error;
      } else {
        const { error } = await supabase
          .from("user_credit_lines")
          .upsert(creditLineData); // upsert is fine here if we don't have ID, but insert is clearer. upsert without ID = insert.
        lineError = error;
      }

      if (lineError) throw lineError;

      toast({
        title: "Terms Accepted!",
        description: "You have successfully accepted the credit terms. Your credit line is now active.",
      });

      setShowReviewDialog(false);
      setPendingTerms(null);
    } catch (error: any) {
      console.error("Error accepting terms:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTerms = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("sent_credit_terms")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", pendingTerms?.id);

      if (error) throw error;

      toast({
        title: "Terms Declined",
        description: "You have declined the credit terms.",
      });

      setShowRejectDialog(false);
      setPendingTerms(null);
    } catch (error: any) {
      console.error("Error rejecting terms:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline terms",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = pendingTerms?.expires_at && new Date(pendingTerms.expires_at) < new Date();

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!pendingTerms || isExpired) {
    return null; // No pending terms to show
  }

  return (
    <>
      {/* Notification Banner */}
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Credit Terms Awaiting Your Signature</h3>
                <p className="text-sm text-purple-700">
                  You have been offered a ${pendingTerms.credit_limit.toLocaleString()} credit line with Net {pendingTerms.net_terms} terms.
                </p>
                {pendingTerms.expires_at && (
                  <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires: {new Date(pendingTerms.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button 
              onClick={() => setShowReviewDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Review & Sign
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Review & Sign Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 ? "Review Credit Terms" : "Sign Agreement"}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 py-4 border-b">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Review Terms</span>
            </div>
            <div className={`w-12 h-1 rounded ${currentStep >= 2 ? 'bg-purple-400' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Sign</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Step 1: Review Terms */}
            {currentStep === 1 && (
              <div className="space-y-6 p-4">
                {/* Offer Summary */}
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">Your Credit Offer</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-purple-600">Credit Limit</p>
                      <p className="font-bold text-xl text-purple-900">${pendingTerms.credit_limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-600">Payment Terms</p>
                      <p className="font-bold text-xl text-purple-900">Net {pendingTerms.net_terms}</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Late Penalty</p>
                      <p className="font-bold text-xl text-amber-700">{pendingTerms.interest_rate}% / month</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Version</p>
                      <p className="font-bold text-xl text-gray-900">{pendingTerms.terms_version}</p>
                    </div>
                  </div>
                </div>

                {/* Custom Message */}
                {pendingTerms.custom_message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 mb-1">Message from 9RX:</p>
                    <p className="text-sm text-blue-700">{pendingTerms.custom_message}</p>
                  </div>
                )}

                {/* Terms Content */}
                <div className="border rounded-xl">
                  <div className="bg-gray-50 px-4 py-3 border-b rounded-t-xl">
                    <h3 className="font-semibold">{termsContent?.title || "Terms and Conditions"}</h3>
                  </div>
                  <ScrollArea className="h-[300px] p-4">
                    <div className="prose prose-sm max-w-none text-gray-700">
                      {termsContent?.content ? (
                        <div className="space-y-4">
                          {termsContent.content.split('\n\n').map((paragraph, idx) => {
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
                        <p className="text-gray-500">Loading terms content...</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Late Payment Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">Important: Late Payment Penalty</p>
                      <p className="text-sm text-amber-700 mt-1">
                        By accepting these terms, you agree that a <span className="font-bold">{pendingTerms.interest_rate}% monthly penalty</span> will 
                        be applied to any unpaid balance after the due date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Sign */}
            {currentStep === 2 && (
              <div className="space-y-6 p-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Agreement Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-emerald-600">Credit Limit</p>
                      <p className="font-bold">${pendingTerms.credit_limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-emerald-600">Net Terms</p>
                      <p className="font-bold">Net {pendingTerms.net_terms}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Full Name *</Label>
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
                      placeholder="e.g., Owner, Manager"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Your Signature *</Label>
                  <SignaturePad onSignatureChange={setSignature} />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Electronic Signature Agreement</p>
                      <p className="mt-1">
                        By signing above, I certify that I am authorized to enter into this credit agreement 
                        on behalf of my business, and I agree that my electronic signature is legally binding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <div>
                {currentStep === 1 ? (
                  <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                )}
              </div>
              <div>
                {currentStep === 1 ? (
                  <Button onClick={() => setCurrentStep(2)} className="bg-purple-600 hover:bg-purple-700">
                    Continue to Sign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleAcceptTerms}
                    disabled={submitting || !signature || !signedName.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept & Sign
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Credit Terms</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to decline this credit offer? You can provide a reason below (optional).
            </p>
            <div>
              <Label>Reason for Declining (Optional)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Let us know why you're declining..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectTerms}
              disabled={submitting}
              variant="destructive"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline Terms
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingCreditTerms;
