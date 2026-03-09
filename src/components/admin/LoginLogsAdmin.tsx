import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Download, RefreshCw, Monitor, Smartphone, Tablet } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginLog {
  _id: string;
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: string;
  status: "success" | "failed" | "blocked";
  failureReason?: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  timestamp: string;
}

interface DashboardStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: string;
  uniqueUsers: number;
  topIPs: Array<{ ipAddress: string; loginCount: number }>;
}

export default function LoginLogsAdmin() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState<string>("");
  const [ipFilter, setIpFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDashboardStats();
    fetchLogs();
  }, [statusFilter, emailFilter, ipFilter, page]);

  const fetchDashboardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login-logs/dashboard?days=7`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please login as admin");
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (emailFilter) {
        params.append("email", emailFilter);
      }
      if (ipFilter) {
        params.append("ipAddress", ipFilter);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login-logs/all?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pagination.pages);
      } else {
        setError(data.message || "Failed to fetch logs");
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load login logs");
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({ limit: "1000" });
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (emailFilter) params.append("email", emailFilter);
      if (ipFilter) params.append("ipAddress", ipFilter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login-logs/all?${params}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      const data = await response.json();
      if (data.success) {
        const csv = convertToCSV(data.logs);
        downloadCSV(csv, `login-logs-${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (err) {
      console.error("Error exporting logs:", err);
    }
  };

  const convertToCSV = (logs: LoginLog[]) => {
    const headers = ["Timestamp", "Email", "Status", "IP Address", "Browser", "OS", "Device", "Failure Reason"];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.email,
      log.status,
      log.ipAddress,
      log.deviceInfo.browser,
      log.deviceInfo.os,
      log.deviceInfo.device,
      log.failureReason || ""
    ]);

    return [headers, ...rows].map(row => row.join(",")).join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Logins</CardDescription>
              <CardTitle className="text-3xl">{stats.totalLogins}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Successful</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.successfulLogins}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.failedLogins}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-3xl">{stats.successRate}%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Login Logs</CardTitle>
              <CardDescription>Monitor all login activity</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-[200px]"
            />

            <Input
              placeholder="Filter by IP..."
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              className="w-[200px]"
            />

            <Button onClick={() => {
              setStatusFilter("all");
              setEmailFilter("");
              setIpFilter("");
              setPage(1);
            }} variant="ghost" size="sm">
              Clear Filters
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No logs found</p>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log._id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50">
                    {getDeviceIcon(log.deviceInfo.device)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>
                          {log.status}
                        </Badge>
                        <span className="text-sm font-medium truncate">{log.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{log.ipAddress}</span>
                        <span>{log.deviceInfo.browser} • {log.deviceInfo.os}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>

                      {log.failureReason && (
                        <div className="mt-1 text-xs text-destructive">{log.failureReason}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                
                <Button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
