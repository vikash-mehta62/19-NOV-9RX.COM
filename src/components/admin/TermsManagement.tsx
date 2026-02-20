import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  FileText, 
  PenTool, 
  Calendar,
  User,
  Building,
  Mail
} from "lucide-react";
import axios from "../../../axiosconfig";

interface UserTermsStatus {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  type: string;
  status: string;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_signature: string | null;
  privacy_policy_accepted: boolean;
  privacy_policy_accepted_at: string | null;
  privacy_policy_signature: string | null;
  ach_authorization_accepted: boolean;
  ach_authorization_accepted_at: string | null;
  ach_authorization_signature: string | null;
  created_at: string;
}

interface UserTermsDetail {
  profile: UserTermsStatus;
  history: Array<{
    id: string;
    terms_type: string;
    terms_version: string;
    accepted_at: string;
    ip_address: string;
    user_agent: string;
    acceptance_method: string;
    digital_signature: string | null;
    signature_method: string | null;
  }>;
}

export const TermsManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserTermsStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserTermsStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserTermsDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchUsersTermsStatus();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsersTermsStatus = async () => {
    try {
      const response = await axios.get("/api/terms-management/users-terms-status");
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch users terms status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setIsDetailLoading(true);
    try {
      const response = await axios.get(`/api/terms-management/user-terms/${userId}`);
      if (response.data.success) {
        setSelectedUser(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch user details",
        variant: "destructive",
      });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const generatePDF = async (userId: string) => {
    try {
      const response = await axios.get(`/api/terms-management/generate-pdf/${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharmacy-profile-${userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF report generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  const getComplianceStatus = (user: UserTermsStatus) => {
    const acceptedCount = [
      user.terms_accepted,
      user.privacy_policy_accepted,
      user.ach_authorization_accepted
    ].filter(Boolean).length;
    
    return {
      count: acceptedCount,
      total: 3,
      percentage: Math.round((acceptedCount / 3) * 100)
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not accepted";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Terms & Conditions Management</h2>
          <p className="text-gray-600">View user terms acceptance status and digital signatures</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const compliance = getComplianceStatus(user);
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {user.first_name} {user.last_name}
                        </h3>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                        <Badge variant="outline">
                          {user.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.company_name && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{user.company_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Terms Status */}
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          {user.terms_accepted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">Terms of Service</span>
                          {user.terms_signature && (
                            <PenTool className="h-3 w-3 text-blue-600" />
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {user.privacy_policy_accepted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">Privacy Policy</span>
                          {user.privacy_policy_signature && (
                            <PenTool className="h-3 w-3 text-blue-600" />
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {user.ach_authorization_accepted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">ACH Authorization</span>
                          {user.ach_authorization_signature && (
                            <PenTool className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                      </div>

                      {/* Compliance Status */}
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Compliance:</span>
                          <Badge 
                            variant={compliance.percentage === 100 ? "default" : compliance.percentage >= 66 ? "secondary" : "destructive"}
                          >
                            {compliance.count}/{compliance.total} ({compliance.percentage}%)
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUserDetails(user.id)}
                      disabled={isDetailLoading}
                    >
                      <User className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(user.id)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Terms Details: {selectedUser.profile.first_name} {selectedUser.profile.last_name}</span>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </CardTitle>
              <CardDescription>
                Complete terms acceptance history and digital signatures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {selectedUser.profile.terms_accepted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Terms of Service</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDate(selectedUser.profile.terms_accepted_at)}
                    </p>
                    {selectedUser.profile.terms_signature && (
                      <div className="flex items-center space-x-2 text-sm">
                        <PenTool className="h-3 w-3 text-blue-600" />
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedUser.profile.terms_signature}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {selectedUser.profile.privacy_policy_accepted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Privacy Policy</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDate(selectedUser.profile.privacy_policy_accepted_at)}
                    </p>
                    {selectedUser.profile.privacy_policy_signature && (
                      <div className="flex items-center space-x-2 text-sm">
                        <PenTool className="h-3 w-3 text-blue-600" />
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedUser.profile.privacy_policy_signature}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {selectedUser.profile.ach_authorization_accepted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>ACH Authorization</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDate(selectedUser.profile.ach_authorization_accepted_at)}
                    </p>
                    {selectedUser.profile.ach_authorization_signature && (
                      <div className="flex items-center space-x-2 text-sm">
                        <PenTool className="h-3 w-3 text-blue-600" />
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedUser.profile.ach_authorization_signature}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Acceptance History */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Acceptance History</h3>
                <div className="space-y-3">
                  {selectedUser.history.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">
                                {record.terms_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                Version {record.terms_version}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(record.accepted_at)}</span>
                              </div>
                              <span>IP: {record.ip_address}</span>
                              <span>Method: {record.acceptance_method}</span>
                            </div>
                            {record.digital_signature && (
                              <div className="flex items-center space-x-2 mt-2">
                                <PenTool className="h-3 w-3 text-blue-600" />
                                <span className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                  Signature: {record.digital_signature}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {record.signature_method}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};