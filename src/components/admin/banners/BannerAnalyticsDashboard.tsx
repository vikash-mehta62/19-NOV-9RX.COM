import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, TrendingUp, Eye, MousePointerClick, Users, Smartphone,
  Monitor, Tablet, Calendar as CalendarIcon, Download, RefreshCw,
  Target, TestTube, Trophy, AlertCircle
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

interface BannerAnalytics {
  banner_id: string;
  banner_title: string;
  date: string;
  total_views: number;
  total_clicks: number;
  ctr: number;
  user_type: string;
  device_type: string;
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

interface BannerAnalyticsDashboardProps {
  bannerId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const BannerAnalyticsDashboard = ({ bannerId }: BannerAnalyticsDashboardProps) => {
  const [analytics, setAnalytics] = useState<BannerAnalytics[]>([]);
  const [abTests, setAbTests] = useState<ABTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedBanner, setSelectedBanner] = useState<string>(bannerId || "all");
  const [banners, setBanners] = useState<Array<{id: string, title: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
    fetchAnalytics();
    fetchABTests();
  }, [dateRange, selectedBanner]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("id, title")
        .order("title");
      
      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      console.error("Error fetching banners:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Try to use the RPC function first
      const { data, error } = await supabase.rpc("get_banner_analytics", {
        p_banner_id: selectedBanner === "all" ? null : selectedBanner,
        p_start_date: format(dateRange.from, "yyyy-MM-dd"),
        p_end_date: format(dateRange.to, "yyyy-MM-dd")
      });

      if (error) {
        // If RPC fails, fallback to direct query from banners table
        console.warn("RPC not available, using fallback:", error.message);
        
        let query = supabase
          .from("banners")
          .select("id, title, view_count, click_count, created_at");
        
        if (selectedBanner !== "all") {
          query = query.eq("id", selectedBanner);
        }
        
        const { data: fallbackData, error: fallbackError } = await query;
        
        if (fallbackError) throw fallbackError;
        
        // Transform to expected format
        const transformedData = (fallbackData || []).map(banner => ({
          banner_id: banner.id,
          banner_title: banner.title,
          date: format(new Date(), "yyyy-MM-dd"),
          total_views: banner.view_count || 0,
          total_clicks: banner.click_count || 0,
          ctr: banner.view_count > 0 ? ((banner.click_count || 0) / banner.view_count) * 100 : 0,
          user_type: "all",
          device_type: "all"
        }));
        
        setAnalytics(transformedData);
        return;
      }

      setAnalytics(data || []);
    } catch (error: any) {
      console.error("Analytics fetch error:", error);
      // Don't show error toast for missing functions - just show empty state
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchABTests = async () => {
    try {
      const { data: tests, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn("A/B tests table not available:", error.message);
        setAbTests([]);
        return;
      }

      // Fetch results for each test
      const testResults = await Promise.all(
        (tests || []).map(async (test) => {
          try {
            const { data: result } = await supabase.rpc("get_ab_test_results", {
              p_test_id: test.id
            });
            return result?.[0];
          } catch {
            return null;
          }
        })
      );

      setAbTests(testResults.filter(Boolean));
    } catch (error: any) {
      console.error("Error fetching A/B tests:", error);
      setAbTests([]);
    }
  };

  // Aggregate data for charts
  const chartData = analytics.reduce((acc, item) => {
    const date = item.date;
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      existing.views += item.total_views;
      existing.clicks += item.total_clicks;
    } else {
      acc.push({
        date,
        views: item.total_views,
        clicks: item.total_clicks,
        ctr: item.total_views > 0 ? (item.total_clicks / item.total_views) * 100 : 0
      });
    }
    
    return acc;
  }, [] as Array<{date: string, views: number, clicks: number, ctr: number}>)
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Device breakdown
  const deviceData = analytics.reduce((acc, item) => {
    const device = item.device_type || 'desktop';
    const existing = acc.find(d => d.name === device);
    
    if (existing) {
      existing.value += item.total_views;
    } else {
      acc.push({ name: device, value: item.total_views });
    }
    
    return acc;
  }, [] as Array<{name: string, value: number}>);

  // User type breakdown
  const userTypeData = analytics.reduce((acc, item) => {
    const userType = item.user_type || 'guest';
    const existing = acc.find(d => d.name === userType);
    
    if (existing) {
      existing.value += item.total_views;
    } else {
      acc.push({ name: userType, value: item.total_views });
    }
    
    return acc;
  }, [] as Array<{name: string, value: number}>);

  // Calculate totals
  const totals = analytics.reduce((acc, item) => ({
    views: acc.views + item.total_views,
    clicks: acc.clicks + item.total_clicks
  }), { views: 0, clicks: 0 });

  const overallCTR = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;

  const exportData = () => {
    const csvContent = [
      ["Date", "Banner", "Views", "Clicks", "CTR", "User Type", "Device"],
      ...analytics.map(item => [
        item.date,
        item.banner_title,
        item.total_views,
        item.total_clicks,
        `${item.ctr}%`,
        item.user_type,
        item.device_type
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banner-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Banner Analytics
          </h2>
          <p className="text-muted-foreground">Track performance metrics and optimize your banners</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Banner Filter */}
          <Select value={selectedBanner} onValueChange={setSelectedBanner}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select banner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Banners</SelectItem>
              {banners.map(banner => (
                <SelectItem key={banner.id} value={banner.id}>
                  {banner.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: subDays(new Date(), 7),
                      to: new Date()
                    })}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: subDays(new Date(), 30),
                      to: new Date()
                    })}
                  >
                    Last 30 days
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{totals.views.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
                <p className="text-2xl font-bold">{overallCTR.toFixed(2)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active A/B Tests</p>
                <p className="text-2xl font-bold">{abTests.length}</p>
              </div>
              <TestTube className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="abtests">A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Views & Clicks Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                    <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="Clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Click-Through Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "CTR"]} />
                    <Line type="monotone" dataKey="ctr" stroke="#ff7300" name="CTR %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          {/* Audience Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Views by Device Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Views by User Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="abtests" className="space-y-4">
          {/* A/B Test Results */}
          {abTests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Active A/B Tests</h3>
                  <p className="text-muted-foreground mt-1">
                    Create A/B tests to compare banner performance
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {abTests.map((test, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        {test.test_name}
                      </CardTitle>
                      <Badge variant={test.statistical_significance >= 95 ? "default" : "secondary"}>
                        {test.statistical_significance}% Confidence
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Banner A */}
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          Banner A: {test.banner_a_title}
                          {test.banner_a_ctr > test.banner_b_ctr && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-medium">{test.banner_a_views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-medium">{test.banner_a_clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CTR</p>
                            <p className="font-medium">{test.banner_a_ctr.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Banner B */}
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          Banner B: {test.banner_b_title}
                          {test.banner_b_ctr > test.banner_a_ctr && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-medium">{test.banner_b_views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-medium">{test.banner_b_clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CTR</p>
                            <p className="font-medium">{test.banner_b_ctr.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Comparison */}
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        {test.statistical_significance >= 95 ? (
                          <>
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              Banner {test.banner_a_ctr > test.banner_b_ctr ? 'A' : 'B'} is winning with {Math.abs(test.banner_a_ctr - test.banner_b_ctr).toFixed(2)}% higher CTR
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span>Test needs more data for statistical significance</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};