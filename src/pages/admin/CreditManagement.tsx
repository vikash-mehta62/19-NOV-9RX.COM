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
  XCircle, Clock, Loader2, Eye, RefreshCw, Calculator
} from "lucide-react";

const CreditManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [creditLines, setCreditLines] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
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
      // Fetch pending applications
      const { data: apps } = await supabase
        .from("credit_applications")
        .select("*, profiles(company_name, email)")
        .order("created_at", { ascending: false });

      setApplications(apps || []);

      // Fetch active credit lines
      const { data: lines } = await supabase
        .from("user_credit_lines")
        .select("*, profiles(company_name, email)")
        .order("created_at", { ascending: false });

      setCreditLines(lines || []);

      // Fetch overdue invoices
      const { data: overdue } = await supabase
        .from("credit_invoices")
        .select("*, profiles(company_name, email)")
        .eq("status", "overdue")
        .order("days_overdue", { ascending: false });

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

      // If approved, create credit line
      if (reviewData.status === "approved") {
        const { error: lineError } = await supabase
          .from("user_credit_lines")
          .upsert({
            user_id: selectedApplication.user_id,
            credit_limit: parseFloat(reviewData.approved_amount),
            available_credit: parseFloat(reviewData.approved_amount),
            used_credit: 0,
            net_terms: parseInt(reviewData.net_terms),
            interest_rate: parseFloat(reviewData.interest_rate),
            status: "active",
          });

        if (lineError) throw lineError;
      }

      toast({
        title: "Application Updated",
        description: `Application has been ${reviewData.status}`,
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
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  // Stats
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const totalCreditExtended = creditLines.reduce((sum, l) => sum + (l.credit_limit || 0), 0);
  const totalUsedCredit = creditLines.reduce((sum, l) => sum + (l.used_credit || 0), 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Net Terms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.business_name || app.profiles?.company_name}</p>
                            <p className="text-sm text-gray-500">{app.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${app.requested_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>Net {app.net_terms}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
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
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Lines Tab */}
          <TabsContent value="credit-lines">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Net Terms</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{line.profiles?.company_name}</p>
                            <p className="text-sm text-gray-500">{line.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${line.credit_limit?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-emerald-600">
                          ${line.available_credit?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-amber-600">
                          ${line.used_credit?.toLocaleString()}
                        </TableCell>
                        <TableCell>Net {line.net_terms}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${line.payment_score >= 80 ? 'bg-emerald-500' : line.payment_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${line.payment_score}%` }}
                              />
                            </div>
                            <span className="text-sm">{line.payment_score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={line.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {line.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead>Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="bg-red-50/50">
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.profiles?.company_name}</p>
                            <p className="text-sm text-gray-500">{invoice.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>${invoice.original_amount?.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          +${invoice.penalty_amount?.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-bold text-red-700">
                          ${invoice.balance_due?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-700">
                            {invoice.days_overdue} days
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
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
                className={reviewData.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
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
      </div>
    </DashboardLayout>
  );
};

export default CreditManagement;
