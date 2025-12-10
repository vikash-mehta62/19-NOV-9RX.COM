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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations
                {pendingCount > 0 && (
                  <Badge variant="secondary">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage pharmacy invitations to your group
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchInvitations}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {onInviteClick && (
                <Button size="sm" onClick={onInviteClick}>
                  <Send className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-2">No invitations yet</p>
              <p className="text-sm text-muted-foreground">
                Invite pharmacies to join your group
              </p>
              {onInviteClick && (
                <Button className="mt-4" onClick={onInviteClick}>
                  <Send className="h-4 w-4 mr-2" />
                  Send First Invitation
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invitation.pharmacy_name || "-"}
                            </div>
                            {invitation.contact_person && (
                              <div className="text-xs text-muted-foreground">
                                {invitation.contact_person}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {invitation.status === "pending" && !isExpired ? (
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(invitation.expires_at), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : invitation.status === "accepted" ? (
                            <span className="text-green-600">
                              {format(new Date(invitation.accepted_at), "MMM d, yyyy")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(invitation.status === "pending" || isExpired) && (
                                <DropdownMenuItem
                                  onClick={() => copyInviteLink(invitation)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  {copiedId === invitation.id
                                    ? "Copied!"
                                    : "Copy Link"}
                                </DropdownMenuItem>
                              )}
                              {(invitation.status === "expired" || isExpired) && (
                                <DropdownMenuItem
                                  onClick={() => handleResend(invitation)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Resend
                                </DropdownMenuItem>
                              )}
                              {invitation.status === "pending" && !isExpired && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvitation(invitation);
                                    setCancelDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
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
