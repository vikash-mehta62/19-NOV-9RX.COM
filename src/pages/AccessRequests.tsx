import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Building,
  User,
  Filter,
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AccessRequestDetailDialog } from '@/components/admin/AccessRequestDetailDialog';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_APP_BASE_URL || "https://9rx.mahitechnocrafts.in";

export default function AccessRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  useEffect(() => {
    filterRequests();
  }, [requests, search, typeFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, company_name, type, created_at, status, account_status, mobile_phone, work_phone, billing_address, shipping_address, tax_id, display_name, group_id, rejection_reason')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load access requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (req) =>
          req.email?.toLowerCase().includes(search.toLowerCase()) ||
          req.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          req.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          req.last_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((req) => req.type === typeFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (profileId: string) => {
    try {
      const BASE_URL = import.meta.env.VITE_APP_BASE_URL || "https://9rx.mahitechnocrafts.in";

      const response = await fetch(`${BASE_URL}/api/users/approve-access/${profileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve access');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve access');
      }

      // Send email notification if user has email_notifaction enabled
      if (result.user && result.user.email_notifaction && result.user.email) {
        const userName = result.user.first_name || result.user.company_name || 'User';
        try {
          await axios.post(`${BASE_URL}/active`, {
            name: userName,
            email: result.user.email,
            admin: true // true means account is active
          });
        } catch (emailError) {
          console.error('Error sending activation email:', emailError);
        }
      }

      toast({
        title: 'Access Approved',
        description: 'User has been granted access to the system.',
      });

      loadRequests();
    } catch (error: any) {
      console.error('Error approving access:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve access request.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (profileId: string) => {
    try {
      const BASE_URL = import.meta.env.VITE_APP_BASE_URL || "https://9rx.mahitechnocrafts.in";

      const response = await fetch(`${BASE_URL}/api/users/reject-access/${profileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Rejected by admin' // You can add a reason field to the UI if needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject access');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to reject access');
      }

      toast({
        title: 'Access Rejected',
        description: 'User access request has been rejected.',
      });

      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting access:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject access request.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      pharmacy: 'bg-blue-50 text-blue-700 border-blue-300',
      hospital: 'bg-purple-50 text-purple-700 border-purple-300',
      group: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      admin: 'bg-gray-50 text-gray-700 border-gray-300',
    };

    return (
      <Badge variant="outline" className={colors[type] || 'bg-gray-50 text-gray-700 border-gray-300'}>
        {type}
      </Badge>
    );
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="h-8 w-8 text-orange-600" />
              Access Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-lg px-3 py-1">
                  {pendingCount} Pending
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage user access requests to the system
            </p>
          </div>
          <Button onClick={loadRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{filteredRequests.length}</span>
                <span>requests found</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Access Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No requests found</p>
                <p className="text-muted-foreground">
                  {search || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'All access requests have been processed'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {request.first_name} {request.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {request.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{request.company_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {request.mobile_phone && (
                              <div>Mobile: {request.mobile_phone}</div>
                            )}
                            {request.work_phone && (
                              <div>Work: {request.work_phone}</div>
                            )}
                            {!request.mobile_phone && !request.work_phone && '-'}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(request.type)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(request)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {request.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(request.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className={request.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                                {request.status === 'active' ? 'Approved' : 'Rejected'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Detail Dialog */}
      <AccessRequestDetailDialog
        request={selectedRequest}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onStatusUpdate={loadRequests}
      />
    </DashboardLayout>
  );
}
