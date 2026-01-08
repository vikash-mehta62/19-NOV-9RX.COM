import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { 
  CreditCard, Users, DollarSign, AlertTriangle, CheckCircle, 
  XCircle, Clock, Loader2, Eye, RefreshCw, Calculator, FileText
} from "lucide-react";
import { EnhancedPaymentTab } from "@/components/users/EnhancedPaymentTab";

const CreditManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [sentTerms, setSentTerms] = useState<any[]>([]);
  const [creditLines, setCreditLines] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [calculatingPenalties, setCalculatingPenalties] = useState(false);

  const [reviewData, setReviewData] = useState({
    status: "",
    approved_amount: "",
    net_terms: "30",
    interest_rate: "3.00",
    rejection_reason: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current user and role from profiles
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      // Fetch pending applications
      const { data: apps, error: appsError } = await supabase
        .from("credit_applications")
        .select("*, profiles:user_id(company_name, email)")
        .order("created_at", { ascending: false });

      if (appsError) console.error("Apps Error:", appsError);
      setApplications(apps || []);

      // Fetch sent credit terms
      const { data: terms, error: termsError } = await supabase
        .from("sent_credit_terms")
        .select("*, profiles:user_id(company_name, email)")
        .order("created_at", { ascending: false });

      if (termsError) console.error("Terms Error:", termsError);
      setSentTerms(terms || []);

      // Fetch active credit lines with profile's credit_used
      const { data: lines, error: linesError } = await supabase
        .from("user_credit_lines")
        .select("*, profiles:user_id(company_name, email, credit_used)")
        .order("created_at", { ascending: false });

      if (linesError) console.error("Lines Error:", linesError);
      
      // Map lines to use profile's credit_used instead of user_credit_lines.used_credit
      const linesWithCorrectUsed = (lines || []).map((line: any) => ({
        ...line,
        used_credit: line.profiles?.credit_used || line.used_credit || 0,
        available_credit: (line.credit_limit || 0) - (line.profiles?.credit_used || line.used_credit || 0),
      }));
      
      setCreditLines(linesWithCorrectUsed);

      // Fetch overdue invoices
      const { data: overdue, error: overdueError } = await supabase
        .from("credit_invoices")
        .select("*, profiles:user_id(company_name, email)")
        .eq("status", "overdue")
        .order("days_overdue", { ascending: false });

      if (overdueError) console.error("Overdue Error:", overdueError);
      setOverdueInvoices(overdue || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewApplication = async () => {
    if (!selectedApplication) return;

    setProcessing(true);
    try {
      // Update application
      const { error: appError } = await supabase
        .from("credit_applications")
        .update({
          status: reviewData.status,
          approved_amount: reviewData.status === "approved" ? parseFloat(reviewData.approved_amount) : null,
          rejection_reason: reviewData.status === "rejected" ? reviewData.rejection_reason : null,
          notes: reviewData.notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (appError) throw appError;

      // If approved, create credit line and send terms
      if (reviewData.status === "approved") {
        // 1. Update Profile (Active) - IMMEDIATE ACTIVATION as per request
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            credit_limit: parseFloat(reviewData.approved_amount),
            payment_terms: `net_${reviewData.net_terms}`,
            credit_days: parseInt(reviewData.net_terms),
            late_payment_fee_percentage: parseFloat(reviewData.interest_rate),
            credit_status: "good", // 'good' is the valid status for active/healthy credit
          })
          .eq("id", selectedApplication.user_id);

        if (profileError) throw profileError;

        // 2. Create or Update Active Credit Line - IMMEDIATE ACTIVATION
        // First check if a credit line exists to preserve used_credit
        const { data: existingLine } = await supabase
          .from("user_credit_lines")
          .select("id, used_credit")
          .eq("user_id", selectedApplication.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const usedCredit = existingLine?.used_credit || 0;
        const newLimit = parseFloat(reviewData.approved_amount);
        const availableCredit = newLimit - usedCredit;

        const creditLineData = {
          user_id: selectedApplication.user_id,
          credit_limit: newLimit,
          available_credit: availableCredit,
          used_credit: usedCredit,
          net_terms: parseInt(reviewData.net_terms),
          interest_rate: parseFloat(reviewData.interest_rate),
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
              net_terms: parseInt(reviewData.net_terms),
              interest_rate: parseFloat(reviewData.interest_rate),
              status: "active"
            })
            .eq("id", existingLine.id);
          lineError = error;
        } else {
          const { error } = await supabase
            .from("user_credit_lines")
            .insert(creditLineData);
          lineError = error;
        }

        if (lineError) throw lineError;

        // 3. Create Sent Credit Terms (marked as accepted since we activated it)
        const { error: termsError } = await supabase
          .from("sent_credit_terms")
          .insert({
            user_id: selectedApplication.user_id,
            credit_limit: parseFloat(reviewData.approved_amount),
            net_terms: parseInt(reviewData.net_terms),
            interest_rate: parseFloat(reviewData.interest_rate),
            terms_version: "1.0",
            status: "accepted", // Auto-accept
            sent_at: new Date().toISOString(),
            responded_at: new Date().toISOString(),
            custom_message: reviewData.notes || "Credit line approved and activated by admin."
          });

        if (termsError) throw termsError;
      }

      toast({
        title: "Application Updated",
        description: `Application has been ${reviewData.status}${reviewData.status === 'approved' ? ' and terms sent' : ''}`,
      });

      setShowReviewDialog(false);
      setSelectedApplication(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const calculatePenalties = async () => {
    setCalculatingPenalties(true);
    try {
      const { error } = await supabase.rpc("calculate_credit_penalties");
      
      if (error) throw error;

      toast({
        title: "Penalties Calculated",
        description: "Late payment penalties have been applied to overdue invoices",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error calculating penalties:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate penalties",
        variant: "destructive",
      });
    } finally {
      setCalculatingPenalties(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "accepted":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "under_review":
      case "viewed":
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />{status === 'viewed' ? 'Viewed' : 'Under Review'}</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-700"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  // Stats
  const pendingCount = applications.filter(a => ["pending", "under_review"].includes(a.status)).length;
  const totalCreditExtended = creditLines.reduce((sum, l) => sum + (l.credit_limit || 0), 0);
  const totalUsedCredit = creditLines.reduce((sum, l) => sum + (l.used_credit || 0), 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credit Management</h1>
            <p className="text-gray-500">Manage credit applications, lines, and penalties</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={calculatePenalties}
              disabled={calculatingPenalties}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {calculatingPenalties ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calculate Penalties
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-600">Total Extended</p>
                  <p className="text-2xl font-bold text-emerald-700">${totalCreditExtended.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">Credit Used</p>
                  <p className="text-2xl font-bold text-blue-700">${totalUsedCredit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-700">${totalOverdue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications">
          <TabsList>
            <TabsTrigger value="applications">
              Applications ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="sent-terms">
              Sent Offers ({sentTerms.length})
            </TabsTrigger>
            <TabsTrigger value="credit-lines">
              Credit Lines ({creditLines.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({overdueInvoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Business</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Requested</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Net Terms</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Status</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Date</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="px-2 lg:px-4">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[150px] lg:max-w-none">{app.business_name || app.profiles?.company_name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[150px] lg:max-w-none">{app.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${app.requested_amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm px-2 lg:px-4 whitespace-nowrap">Net {app.net_terms}</TableCell>
                          <TableCell className="px-2 lg:px-4">{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="text-xs lg:text-sm text-gray-500 px-2 lg:px-4 whitespace-nowrap">
                            {new Date(app.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="px-2 lg:px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs lg:text-sm h-8 px-2 lg:px-3"
                              onClick={() => {
                                setSelectedApplication(app);
                                setReviewData({
                                  status: app.status,
                                  approved_amount: app.requested_amount?.toString() || "",
                                  net_terms: app.net_terms?.toString() || "30",
                                  interest_rate: "3.00",
                                  rejection_reason: app.rejection_reason || "",
                                  notes: app.notes || "",
                                });
                                setShowReviewDialog(true);
                              }}
                            >
                              <Eye className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                              <span className="hidden lg:inline">Review</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Terms Tab */}
          <TabsContent value="sent-terms">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Business</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Offered Amount</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Net Terms</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Status</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Sent Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentTerms.map((term) => (
                        <TableRow key={term.id}>
                          <TableCell className="px-2 lg:px-4">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[150px] lg:max-w-none">{term.profiles?.company_name || "Unknown"}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[150px] lg:max-w-none">{term.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${term.credit_limit?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm px-2 lg:px-4 whitespace-nowrap">Net {term.net_terms}</TableCell>
                          <TableCell className="px-2 lg:px-4">{getStatusBadge(term.status)}</TableCell>
                          <TableCell className="text-xs lg:text-sm text-gray-500 px-2 lg:px-4 whitespace-nowrap">
                            {new Date(term.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Lines Tab */}
          <TabsContent value="credit-lines">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Business</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Credit Limit</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Available</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Used</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap hidden xl:table-cell">Net Terms</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 hidden xl:table-cell">Score</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Status</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="px-2 lg:px-4">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[120px] lg:max-w-none">{line.profiles?.company_name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">{line.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${line.credit_limit?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-emerald-600 text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${line.available_credit?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-amber-600 text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${line.used_credit?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm px-2 lg:px-4 whitespace-nowrap hidden xl:table-cell">Net {line.net_terms}</TableCell>
                          <TableCell className="px-2 lg:px-4 hidden xl:table-cell">
                            <div className="flex items-center gap-1">
                              <div className="w-12 lg:w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${line.payment_score >= 80 ? 'bg-emerald-500' : line.payment_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${line.payment_score}%` }}
                                />
                              </div>
                              <span className="text-xs">{line.payment_score}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 lg:px-4">
                            <Badge className={`text-xs ${line.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {line.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 lg:px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs lg:text-sm h-8 px-2 lg:px-3"
                              onClick={() => {
                                setSelectedUserId(line.user_id);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <FileText className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                              <span className="hidden lg:inline">Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Invoice</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Business</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Original</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4">Penalty</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Balance Due</TableHead>
                        <TableHead className="text-xs lg:text-sm px-2 lg:px-4 whitespace-nowrap">Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="bg-red-50/50">
                          <TableCell className="font-medium text-sm px-2 lg:px-4">{invoice.invoice_number}</TableCell>
                          <TableCell className="px-2 lg:px-4">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[120px] lg:max-w-none">{invoice.profiles?.company_name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">{invoice.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm px-2 lg:px-4 whitespace-nowrap">${invoice.original_amount?.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600 text-sm px-2 lg:px-4 whitespace-nowrap">
                            +${invoice.penalty_amount?.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-red-700 text-sm px-2 lg:px-4 whitespace-nowrap">
                            ${invoice.balance_due?.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-4">
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              {invoice.days_overdue} days
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Credit Application</DialogTitle>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-6">
                {/* Application Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Business Name</p>
                    <p className="font-medium">{selectedApplication.business_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Requested Amount</p>
                    <p className="font-medium">${selectedApplication.requested_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Business Type</p>
                    <p className="font-medium">{selectedApplication.business_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Years in Business</p>
                    <p className="font-medium">{selectedApplication.years_in_business || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Annual Revenue</p>
                    <p className="font-medium">
                      {selectedApplication.annual_revenue 
                        ? `$${selectedApplication.annual_revenue.toLocaleString()}` 
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tax ID</p>
                    <p className="font-medium">{selectedApplication.tax_id || "N/A"}</p>
                  </div>
                </div>

                {/* Bank Information */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Bank Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">Bank Name</p>
                      <p className="font-medium">{selectedApplication.bank_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Account Number</p>
                      <p className="font-medium">{selectedApplication.bank_account_number || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Routing Number</p>
                      <p className="font-medium">{selectedApplication.bank_routing_number || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Trade References */}
                {(selectedApplication.trade_reference_1 || selectedApplication.trade_reference_2) && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Trade References
                    </h3>
                    <div className="space-y-4">
                      {selectedApplication.trade_reference_1 && (
                        <div className="border-b border-purple-200 pb-2 last:border-0 last:pb-0">
                          <p className="font-medium text-purple-900 mb-1">Reference 1</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><span className="text-purple-700">Name:</span> {selectedApplication.trade_reference_1.name}</p>
                            <p><span className="text-purple-700">Phone:</span> {selectedApplication.trade_reference_1.phone}</p>
                            <p><span className="text-purple-700">Email:</span> {selectedApplication.trade_reference_1.email}</p>
                          </div>
                        </div>
                      )}
                      {selectedApplication.trade_reference_2 && (
                        <div className="border-b border-purple-200 pb-2 last:border-0 last:pb-0">
                          <p className="font-medium text-purple-900 mb-1">Reference 2</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><span className="text-purple-700">Name:</span> {selectedApplication.trade_reference_2.name}</p>
                            <p><span className="text-purple-700">Phone:</span> {selectedApplication.trade_reference_2.phone}</p>
                            <p><span className="text-purple-700">Email:</span> {selectedApplication.trade_reference_2.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signature */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Signature & Agreement
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-blue-700">Signed Name</p>
                      <p className="font-medium">{selectedApplication.signed_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Title</p>
                      <p className="font-medium">{selectedApplication.signed_title || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Date Signed</p>
                      <p className="font-medium">
                        {selectedApplication.signed_date 
                          ? new Date(selectedApplication.signed_date).toLocaleDateString() 
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                       <p className="text-sm text-blue-700">IP Address</p>
                       <p className="font-medium">{selectedApplication.ip_address || "N/A"}</p>
                    </div>
                  </div>
                  {selectedApplication.signature && (
                    <div className="mt-4 border-t border-blue-200 pt-4">
                      <p className="text-sm text-blue-700 mb-2">Digital Signature</p>
                      <div className="bg-white p-2 rounded border border-blue-200 inline-block">
                        <img 
                          src={selectedApplication.signature} 
                          alt="User Signature" 
                          className="max-h-24 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Decision */}
                <div className="space-y-4">
                  <div>
                    <Label>Decision</Label>
                    <Select
                      value={reviewData.status}
                      onValueChange={(value) => setReviewData({ ...reviewData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approve</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {reviewData.status === "approved" && (
                    <>
                      <div>
                        <Label>Approved Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            type="number"
                            className="pl-8"
                            value={reviewData.approved_amount}
                            onChange={(e) => setReviewData({ ...reviewData, approved_amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Net Terms</Label>
                          <Select
                            value={reviewData.net_terms}
                            onValueChange={(value) => setReviewData({ ...reviewData, net_terms: value })}
                          >
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
                          <Label>Late Payment Penalty (%)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={reviewData.interest_rate}
                            onChange={(e) => setReviewData({ ...reviewData, interest_rate: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {reviewData.status === "rejected" && (
                    <div>
                      <Label>Rejection Reason</Label>
                      <Textarea
                        value={reviewData.rejection_reason}
                        onChange={(e) => setReviewData({ ...reviewData, rejection_reason: e.target.value })}
                        placeholder="Explain why the application was rejected..."
                      />
                    </div>
                  )}

                  <div>
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={reviewData.notes}
                      onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                      placeholder="Add any internal notes..."
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReviewApplication}
                disabled={processing || !reviewData.status}
                className={reviewData.status === "approved" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : reviewData.status === "approved" ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {reviewData.status === "approved" ? "Approve" : reviewData.status === "rejected" ? "Reject" : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Credit Account Details</DialogTitle>
            </DialogHeader>
            {selectedUserId && <EnhancedPaymentTab userId={selectedUserId} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CreditManagement;
