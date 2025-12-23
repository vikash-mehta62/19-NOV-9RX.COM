import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  PenTool,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface SentTerms {
  id: string;
  credit_limit: number;
  net_terms: number;
  interest_rate: number;
  terms_version: string;
  custom_message: string | null;
  status: string;
  sent_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  user_signature: string | null;
  user_signed_name: string | null;
  user_signed_title: string | null;
  user_signed_date: string | null;
  rejection_reason: string | null;
}

interface CreditTermsTemplate {
  version: string;
  title: string;
  content: string;
}

interface SendCreditTermsSectionProps {
  userId: string;
  userName?: string;
}

export function SendCreditTermsSection({ userId, userName }: SendCreditTermsSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTermsList, setSentTermsList] = useState<SentTerms[]>([]);
  const [creditTermsTemplate, setCreditTermsTemplate] = useState<CreditTermsTemplate | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<SentTerms | null>(null);

  // Form state
  const [creditLimit, setCreditLimit] = useState("10000");
  const [netTerms, setNetTerms] = useState("30");
  const [interestRate, setInterestRate] = useState("3.00");
  const [customMessage, setCustomMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sent terms history
      const { data: sentTerms } = await supabase
        .from("sent_credit_terms")
        .select("*")
        .eq("user_id", userId)
        .order("sent_at", { ascending: false });

      setSentTermsList(sentTerms || []);

      // Fetch active credit terms template
      const { data: template } = await supabase
        .from("credit_terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (template) setCreditTermsTemplate(template);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTerms = async () => {
    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const adminId = session?.session?.user?.id;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      const { error } = await supabase.from("sent_credit_terms").insert({
        user_id: userId,
        sent_by: adminId,
        credit_limit: parseFloat(creditLimit),
        net_terms: parseInt(netTerms),
        interest_rate: parseFloat(interestRate),
        terms_version: creditTermsTemplate?.version || "1.0",
        custom_message: customMessage || null,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Terms Sent!",
        description: `Credit terms have been sent to ${userName || "the user"} for review and signature.`,
      });

      setShowSendDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error sending terms:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send credit terms",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setCreditLimit("10000");
    setNetTerms("30");
    setInterestRate("3.00");
    setCustomMessage("");
    setExpiresInDays("7");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "viewed":
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />Viewed</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-700"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Credit Terms & Agreements</CardTitle>
              <CardDescription>Send and manage credit terms for this user</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Credit Terms
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Credit Terms for Signature</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Credit Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Credit Limit ($)</Label>
                      <Input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label>Net Terms</Label>
                      <Select value={netTerms} onValueChange={setNetTerms}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">Net 30</SelectItem>
                          <SelectItem value="45">Net 45</SelectItem>
                          <SelectItem value="60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Late Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="3.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Expires In (Days)</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Custom Message (Optional)</Label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a personalized message to include with the terms..."
                      rows={3}
                    />
                  </div>

                  {/* Terms Preview */}
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <p className="font-medium text-sm">Terms Preview</p>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Credit Limit:</span>
                        <span className="font-medium">${parseFloat(creditLimit || "0").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment Terms:</span>
                        <span className="font-medium">Net {netTerms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Late Payment Penalty:</span>
                        <span className="font-medium text-amber-600">{interestRate}% per month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Terms Version:</span>
                        <span className="font-medium">{creditTermsTemplate?.version || "1.0"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        The user will receive these terms and must sign electronically to accept. 
                        Their signature will be stored for reference.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendTerms}
                    disabled={sending || !creditLimit}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Terms
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sentTermsList.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No credit terms sent yet</p>
            <p className="text-sm text-gray-400">
              Send credit terms to this user for review and electronic signature
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent Date</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Net Terms</TableHead>
                <TableHead>Late Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sentTermsList.map((terms) => (
                <TableRow key={terms.id}>
                  <TableCell className="text-sm">
                    {new Date(terms.sent_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${terms.credit_limit?.toLocaleString()}
                  </TableCell>
                  <TableCell>Net {terms.net_terms}</TableCell>
                  <TableCell className="text-amber-600">{terms.interest_rate}%</TableCell>
                  <TableCell>{getStatusBadge(terms.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {terms.expires_at 
                      ? new Date(terms.expires_at).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTerms(terms);
                        setShowViewDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* View Terms Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Credit Terms Details</DialogTitle>
            </DialogHeader>
            {selectedTerms && (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg ${
                  selectedTerms.status === 'accepted' ? 'bg-emerald-50 border border-emerald-200' :
                  selectedTerms.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                  selectedTerms.status === 'expired' ? 'bg-gray-50 border border-gray-200' :
                  'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedTerms.status === 'accepted' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      {selectedTerms.status === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                      {selectedTerms.status === 'pending' && <Clock className="w-5 h-5 text-amber-600" />}
                      {selectedTerms.status === 'viewed' && <Eye className="w-5 h-5 text-blue-600" />}
                      {selectedTerms.status === 'expired' && <Clock className="w-5 h-5 text-gray-600" />}
                      <span className="font-medium capitalize">{selectedTerms.status}</span>
                    </div>
                    {getStatusBadge(selectedTerms.status)}
                  </div>
                </div>

                {/* Terms Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Credit Limit</p>
                    <p className="font-semibold text-lg">${selectedTerms.credit_limit?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Net Terms</p>
                    <p className="font-semibold text-lg">Net {selectedTerms.net_terms}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-600">Late Payment Penalty</p>
                    <p className="font-semibold text-lg text-amber-700">{selectedTerms.interest_rate}% / month</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Terms Version</p>
                    <p className="font-semibold text-lg">{selectedTerms.terms_version}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <h4 className="font-medium">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Sent:</span>
                      <span>{new Date(selectedTerms.sent_at).toLocaleString()}</span>
                    </div>
                    {selectedTerms.viewed_at && (
                      <div className="flex items-center gap-3">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-500">Viewed:</span>
                        <span>{new Date(selectedTerms.viewed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedTerms.responded_at && (
                      <div className="flex items-center gap-3">
                        {selectedTerms.status === 'accepted' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-gray-500">Responded:</span>
                        <span>{new Date(selectedTerms.responded_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedTerms.expires_at && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Expires:</span>
                        <span>{new Date(selectedTerms.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Message */}
                {selectedTerms.custom_message && (
                  <div>
                    <h4 className="font-medium mb-2">Custom Message</h4>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {selectedTerms.custom_message}
                    </div>
                  </div>
                )}

                {/* Signature (if accepted) */}
                {selectedTerms.status === 'accepted' && selectedTerms.user_signature && (
                  <div className="border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <PenTool className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium">User Signature</span>
                      <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="border rounded-lg p-2 bg-white w-48 h-20 flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedTerms.user_signature} 
                          alt="User Signature" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Signed by:</span>
                          <span className="ml-2 font-medium">{selectedTerms.user_signed_name}</span>
                        </div>
                        {selectedTerms.user_signed_title && (
                          <div>
                            <span className="text-gray-500">Title:</span>
                            <span className="ml-2">{selectedTerms.user_signed_title}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-2">
                            {selectedTerms.user_signed_date 
                              ? new Date(selectedTerms.user_signed_date).toLocaleString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedTerms.status === 'rejected' && selectedTerms.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Rejection Reason</h4>
                    <p className="text-sm text-red-700">{selectedTerms.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default SendCreditTermsSection;
