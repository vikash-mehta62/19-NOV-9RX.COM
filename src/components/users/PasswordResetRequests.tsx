import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, RefreshCw, Clock, User, Search, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordResetManager } from "./PasswordResetManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  requested_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
    requires_password_reset: boolean;
  };
}

interface GroupedPasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  requested_at: string;
  attemptCount: number;
  profiles?: PasswordResetRequest["profiles"];
}

export const PasswordResetRequests = () => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("password_reset_requests")
        .select(`
          id,
          user_id,
          email,
          requested_at,
          profiles:user_id (
            first_name,
            last_name,
            role,
            requires_password_reset
          )
        `)
        .order("requested_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching password reset requests:", err);
      setError(err.message || "Failed to load password reset requests");
    } finally {
      setLoading(false);
    }
  };

  const groupedRequests = requests.reduce<GroupedPasswordResetRequest[]>((acc, request) => {
    const existingRequest = acc.find((item) => item.user_id === request.user_id);

    if (existingRequest) {
      existingRequest.attemptCount += 1;

      if (new Date(request.requested_at) > new Date(existingRequest.requested_at)) {
        existingRequest.requested_at = request.requested_at;
        existingRequest.id = request.id;
      }

      return acc;
    }

    acc.push({
      ...request,
      attemptCount: 1,
    });

    return acc;
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRefresh = () => {
    fetchRequests();
    toast({
      title: "Refreshed",
      description: "Password reset requests have been refreshed",
    });
  };

  const filteredRequests = groupedRequests
    .filter((request) => {
      const profile = Array.isArray(request.profiles) 
        ? request.profiles[0] 
        : request.profiles;
      const requiresReset = profile?.requires_password_reset ?? true;
      const userName = profile?.first_name || profile?.last_name
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : '';
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        userName.toLowerCase().includes(searchLower) ||
        request.email.toLowerCase().includes(searchLower);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && requiresReset) ||
        (statusFilter === "completed" && !requiresReset);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      const bProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
      const aPending = aProfile?.requires_password_reset ?? true;
      const bPending = bProfile?.requires_password_reset ?? true;

      if (aPending !== bPending) {
        return aPending ? -1 : 1;
      }

      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Password Reset Requests
          </CardTitle>
          <CardDescription>
            Users who attempted to login and need password reset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Password Reset Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CollapsibleTrigger asChild>
              <button className="flex flex-1 items-start gap-3 text-left">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Password Reset Requests
                  </CardTitle>
                  <CardDescription>
                    Users who attempted to login and need password reset ({groupedRequests.length} users)
                  </CardDescription>
                </div>
                <ChevronDown className={`mt-1 h-4 w-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            {isOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: "all" | "pending" | "completed") => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? "No matching requests found" : "No password reset requests yet"}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredRequests.map((request) => {
                  const profile = Array.isArray(request.profiles) 
                    ? request.profiles[0] 
                    : request.profiles;
                  
                  const userName = profile?.first_name || profile?.last_name
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Unknown User';
                  
                  const requiresReset = profile?.requires_password_reset ?? true;

                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          requiresReset ? 'bg-amber-100' : 'bg-green-100'
                        }`}>
                          <User className={`h-5 w-5 ${requiresReset ? 'text-amber-600' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{userName}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {request.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(request.requested_at).toLocaleString()}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {request.attemptCount} {request.attemptCount === 1 ? "attempt" : "attempts"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {requiresReset ? (
                          <>
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Needs Reset
                            </Badge>
                            <PasswordResetManager
                              userId={request.user_id}
                              userEmail={request.email}
                              requiresReset={requiresReset}
                              onResetCleared={fetchRequests}
                            />
                          </>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Reset Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
