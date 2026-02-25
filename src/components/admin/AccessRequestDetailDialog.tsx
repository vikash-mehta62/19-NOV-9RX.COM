import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccessRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name?: string;
  type: string;
  status: string;
  account_status?: string;
  mobile_phone?: string;
  work_phone?: string;
  created_at: string;
  group_id?: string; // Added for group invitation tracking
  billing_address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  shipping_address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  license_number?: string;
  dea_number?: string;
  npi_number?: string;
  tax_id?: string;
}

interface AccessRequestDetailDialogProps {
  request: AccessRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
}

export function AccessRequestDetailDialog({
  request,
  open,
  onOpenChange,
  onStatusUpdate,
}: AccessRequestDetailDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ name: string; email: string } | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const { toast } = useToast();

  // Fetch group and invitation info when dialog opens
  useEffect(() => {
    if (request?.group_id && open) {
      fetchGroupInfo();
      fetchInvitationInfo();
    } else {
      setGroupInfo(null);
      setInvitationInfo(null);
    }
  }, [request?.group_id, request?.id, open]);

  const fetchGroupInfo = async () => {
    if (!request?.group_id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, email, company_name')
        .eq('id', request.group_id)
        .single();

      if (!error && data) {
        setGroupInfo({
          name: data.display_name || data.company_name || `${data.first_name} ${data.last_name}`,
          email: data.email,
        });
      }
    } catch (err) {
      console.error('Error fetching group info:', err);
    }
  };

  const fetchInvitationInfo = async () => {
    if (!request?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('pharmacy_invitations')
        .select('*')
        .eq('accepted_by', request.id)
        .single();

      if (!error && data) {
        setInvitationInfo(data);
      }
    } catch (err) {
      console.error('Error fetching invitation info:', err);
    }
  };

  if (!request) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const formatAddress = (address: any) => {
    if (!address) return null;
    const parts = [
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zip_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleApprove = async () => {
    if (!request?.id) {
      toast({
        title: "Error",
        description: "No user selected. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setActionType("approve");
    try {
      const userId = request.id;
      console.log("Approving user with ID:", userId);
      
      // Use backend API to approve (bypasses RLS with service role)
      const response = await fetch(`/api/users/approve-access/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to approve user");
      }

      console.log("User approved successfully:", result);

      toast({
        title: "✅ User Approved",
        description: `${request.first_name} ${request.last_name} has been granted access. They can now log in.`,
      });

      onStatusUpdate();
      onOpenChange(false);
      setFeedback("");
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!request?.id) {
      toast({
        title: "Error",
        description: "No user selected. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setActionType("reject");
    try {
      const userId = request.id;
      console.log("Rejecting user with ID:", userId);
      
      // Use backend API to reject (bypasses RLS with service role)
      const response = await fetch(`/api/users/reject-access/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: feedback }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to reject user");
      }

      console.log("User rejected successfully:", result);

      toast({
        title: "❌ User Rejected",
        description: `${request.first_name} ${request.last_name}'s request has been rejected.`,
      });

      onStatusUpdate();
      onOpenChange(false);
      setFeedback("");
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      pharmacy: "bg-blue-100 text-blue-800 border-blue-200",
      hospital: "bg-purple-100 text-purple-800 border-purple-200",
      group: "bg-indigo-100 text-indigo-800 border-indigo-200",
      admin: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const billingAddress = formatAddress(request.billing_address);
  const shippingAddress = formatAddress(request.shipping_address);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-orange-200">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-xl font-bold">
                {getInitials(request.first_name, request.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                {request.first_name} {request.last_name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {request.email}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getTypeBadgeColor(request.type)}>
                  {request.type?.charAt(0).toUpperCase() + request.type?.slice(1)}
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-500">Full Name</span>
                  <p className="font-medium">{request.first_name} {request.last_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium">{request.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Mobile Phone</span>
                  <p className="font-medium">{request.mobile_phone || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Work Phone</span>
                  <p className="font-medium">{request.work_phone || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                Business Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-500">Company Name</span>
                  <p className="font-medium">{request.company_name || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Account Type</span>
                  <p className="font-medium capitalize">{request.type}</p>
                </div>
                {request.license_number && (
                  <div className="space-y-1">
                    <span className="text-gray-500">License Number</span>
                    <p className="font-medium">{request.license_number}</p>
                  </div>
                )}
                {request.dea_number && (
                  <div className="space-y-1">
                    <span className="text-gray-500">DEA Number</span>
                    <p className="font-medium">{request.dea_number}</p>
                  </div>
                )}
                {request.npi_number && (
                  <div className="space-y-1">
                    <span className="text-gray-500">NPI Number</span>
                    <p className="font-medium">{request.npi_number}</p>
                  </div>
                )}
                {request.tax_id && (
                  <div className="space-y-1">
                    <span className="text-gray-500">Tax ID</span>
                    <p className="font-medium">{request.tax_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          {(billingAddress || shippingAddress) && (
            <Card className="border-gray-200">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {billingAddress && (
                    <div className="space-y-1">
                      <span className="text-gray-500">Billing Address</span>
                      <p className="font-medium">{billingAddress}</p>
                    </div>
                  )}
                  {shippingAddress && (
                    <div className="space-y-1">
                      <span className="text-gray-500">Shipping Address</span>
                      <p className="font-medium">{shippingAddress}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Group Invitation Info - Show if user came via group invitation */}
          {request.group_id && (groupInfo || invitationInfo) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Group Invitation
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-900 font-medium">
                      This user was invited by a group to join their network
                    </span>
                  </div>
                  {groupInfo && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-blue-700">Group Name</span>
                        <p className="font-medium text-blue-900">{groupInfo.name}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-blue-700">Group Email</span>
                        <p className="font-medium text-blue-900">{groupInfo.email}</p>
                      </div>
                    </div>
                  )}
                  {invitationInfo && (
                    <>
                      {invitationInfo.message && (
                        <div className="space-y-1">
                          <span className="text-blue-700">Invitation Message</span>
                          <p className="font-medium text-blue-900 italic">"{invitationInfo.message}"</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-blue-700">Invited On</span>
                          <p className="font-medium text-blue-900">
                            {format(new Date(invitationInfo.created_at), "PPP")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-blue-700">Accepted On</span>
                          <p className="font-medium text-blue-900">
                            {invitationInfo.accepted_at 
                              ? format(new Date(invitationInfo.accepted_at), "PPP")
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Details */}
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Request Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-500">Requested On</span>
                  <p className="font-medium">
                    {format(new Date(request.created_at), "PPP 'at' p")}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Days Pending</span>
                  <p className="font-medium">
                    {Math.floor(
                      (Date.now() - new Date(request.created_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Admin Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Admin Notes / Rejection Reason
            </Label>
            <Textarea
              id="feedback"
              placeholder="Add notes or provide a reason if rejecting this request..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              Required for rejection. Optional for approval.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="sm:mr-auto"
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting && actionType === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="min-w-[100px] bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting && actionType === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
