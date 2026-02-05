import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings, Mail, Key, Send, CheckCircle2, XCircle, RefreshCw,
  AlertCircle, Server, Shield, TestTube, Eye, EyeOff, Save
} from "lucide-react";


interface EmailSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

const providers = [
  { value: "nodejs", label: "Node.js Server (Recommended)", description: "Uses your existing SMTP config in server/.env" },
  { value: "smtp", label: "Custom SMTP", description: "Configure SMTP settings here" },
  { value: "resend", label: "Resend", description: "Modern email API for developers" },
  { value: "sendgrid", label: "SendGrid", description: "Twilio SendGrid email service" },
  { value: "ses", label: "AWS SES", description: "Amazon Simple Email Service" },
];

export default function EmailSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({ pending: 0, processing: 0, sent: 0, failed: 0 });
  const [systemHealth, setSystemHealth] = useState<"healthy" | "degraded" | "critical">("healthy");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchQueueStats();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*");

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((s: EmailSetting) => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      setSettings(settingsMap);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const { data } = await supabase
        .from("email_queue")
        .select("status")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (data) {
        const stats = {
          pending: data.filter(e => e.status === "pending").length,
          processing: data.filter(e => e.status === "processing").length,
          sent: data.filter(e => e.status === "sent").length,
          failed: data.filter(e => e.status === "failed").length,
        };
        setQueueStats(stats);

        // Determine health
        if (stats.failed > 50) setSystemHealth("critical");
        else if (stats.failed > 10) setSystemHealth("degraded");
        else setSystemHealth("healthy");
      }
    } catch (error) {
      console.error("Error fetching queue stats:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        // Use upsert to insert if not exists, update if exists
        const { error } = await supabase
          .from("email_settings")
          .upsert(
            { 
              setting_key: key, 
              setting_value: value,
              setting_type: key === 'api_key' || key === 'smtp_pass' ? 'secret' : 'string',
              description: getSettingDescription(key),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'setting_key' }
          );
        
        if (error) {
          console.error(`Error saving ${key}:`, error);
          throw error;
        }
      }
      toast({ title: "Success", description: "Settings saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get description for settings
  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      provider: 'Email service provider',
      api_key: 'API key for email provider',
      from_email: 'Default sender email',
      from_name: 'Default sender name',
      reply_to: 'Reply-to email address',
      smtp_host: 'SMTP server hostname',
      smtp_port: 'SMTP server port',
      smtp_user: 'SMTP username',
      smtp_pass: 'SMTP password',
      rate_limit: 'Maximum emails per hour',
      batch_size: 'Emails per batch for bulk sending',
      retry_attempts: 'Maximum retry attempts for failed emails',
      retry_delay: 'Delay in minutes between retries',
    };
    return descriptions[key] || '';
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setTesting(true);
    try {
      // First, save settings to make sure latest config is used
      await handleSave();
      
      // Call the backend API directly to send test email immediately
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || "https://9rx.mahitechnocrafts.in";
      const response = await fetch(`${baseUrl}/api/email/send-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          subject: "🧪 Test Email from 9RX",
          content: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">✅ Test Email Successful!</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
                <p>This is a test email from your 9RX email system.</p>
                <p><strong>Provider:</strong> ${settings.provider || "Not configured"}</p>
                <p><strong>From:</strong> ${settings.from_name || "9RX"} &lt;${settings.from_email || "noreply@9rx.com"}&gt;</p>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px;">If you received this email, your email configuration is working correctly!</p>
              </div>
            </body>
            </html>
          `,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send test email");
      }

      toast({
        title: "Test Email Sent! ✅",
        description: `Email successfully sent to ${testEmail}`,
      });
      setTestDialogOpen(false);
      setTestEmail("");
      fetchQueueStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Settings</h1>
            <p className="text-muted-foreground">Configure your email service provider and settings</p>
          </div>
          <div className="flex flex-col sm:flex sm:flex-col md:flex md:flex-row lg:flex lg:flex-row xl:flex xl:flex-row 2xl:flex 2xl:flex-row  gap-2">
            <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
              <TestTube className="mr-2 h-4 w-4" /> Send Test Email
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {systemHealth === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : systemHealth === "degraded" ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium capitalize">{systemHealth}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">System Status</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{queueStats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{queueStats.sent}</div>
              <p className="text-xs text-muted-foreground">Sent (24h)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
              <p className="text-xs text-muted-foreground">Failed (24h)</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="provider" className="space-y-4">
          <TabsList>
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="sender">Sender Info</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="provider">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" /> Email Provider
                </CardTitle>
                <CardDescription>Choose and configure your email service provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Email Provider</Label>
                  <Select
                    value={settings.provider || "resend"}
                    onValueChange={(value) => updateSetting("provider", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div>
                            <span className="font-medium">{p.label}</span>
                            <span className="text-muted-foreground ml-2">- {p.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Input
                        id="api_key"
                        type={showApiKey ? "text" : "password"}
                        value={settings.api_key || ""}
                        onChange={(e) => updateSetting("api_key", e.target.value)}
                        placeholder="Enter your API key..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings.provider === "resend" && "Get your API key from resend.com/api-keys"}
                    {settings.provider === "sendgrid" && "Get your API key from app.sendgrid.com/settings/api_keys"}
                    {settings.provider === "ses" && "Use your AWS access key with SES permissions"}
                  </p>
                </div>

                {settings.provider === "smtp" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp_host">SMTP Host</Label>
                        <Input
                          id="smtp_host"
                          value={settings.smtp_host || ""}
                          onChange={(e) => updateSetting("smtp_host", e.target.value)}
                          placeholder="smtp.example.com"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_port">SMTP Port</Label>
                        <Input
                          id="smtp_port"
                          value={settings.smtp_port || "587"}
                          onChange={(e) => updateSetting("smtp_port", e.target.value)}
                          placeholder="587"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp_user">SMTP Username</Label>
                        <Input
                          id="smtp_user"
                          value={settings.smtp_user || ""}
                          onChange={(e) => updateSetting("smtp_user", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_pass">SMTP Password</Label>
                        <Input
                          id="smtp_pass"
                          type="password"
                          value={settings.smtp_pass || ""}
                          onChange={(e) => updateSetting("smtp_pass", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="sender">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Sender Information
                </CardTitle>
                <CardDescription>Configure the default sender details for your emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_name">From Name</Label>
                    <Input
                      id="from_name"
                      value={settings.from_name || ""}
                      onChange={(e) => updateSetting("from_name", e.target.value)}
                      placeholder="9RX Pharmacy Supplies"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="from_email">From Email</Label>
                    <Input
                      id="from_email"
                      type="email"
                      value={settings.from_email || ""}
                      onChange={(e) => updateSetting("from_email", e.target.value)}
                      placeholder="noreply@9rx.com"
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reply_to">Reply-To Email</Label>
                  <Input
                    id="reply_to"
                    type="email"
                    value={settings.reply_to || ""}
                    onChange={(e) => updateSetting("reply_to", e.target.value)}
                    placeholder="support@9rx.com"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Where replies to your emails will be sent
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Advanced Settings
                </CardTitle>
                <CardDescription>Configure rate limits and other advanced options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate_limit">Rate Limit (emails/hour)</Label>
                    <Input
                      id="rate_limit"
                      type="number"
                      value={settings.rate_limit || "100"}
                      onChange={(e) => updateSetting("rate_limit", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="batch_size">Batch Size</Label>
                    <Input
                      id="batch_size"
                      type="number"
                      value={settings.batch_size || "50"}
                      onChange={(e) => updateSetting("batch_size", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retry_attempts">Max Retry Attempts</Label>
                    <Input
                      id="retry_attempts"
                      type="number"
                      value={settings.retry_attempts || "3"}
                      onChange={(e) => updateSetting("retry_attempts", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retry_delay">Retry Delay (minutes)</Label>
                    <Input
                      id="retry_delay"
                      type="number"
                      value={settings.retry_delay || "5"}
                      onChange={(e) => updateSetting("retry_delay", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Webhook URLs</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure these URLs in your email provider's dashboard to receive delivery events
                  </p>
                  <div className="space-y-2 bg-muted p-4 rounded-lg font-mono text-sm">
                    <p><strong>Resend:</strong> {window.location.origin}/api/email/webhooks/resend</p>
                    <p><strong>SendGrid:</strong> {window.location.origin}/api/email/webhooks/sendgrid</p>
                    <p><strong>AWS SES:</strong> {window.location.origin}/api/email/webhooks/ses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Email Dialog */}
        <AlertDialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600" />
                Send Test Email
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>Send a test email to verify your configuration is working correctly.</p>
                <div className="space-y-2">
                  <Label htmlFor="test_email">Email Address</Label>
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p><strong>Provider:</strong> {settings.provider || "Not configured"}</p>
                  <p><strong>From:</strong> {settings.from_name || "9RX"} &lt;{settings.from_email || "noreply@9rx.com"}&gt;</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTestEmail}
                disabled={!testEmail || testing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
