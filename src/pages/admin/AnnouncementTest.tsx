import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Database, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function AnnouncementTest() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllAnnouncements();
  }, []);

  const fetchAllAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
      console.log("All announcements from DB:", data);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearDismissedAnnouncements = () => {
    localStorage.removeItem("dismissedAnnouncements");
    toast({
      title: "Cleared!",
      description: "Dismissed announcements cleared. Refresh the page to see them again.",
    });
  };

  const checkDismissedAnnouncements = () => {
    const dismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements") || "[]");
    toast({
      title: "Dismissed Announcements",
      description: dismissed.length > 0 
        ? `You have ${dismissed.length} dismissed announcement(s)` 
        : "No dismissed announcements",
    });
    console.log("Dismissed announcement IDs:", dismissed);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const testToast = () => {
    toast({
      title: "Test Toast",
      description: "This is a test toast notification",
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Announcement Testing & Debug</h1>
          <p className="text-muted-foreground">Test and debug announcement display</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={checkDismissedAnnouncements} variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Check Dismissed Count
              </Button>
              
              <Button onClick={clearDismissedAnnouncements} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Dismissed
              </Button>

              <Button onClick={refreshPage}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>

              <Button onClick={testToast} variant="secondary">
                Test Toast
              </Button>

              <Button onClick={fetchAllAnnouncements} variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Reload Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Announcements ({announcements.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground">No announcements in database. Create one first!</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{ann.title}</h3>
                        <p className="text-sm text-muted-foreground">{ann.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${ann.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {ann.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {ann.display_type}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Type: {ann.announcement_type}</div>
                      <div>Audience: {ann.target_audience}</div>
                      <div>Priority: {ann.priority}</div>
                      <div>Dismissible: {ann.is_dismissible ? 'Yes' : 'No'}</div>
                      <div>Start: {ann.start_date ? new Date(ann.start_date).toLocaleString() : 'None'}</div>
                      <div>End: {ann.end_date ? new Date(ann.end_date).toLocaleString() : 'None'}</div>
                    </div>
                    <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                      ID: {ann.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Display Types:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Banner:</strong> Shows at the top of every page</li>
                <li><strong>Popup Modal:</strong> Shows once when page loads (first popup only)</li>
                <li><strong>Toast Notification:</strong> Shows once when page loads (all toasts, staggered by 1 second)</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Testing Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Make sure you have announcements with "Active" = ON</li>
                <li>Set display_type to "popup" or "toast"</li>
                <li>Leave dates empty OR set valid date ranges</li>
                <li>Open browser console (F12) to see debug logs</li>
                <li>Click "Clear Dismissed" button above</li>
                <li>Click "Refresh Page" button</li>
                <li>Check console for: 📢 🔔 🍞 emoji logs</li>
              </ol>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Console Commands:</h4>
              <div className="space-y-1 text-sm text-yellow-800 font-mono">
                <div>localStorage.removeItem("dismissedAnnouncements")</div>
                <div>localStorage.getItem("dismissedAnnouncements")</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
