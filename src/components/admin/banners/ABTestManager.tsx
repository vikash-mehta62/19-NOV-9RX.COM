import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  TestTube, Plus, Play, Pause, Square, Trophy, AlertCircle,
  TrendingUp, Eye, MousePointerClick, Calendar, Trash2, Pencil
} from "lucide-react";
import { format } from "date-fns";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  is_active: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  banner_a_id: string;
  banner_b_id: string;
  traffic_split: number;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  winner: 'A' | 'B' | null;
  confidence_level: number | null;
  created_at: string;
}

interface ABTestResult {
  test_name: string;
  banner_a_title: string;
  banner_b_title: string;
  banner_a_views: number;
  banner_a_clicks: number;
  banner_a_ctr: number;
  banner_b_views: number;
  banner_b_clicks: number;
  banner_b_ctr: number;
  statistical_significance: number;
}

const initialFormState = {
  name: "",
  description: "",
  banner_a_id: "",
  banner_b_id: "",
  traffic_split: 0.5,
  start_date: "",
  end_date: "",
};

export const ABTestManager = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [testResults, setTestResults] = useState<Record<string, ABTestResult>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
    fetchBanners();
  }, []);

  useEffect(() => {
    if (tests.length > 0) {
      fetchTestResults();
    }
  }, [tests]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn("A/B tests table not available:", error.message);
        setTests([]);
        return;
      }
      setTests(data || []);
    } catch (error: any) {
      console.error("Error fetching tests:", error);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("id, title, image_url, is_active")
        .eq("is_active", true)
        .order("title");

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      console.error("Error fetching banners:", error);
    }
  };

  const fetchTestResults = async () => {
    try {
      const results: Record<string, ABTestResult> = {};
      
      for (const test of tests) {
        if (test.status === 'running' || test.status === 'completed') {
          try {
            const { data } = await supabase.rpc("get_ab_test_results", {
              p_test_id: test.id
            });
            
            if (data && data[0]) {
              results[test.id] = data[0];
            }
          } catch {
            // RPC might not exist
            console.warn("get_ab_test_results RPC not available");
          }
        }
      }
      
      setTestResults(results);
    } catch (error: any) {
      console.error("Error fetching test results:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.banner_a_id === formData.banner_b_id) {
      toast({
        title: "Error",
        description: "Please select different banners for A and B variants",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        banner_a_id: formData.banner_a_id,
        banner_b_id: formData.banner_b_id,
        traffic_split: formData.traffic_split,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: 'draft' as const,
      };

      if (editingTest) {
        const { error } = await supabase
          .from("ab_tests")
          .update(payload)
          .eq("id", editingTest.id);
        if (error) throw error;
        
        // Update banner links
        await linkBannersToTest(editingTest.id, formData.banner_a_id, formData.banner_b_id);
        
        toast({ title: "Success", description: "A/B test updated successfully" });
      } else {
        const { data: newTest, error } = await supabase
          .from("ab_tests")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        
        // Link banners to the new test
        if (newTest) {
          await linkBannersToTest(newTest.id, formData.banner_a_id, formData.banner_b_id);
        }
        
        toast({ title: "Success", description: "A/B test created successfully" });
      }

      setDialogOpen(false);
      setEditingTest(null);
      setFormData(initialFormState);
      fetchTests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (test: ABTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      description: test.description || "",
      banner_a_id: test.banner_a_id,
      banner_b_id: test.banner_b_id,
      traffic_split: test.traffic_split,
      start_date: test.start_date ? test.start_date.split("T")[0] : "",
      end_date: test.end_date ? test.end_date.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setTestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!testToDelete) return;
    
    try {
      // Unlink banners first
      await unlinkBannersFromTest(testToDelete);
      
      const { error } = await supabase.from("ab_tests").delete().eq("id", testToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "A/B test deleted successfully" });
      fetchTests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  };

  // Link banners to A/B test
  const linkBannersToTest = async (testId: string, bannerAId: string, bannerBId: string) => {
    try {
      // Update banner A
      await supabase
        .from("banners")
        .update({ ab_test_id: testId, ab_test_group: 'A' })
        .eq("id", bannerAId);
      
      // Update banner B
      await supabase
        .from("banners")
        .update({ ab_test_id: testId, ab_test_group: 'B' })
        .eq("id", bannerBId);
    } catch (error: any) {
      console.error("Error linking banners to test:", error);
    }
  };

  // Unlink banners from A/B test
  const unlinkBannersFromTest = async (testId: string) => {
    try {
      await supabase
        .from("banners")
        .update({ ab_test_id: null, ab_test_group: 'A' })
        .eq("ab_test_id", testId);
    } catch (error: any) {
      console.error("Error unlinking banners from test:", error);
    }
  };

  const updateTestStatus = async (id: string, status: ABTest['status']) => {
    try {
      const { error } = await supabase
        .from("ab_tests")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
      
      // If completing the test, unlink banners
      if (status === 'completed') {
        await unlinkBannersFromTest(id);
      }
      
      const statusMessages = {
        running: "A/B test started",
        paused: "A/B test paused",
        completed: "A/B test completed"
      };
      
      toast({ title: "Success", description: statusMessages[status] });
      fetchTests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const declareWinner = async (testId: string, winner: 'A' | 'B') => {
    try {
      const { error } = await supabase
        .from("ab_tests")
        .update({ 
          winner,
          status: 'completed',
          confidence_level: 95 // Simplified - in real app, calculate this
        })
        .eq("id", testId);
      
      if (error) throw error;
      toast({ title: "Success", description: `Banner ${winner} declared as winner!` });
      fetchTests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openNewDialog = () => {
    setEditingTest(null);
    setFormData(initialFormState);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: ABTest['status']) => {
    const configs = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      running: { color: "bg-green-100 text-green-800", label: "Running" },
      paused: { color: "bg-yellow-100 text-yellow-800", label: "Paused" },
      completed: { color: "bg-blue-100 text-blue-800", label: "Completed" }
    };
    
    const config = configs[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getBannerTitle = (bannerId: string) => {
    const banner = banners.find(b => b.id === bannerId);
    return banner?.title || "Unknown Banner";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-purple-600" />
            A/B Test Manager
          </h2>
          <p className="text-muted-foreground">Compare banner performance and optimize conversions</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" /> Create A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTest ? "Edit A/B Test" : "Create New A/B Test"}</DialogTitle>
              <DialogDescription>
                Compare two banner variants to see which performs better
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Test Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Hero Banner Summer Sale Test"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Testing different call-to-action buttons..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="banner_a">Banner A (Control) *</Label>
                  <Select
                    value={formData.banner_a_id}
                    onValueChange={(value) => setFormData({ ...formData, banner_a_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Banner A" />
                    </SelectTrigger>
                    <SelectContent>
                      {banners.map(banner => (
                        <SelectItem key={banner.id} value={banner.id}>
                          {banner.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="banner_b">Banner B (Variant) *</Label>
                  <Select
                    value={formData.banner_b_id}
                    onValueChange={(value) => setFormData({ ...formData, banner_b_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Banner B" />
                    </SelectTrigger>
                    <SelectContent>
                      {banners.map(banner => (
                        <SelectItem key={banner.id} value={banner.id}>
                          {banner.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="traffic_split">Traffic Split</Label>
                  <div className="space-y-2">
                    <Input
                      id="traffic_split"
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={formData.traffic_split}
                      onChange={(e) => setFormData({ ...formData, traffic_split: parseFloat(e.target.value) })}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>A: {Math.round((1 - formData.traffic_split) * 100)}%</span>
                      <span>B: {Math.round(formData.traffic_split * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTest ? "Update" : "Create"} A/B Test
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <TestTube className="h-8 w-8 animate-pulse mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading A/B tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No A/B Tests</h3>
              <p className="text-muted-foreground mt-1">
                Create your first A/B test to start optimizing banner performance
              </p>
              <Button className="mt-4" onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" /> Create A/B Test
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Banners</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const result = testResults[test.id];
                  const isRunning = test.status === 'running';
                  const canStart = test.status === 'draft';
                  const canPause = test.status === 'running';
                  const canComplete = test.status === 'running' && result;

                  return (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.name}</p>
                          {test.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {test.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">A</Badge>
                            <span>{getBannerTitle(test.banner_a_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">B</Badge>
                            <span>{getBannerTitle(test.banner_b_id)}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(test.status)}
                      </TableCell>

                      <TableCell>
                        {result ? (
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-4 text-center">A:</span>
                              <Eye className="h-3 w-3" />
                              <span>{result.banner_a_views.toLocaleString()}</span>
                              <MousePointerClick className="h-3 w-3" />
                              <span>{result.banner_a_clicks.toLocaleString()}</span>
                              <span className="text-muted-foreground">({result.banner_a_ctr.toFixed(2)}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-4 text-center">B:</span>
                              <Eye className="h-3 w-3" />
                              <span>{result.banner_b_views.toLocaleString()}</span>
                              <MousePointerClick className="h-3 w-3" />
                              <span>{result.banner_b_clicks.toLocaleString()}</span>
                              <span className="text-muted-foreground">({result.banner_b_ctr.toFixed(2)}%)</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No data yet</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(test.start_date), "MMM d")}</span>
                            {test.end_date && (
                              <>
                                <span>-</span>
                                <span>{format(new Date(test.end_date), "MMM d")}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {test.winner ? (
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <Badge variant="default">Banner {test.winner}</Badge>
                          </div>
                        ) : result && result.statistical_significance >= 95 ? (
                          <div className="space-y-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declareWinner(test.id, result.banner_a_ctr > result.banner_b_ctr ? 'A' : 'B')}
                            >
                              <Trophy className="h-3 w-3 mr-1" />
                              Declare Winner
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {result ? "Need more data" : "Not started"}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canStart && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateTestStatus(test.id, 'running')}
                              title="Start Test"
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {canPause && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateTestStatus(test.id, 'paused')}
                              title="Pause Test"
                            >
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          {canComplete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateTestStatus(test.id, 'completed')}
                              title="Complete Test"
                            >
                              <Square className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(test)}
                            title="Edit"
                            disabled={isRunning}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(test.id)}
                            title="Delete"
                            disabled={isRunning}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete A/B Test
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this A/B test?</p>
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone. All test data and results will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};