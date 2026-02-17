import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import {
  Mail,
  Clock,
  MoreVertical,
  XCircle,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface Invitation {
  id: string;
  email: string;
  pharmacy_name: string;
  contact_person: string;
  phone: string;
  message: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}
interface InvitationsListProps {
  onInviteClick?: () => void;
  refreshTrigger?: number;
}

export function InvitationsList({ onInviteClick, refreshTrigger }: InvitationsListProps) {
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.id) {
      fetchInvitations();
    }
  }, [userProfile, refreshTrigger]);

  const fetchInvitations = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pharmacy_invitations")
        .select("*")
        .eq("group_id", userProfile.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Check and update expired invitations
      const now = new Date();
      const updatedInvitations = (data || []).map((inv) => {
        if (inv.status === "pending" && isPast(new Date(inv.expires_at))) {
          // Mark as expired in UI (will update in DB on next action)
          return { ...inv, status: "expired" };
        }
        return inv;
      });

      setInvitations(updatedInvitations);
    } catch (err) {
      console.error("Error fetching invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedInvitation) return;

    try {
      const { error } = await supabase
        .from("pharmacy_invitations")
        .update({ status: "cancelled" })
        .eq("id", selectedInvitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Cancelled",
        description: `Invitation to ${selectedInvitation.email} has been cancelled`,
      });

      setCancelDialogOpen(false);
      setSelectedInvitation(null);
      fetchInvitations();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  const handleResend = async (invitation: Invitation) => {
    try {
      // Update expiry date
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error } = await supabase
        .from("pharmacy_invitations")
        .update({
          status: "pending",
          expires_at: newExpiry.toISOString(),
        })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Resent",
        description: `Invitation to ${invitation.email} has been resent`,
      });

      fetchInvitations();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = async (invitation: Invitation) => {
    const link = `${window.location.origin}/join-group?token=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitation.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Link Copied",
        description: "Invitation link copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = (status: string, expiresAt: string) => {
    const isExpired = isPast(new Date(expiresAt));
    
    if (status === "pending" && isExpired) {
      return {
        label: "Expired",
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      };
    }

    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: {
        label: "Pending",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      accepted: {
        label: "Accepted",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle2,
      },
      expired: {
        label: "Expired",
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      },
      cancelled: {
        label: "Cancelled",
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
      },
    };

    return configs[status] || configs.pending;
  };

  const pendingCount = invitations.filter(
    (i) => i.status === "pending" && !isPast(new Date(i.expires_at))
  ).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Mail className="h-5 w-5 text-blue-600" />
                Invitations
                {pendingCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                    {pendingCount} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Manage pharmacy invitations to your group
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchInvitations}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh invitations</TooltipContent>
              </Tooltip>
              {onInviteClick && (
                <Button 
                  size="sm" 
                  onClick={onInviteClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {invitations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
                <Mail className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No invitations yet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Start building your pharmacy network by sending invitations
              </p>
              {onInviteClick && (
                <Button 
                  className="mt-2 bg-blue-600 hover:bg-blue-700 shadow-lg" 
                  onClick={onInviteClick}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send First Invitation
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Pharmacy</TableHead>
                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Sent</TableHead>
                    <TableHead className="font-semibold text-gray-700">Expires</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const statusConfig = getStatusConfig(
                      invitation.status,
                      invitation.expires_at
                    );
                    const StatusIcon = statusConfig.icon;
                    const isExpired =
                      invitation.status === "pending" &&
                      isPast(new Date(invitation.expires_at));

                    return (
                      <TableRow key={invitation.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">
                              {invitation.pharmacy_name || "-"}
                            </div>
                            {invitation.contact_person && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {invitation.contact_person}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge className={cn(statusConfig.color, "font-medium")}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(invitation.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {invitation.status === "pending" && !isExpired ? (
                            <span className="text-gray-600">
                              {formatDistanceToNow(new Date(invitation.expires_at), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : invitation.status === "accepted" && invitation.accepted_at ? (
                            <span className="text-green-600 font-medium">
                              Accepted {formatDistanceToNow(new Date(invitation.accepted_at), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : invitation.status === "accepted" ? (
                            <span className="text-green-600 font-medium">
                              Accepted
                            </span>
                          ) : isExpired || invitation.status === "expired" ? (
                            <span className="text-red-600 font-medium">
                              Expired {formatDistanceToNow(new Date(invitation.expires_at), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Copy Link - for pending and expired */}
                              {(invitation.status === "pending" || isExpired) && (
                                <DropdownMenuItem
                                  onClick={() => copyInviteLink(invitation)}
                                  className="cursor-pointer"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  {copiedId === invitation.id
                                    ? "Copied!"
                                    : "Copy Link"}
                                </DropdownMenuItem>
                              )}
                              
                              {/* Resend - for expired */}
                              {(invitation.status === "expired" || isExpired) && (
                                <DropdownMenuItem
                                  onClick={() => handleResend(invitation)}
                                  className="cursor-pointer"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Resend
                                </DropdownMenuItem>
                              )}
                              
                              {/* Cancel - for pending */}
                              {invitation.status === "pending" && !isExpired && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvitation(invitation);
                                    setCancelDialogOpen(true);
                                  }}
                                  className="text-red-600 cursor-pointer focus:text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              
                              {/* Copy Email - for accepted */}
                              {invitation.status === "accepted" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(invitation.email);
                                      toast({
                                        title: "Email Copied",
                                        description: "Email address copied to clipboard",
                                      });
                                    } catch {
                                      toast({
                                        title: "Error",
                                        description: "Failed to copy email",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Copy Email
                                </DropdownMenuItem>
                              )}
                              
                              {/* View Details - for all statuses */}
                              <DropdownMenuItem
                                onClick={() => {
                                  toast({
                                    title: "Invitation Details",
                                    description: (
                                      <div className="space-y-1 text-sm mt-2">
                                        <div><strong>Pharmacy:</strong> {invitation.pharmacy_name || "N/A"}</div>
                                        <div><strong>Contact:</strong> {invitation.contact_person || "N/A"}</div>
                                        <div><strong>Phone:</strong> {invitation.phone || "N/A"}</div>
                                        <div><strong>Email:</strong> {invitation.email}</div>
                                        {invitation.message && (
                                          <div><strong>Message:</strong> {invitation.message}</div>
                                        )}
                                      </div>
                                    ),
                                  });
                                }}
                                className="cursor-pointer"
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{" "}
              <strong>{selectedInvitation?.email}</strong>? They will no longer
              be able to use the invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
