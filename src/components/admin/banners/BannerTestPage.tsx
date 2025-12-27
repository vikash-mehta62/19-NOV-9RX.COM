import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BannerSlider } from "@/components/pharmacy/components/BannerSlider";
import { BannerAnalyticsDashboard } from "./BannerAnalyticsDashboard";
import { ABTestManager } from "./ABTestManager";
import { UserTargetingEditor } from "./UserTargetingEditor";
import { 
  TestTube, Target, BarChart3, Monitor, Smartphone, 
  Users, Globe, RefreshCw 
} from "lucide-react";

export const BannerTestPage = () => {
  const [userType, setUserType] = useState("pharmacy");
  const [deviceType, setDeviceType] = useState("desktop");
  const [userLocation, setUserLocation] = useState("US");
  const [testTargeting, setTestTargeting] = useState({
    target_user_types: ["all"],
    target_devices: ["all"],
    target_locations: [],
    target_time_start: null,
    target_time_end: null,
  });

  const userTypes = [
    { id: "pharmacy", label: "Pharmacy", icon: Users },
    { id: "hospital", label: "Hospital", icon: Users },
    { id: "group", label: "Group", icon: Users },
    { id: "admin", label: "Admin", icon: Users },
    { id: "guest", label: "Guest", icon: Users },
  ];

  const deviceTypes = [
    { id: "desktop", label: "Desktop", icon: Monitor },
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "tablet", label: "Tablet", icon: Monitor },
  ];

  const locations = [
    { id: "US", label: "🇺🇸 United States" },
    { id: "CA", label: "🇨🇦 Canada" },
    { id: "UK", label: "🇬🇧 United Kingdom" },
    { id: "AU", label: "🇦🇺 Australia" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Banner System Test Page</h1>
        <p className="text-muted-foreground">Test the enhanced banner management system with analytics, A/B testing, and user targeting</p>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">Banner Preview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="abtests">A/B Tests</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          {/* User Context Simulator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                User Context Simulator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">User Type</label>
                  <div className="space-y-2">
                    {userTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setUserType(type.id)}
                        className={`w-full p-2 text-left rounded border transition-colors ${
                          userType === type.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Device Type</label>
                  <div className="space-y-2">
                    {deviceTypes.map(device => (
                      <button
                        key={device.id}
                        onClick={() => setDeviceType(device.id)}
                        className={`w-full p-2 text-left rounded border transition-colors ${
                          deviceType === device.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <device.icon className="h-4 w-4" />
                          {device.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <div className="space-y-2">
                    {locations.map(location => (
                      <button
                        key={location.id}
                        onClick={() => setUserLocation(location.id)}
                        className={`w-full p-2 text-left rounded border transition-colors ${
                          userLocation === location.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {location.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Current Context:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">User: {userType}</Badge>
                  <Badge variant="outline">Device: {deviceType}</Badge>
                  <Badge variant="outline">Location: {userLocation}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banner Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Banner Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <BannerSlider
                bannerType="hero"
                userType={userType}
                deviceType={deviceType}
                userLocation={userLocation}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <BannerAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="abtests">
          <ABTestManager />
        </TabsContent>

        <TabsContent value="targeting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Targeting Configuration Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserTargetingEditor
                data={testTargeting}
                onChange={setTestTargeting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Banner System Simulator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Test Scenarios</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setUserType("pharmacy");
                        setDeviceType("mobile");
                        setUserLocation("US");
                      }}
                    >
                      📱 Mobile Pharmacy User (US)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setUserType("hospital");
                        setDeviceType("desktop");
                        setUserLocation("CA");
                      }}
                    >
                      🖥️ Desktop Hospital User (Canada)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setUserType("guest");
                        setDeviceType("tablet");
                        setUserLocation("UK");
                      }}
                    >
                      📱 Tablet Guest User (UK)
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">System Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Banner Targeting</span>
                      <Badge className="bg-green-100 text-green-800">✓ Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">Analytics Tracking</span>
                      <Badge className="bg-blue-100 text-blue-800">✓ Recording</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm">A/B Testing</span>
                      <Badge className="bg-purple-100 text-purple-800">✓ Ready</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">💡 Testing Tips</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Change user context to see different banners based on targeting rules</li>
                  <li>• Check analytics tab to see real-time tracking data</li>
                  <li>• Create A/B tests to compare banner performance</li>
                  <li>• Use targeting editor to configure audience segments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};