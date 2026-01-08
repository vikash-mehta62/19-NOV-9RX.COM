import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, CheckCircle, Clock, XCircle, CreditCard, 
  Calendar, PenTool, Eye, Loader2, AlertCircle
} from "lucide-react";

interface CreditApplication {
  id: string;
  status: string;
  requested_amount: number;
  approved_amount: number | null;
  net_terms: number;
  terms_accepted: boolean;
  terms_accepted_at: string;
  terms_version: string;
  signature: string | null;
  signed_name: string | null;
  signed_title: string | null;
  signed_date: string | null;
  created_at: string;
  business_name: string;
}

interface CreditTerms {
  version: string;
  title: string;
  content: string;
}

const CreditAgreementSection = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<CreditApplication | null>(null);
  const [creditTerms, setCreditTerms] = useState<CreditTerms | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      fetchCreditData();
    }
  }, [userProfile]);

  const fetchCreditData = async () => {
    setLoading(true);
    try {
      // Fetch latest credit application
      const { data: app } = await supabase
        .from("credit_applications")
        .select("*")
        .eq("user_id", userProfile?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (app) {
        setApplication(app);

        // Fetch the terms version they agreed to
        const { data: terms } = await supabase
          .from("credit_terms")
          .select("*")
          .eq("version", app.terms_version)
          .single();

        if (terms) setCreditTerms(terms);
      }
    } catch (error) {
      console.error("Error fetching credit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Credit Agreement
          </CardTitle>
          <CardDescription>No credit application found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">You haven't applied for a credit line yet.</p>
            <Button variant="outline" asChild>
              <a href="/pharmacy/credit">Apply for Credit Line</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Credit Agreement</CardTitle>
              <CardDescription>Your signed credit line agreement</CardDescription>
            </div>
          </div>
          {getStatusBadge(application.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agreement Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Requested Amount</p>
            <p className="font-semibold text-lg">${application.requested_amount?.toLocaleString()}</p>
          </div>
          {application.approved_amount && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-emerald-600">Approved Amount</p>
              <p className="font-semibold text-lg text-emerald-700">${application.approved_amount?.toLocaleString()}</p>
            </div>
          )}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Net Terms</p>
            <p className="font-semibold text-lg text-blue-700">Net {application.net_terms}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600">Late Penalty</p>
            <p className="font-semibold text-lg text-amber-700">3% / month</p>
          </div>
        </div>

        {/* Terms Accepted Info */}
        {application.terms_accepted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-800">Terms & Conditions Accepted</p>
                <p className="text-sm text-blue-700 mt-1">
                  You agreed to the Credit Line Terms and Conditions (Version {application.terms_version}) 
                  on {new Date(application.terms_accepted_at).toLocaleDateString()} at {new Date(application.terms_accepted_at).toLocaleTimeString()}
                </p>
                <Dialog open={showTerms} onOpenChange={setShowTerms}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-blue-700 p-0 h-auto mt-2">
                      <Eye className="w-4 h-4 mr-1" />
                      View Full Terms
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{creditTerms?.title || "Terms and Conditions"}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
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
                          <p className="text-gray-500">Terms content not available.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        )}

        {/* Signature Section */}
        {application.signature && (
          <div className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Electronic Signature</span>
              </div>
              <Dialog open={showSignature} onOpenChange={setShowSignature}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    View Full Signature
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Your Signature</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-white">
                      <img 
                        src={application.signature} 
                        alt="Signature" 
                        className="max-w-full h-auto"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Signed By</p>
                        <p className="font-medium">{application.signed_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Title</p>
                        <p className="font-medium">{application.signed_title || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date Signed</p>
                        <p className="font-medium">
                          {application.signed_date 
                            ? new Date(application.signed_date).toLocaleDateString()
                            : new Date(application.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Business</p>
                        <p className="font-medium">{application.business_name}</p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center gap-6">
              {/* Signature Preview */}
              <div className="border rounded-lg p-2 bg-gray-50 w-48 h-20 flex items-center justify-center overflow-hidden">
                <img 
                  src={application.signature} 
                  alt="Signature" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Signature Details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Signed by:</span>
                  <span className="font-medium">{application.signed_name}</span>
                </div>
                {application.signed_title && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Title:</span>
                    <span className="font-medium">{application.signed_title}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {application.signed_date 
                      ? new Date(application.signed_date).toLocaleDateString()
                      : new Date(application.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Late Payment Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Late Payment Penalty Reminder</p>
              <p className="text-sm text-amber-700 mt-1">
                As per your signed agreement, a 3% monthly penalty will be applied to any unpaid balance after the due date.
              </p>
            </div>
          </div>
        </div>

        {/* Application Date */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
          <span>Application submitted: {new Date(application.created_at).toLocaleDateString()}</span>
          <Button variant="ghost" size="sm" asChild>
            <a href="/pharmacy/credit">
              <CreditCard className="w-4 h-4 mr-1" />
              View Credit Account
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditAgreementSection;
