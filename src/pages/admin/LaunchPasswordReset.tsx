import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Users,
  Clock,
  Shield,
  FileText,
  Send,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface ResetStats {
  total_emails_sent: number;
  completed: number;
  pending: number;
  password_reset: number;
  terms_accepted: number;
  both_completed: number;
}

interface ResetRecord {
  email: string;
  email_sent_at: string;
  password_reset_at: string | null;
  terms_accepted_at: string | null;
  completed: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export default function LaunchPasswordReset() {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [stats, setStats] = useState<ResetStats | null>(null);
  const [resets, setResets] = useState<ResetRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<"all" | "selected" | "test">("test");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  // Check backend health on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
        const response = await fetch(`${apiBaseUrl}/api/launch/health`, {
          method: "GET",
        });
        
        if (response.ok) {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch (error) {
        console.error("Backend health check failed:", error);
        setBackendStatus("offline");
      }
    };

    checkBackendHealth();
    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
      const response = await fetch(`${apiBaseUrl}/api/launch/reset-stats`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setResets(data.resets);
      } else {
        toast.error(data.error || "Failed to fetch statistics");
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error(error.message || "Failed to fetch statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role")
        .order("email");

      if (error) {
        toast.error("Failed to fetch users");
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const handleSendEmails = async () => {
    if (sendMode === "test" && !testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    if (sendMode === "selected" && selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (sendMode === "all") {
      const confirmed = window.confirm(
        `⚠️ WARNING: This will send password reset emails to ALL ${users.length} users in the database. Are you absolutely sure you want to proceed?`
      );
      if (!confirmed) return;

      const doubleConfirm = window.confirm(
        "This action cannot be undone. Type 'SEND' in the next prompt to confirm."
      );
      if (!doubleConfirm) return;

      const finalConfirm = prompt("Type 'SEND' to confirm:");
      if (finalConfirm !== "SEND") {
        toast.error("Confirmation failed. Operation cancelled.");
        return;
      }
    }

    if (sendMode === "selected") {
      const confirmed = window.confirm(
        `Send password reset emails to ${selectedUsers.length} selected user(s)?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
      const response = await fetch(`${apiBaseUrl}/api/launch/send-reset-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          testMode: sendMode === "test",
          testEmail: sendMode === "test" ? testEmail : null,
          selectedUserIds: sendMode === "selected" ? selectedUsers : null,
          sendToAll: sendMode === "all",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `✅ Email campaign completed!\n` +
          `Sent: ${data.results.sent}\n` +
          `Failed: ${data.results.failed}`
        );
        
        if (data.results.errors.length > 0) {
          console.error("Email errors:", data.results.errors);
        }

        // Refresh stats
        await fetchStats();
        
        // Clear selections
        if (sendMode === "selected") {
          setSelectedUsers([]);
        }
      } else {
        toast.error(data.error || "Failed to send emails");
      }
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error.message || "Failed to send emails");
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = stats
    ? Math.round((stats.completed / stats.total_emails_sent) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Website Launch - Password Reset Campaign</h1>
          <p className="text-muted-foreground">
            Send password reset and T&C acceptance emails to all users for the new website launch
          </p>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Warning</AlertTitle>
          <AlertDescription>
            This will send emails to all users requiring them to reset their password and accept new Terms & Conditions.
            Use test mode first to verify the email template and flow.
          </AlertDescription>
        </Alert>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Emails Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_emails_sent}</div>
                <p className="text-xs text-muted-foreground mt-1">Total campaign emails</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completionPercentage}% completion rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Details */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Campaign Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Password Reset</span>
                  </div>
                  <Badge variant="outline">{stats.password_reset} users</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Terms Accepted</span>
                  </div>
                  <Badge variant="outline">{stats.terms_accepted} users</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="font-bold text-lg">Both Completed</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.both_completed}</div>
              </div>

              <Button
                variant="outline"
                onClick={fetchStats}
                disabled={loadingStats}
                className="w-full"
              >
                {loadingStats ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Statistics
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Send Email Campaign */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Email Campaign
            </CardTitle>
            <CardDescription>
              Configure and send password reset emails to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Send Mode Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Send Mode</Label>
              <Select value={sendMode} onValueChange={(value: any) => setSendMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">Test Mode (Safe)</div>
                        <div className="text-xs text-muted-foreground">Send to single test email</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="selected">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Selected Users</div>
                        <div className="text-xs text-muted-foreground">Send to specific users</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium">All Users (Dangerous)</div>
                        <div className="text-xs text-muted-foreground">Send to everyone</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Test Email Input */}
            {sendMode === "test" && (
              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Email will only be sent to this address in test mode
                </p>
              </div>
            )}

            {/* User Selection */}
            {sendMode === "selected" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select Users ({selectedUsers.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(users.map(u => u.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedUsers(prev =>
                              prev.includes(user.id)
                                ? prev.filter(id => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              setSelectedUsers(prev =>
                                checked
                                  ? [...prev, user.id]
                                  : prev.filter(id => id !== user.id)
                              );
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : 'No Name'}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Users Warning */}
            {sendMode === "all" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>⚠️ Extreme Caution Required</AlertTitle>
                <AlertDescription>
                  This will send emails to ALL {users.length} users in the database. 
                  You will be asked to confirm multiple times before proceeding.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Send Button */}
            <div className="space-y-4">
              {sendMode === "test" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Test Mode Active</AlertTitle>
                  <AlertDescription>
                    Email will only be sent to the test email address you entered above. This is safe to test.
                  </AlertDescription>
                </Alert>
              )}

              {sendMode === "selected" && selectedUsers.length > 0 && (
                <Alert>
                  <Users className="h-4 w-4 text-blue-600" />
                  <AlertTitle>Selected Users Mode</AlertTitle>
                  <AlertDescription>
                    Email will be sent to {selectedUsers.length} selected user(s).
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSendEmails}
                disabled={
                  loading ||
                  (sendMode === "test" && !testEmail) ||
                  (sendMode === "selected" && selectedUsers.length === 0)
                }
                className="w-full"
                size="lg"
                variant={sendMode === "all" ? "destructive" : "default"}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending Emails...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    {sendMode === "test" && "Send Test Email"}
                    {sendMode === "selected" && `Send to ${selectedUsers.length} User(s)`}
                    {sendMode === "all" && `⚠️ Send to ALL ${users.length} Users`}
                  </>
                )}
              </Button>

              {sendMode === "test" && !testEmail && (
                <p className="text-sm text-amber-600 text-center">
                  Please enter a test email address above
                </p>
              )}

              {sendMode === "selected" && selectedUsers.length === 0 && (
                <p className="text-sm text-amber-600 text-center">
                  Please select at least one user above
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Resets Table */}
        {resets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Password Resets</CardTitle>
              <CardDescription>Latest 50 password reset requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Email Sent</th>
                      <th className="text-center p-2">Password Reset</th>
                      <th className="text-center p-2">Terms Accepted</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resets.slice(0, 50).map((reset, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{reset.email}</td>
                        <td className="p-2 text-xs">
                          {new Date(reset.email_sent_at).toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          {reset.password_reset_at ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {reset.terms_accepted_at ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {reset.completed ? (
                            <Badge variant="default" className="bg-green-600">
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
