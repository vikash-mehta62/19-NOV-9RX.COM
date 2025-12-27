import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Target, Users, Smartphone, Monitor, Tablet, MapPin, Clock,
  Plus, X, Globe, Building, Hospital, Store
} from "lucide-react";

interface UserTargetingData {
  target_user_types: string[];
  target_devices: string[];
  target_locations: string[];
  target_time_start: string | null;
  target_time_end: string | null;
}

interface UserTargetingEditorProps {
  data: UserTargetingData;
  onChange: (data: UserTargetingData) => void;
}

const USER_TYPES = [
  { id: 'all', label: 'All Users', icon: Users, description: 'Show to everyone' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Store, description: 'Pharmacy customers' },
  { id: 'hospital', label: 'Hospital', icon: Hospital, description: 'Hospital staff' },
  { id: 'group', label: 'Group', icon: Building, description: 'Group buyers' },
  { id: 'admin', label: 'Admin', icon: Users, description: 'Admin users' },
];

const DEVICE_TYPES = [
  { id: 'all', label: 'All Devices', icon: Globe, description: 'Show on all devices' },
  { id: 'desktop', label: 'Desktop', icon: Monitor, description: 'Desktop computers' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, description: 'Mobile phones' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, description: 'Tablet devices' },
];

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
];

export const UserTargetingEditor = ({ data, onChange }: UserTargetingEditorProps) => {
  const [newLocation, setNewLocation] = useState("");

  const updateTargeting = (field: keyof UserTargetingData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const toggleUserType = (userType: string) => {
    if (userType === 'all') {
      updateTargeting('target_user_types', ['all']);
      return;
    }

    let newTypes = [...data.target_user_types];
    
    // Remove 'all' if selecting specific types
    newTypes = newTypes.filter(t => t !== 'all');
    
    if (newTypes.includes(userType)) {
      newTypes = newTypes.filter(t => t !== userType);
    } else {
      newTypes.push(userType);
    }
    
    // If no specific types selected, default to 'all'
    if (newTypes.length === 0) {
      newTypes = ['all'];
    }
    
    updateTargeting('target_user_types', newTypes);
  };

  const toggleDeviceType = (deviceType: string) => {
    if (deviceType === 'all') {
      updateTargeting('target_devices', ['all']);
      return;
    }

    let newDevices = [...data.target_devices];
    
    // Remove 'all' if selecting specific devices
    newDevices = newDevices.filter(d => d !== 'all');
    
    if (newDevices.includes(deviceType)) {
      newDevices = newDevices.filter(d => d !== deviceType);
    } else {
      newDevices.push(deviceType);
    }
    
    // If no specific devices selected, default to 'all'
    if (newDevices.length === 0) {
      newDevices = ['all'];
    }
    
    updateTargeting('target_devices', newDevices);
  };

  const addLocation = (countryCode: string) => {
    if (!data.target_locations.includes(countryCode)) {
      updateTargeting('target_locations', [...data.target_locations, countryCode]);
    }
  };

  const removeLocation = (countryCode: string) => {
    updateTargeting('target_locations', data.target_locations.filter(l => l !== countryCode));
  };

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? `${country.flag} ${country.name}` : code;
  };

  const isUserTypeSelected = (userType: string) => {
    return data.target_user_types.includes(userType);
  };

  const isDeviceTypeSelected = (deviceType: string) => {
    return data.target_devices.includes(deviceType);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          User Targeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Types */}
        <div>
          <Label className="text-base font-medium mb-3 block">Target Audience</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {USER_TYPES.map((userType) => {
              const Icon = userType.icon;
              const isSelected = isUserTypeSelected(userType.id);
              
              return (
                <button
                  key={userType.id}
                  onClick={() => toggleUserType(userType.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 text-purple-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className="font-medium text-sm">{userType.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{userType.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.target_user_types.map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {USER_TYPES.find(ut => ut.id === type)?.label || type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Device Types */}
        <div>
          <Label className="text-base font-medium mb-3 block">Target Devices</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEVICE_TYPES.map((deviceType) => {
              const Icon = deviceType.icon;
              const isSelected = isDeviceTypeSelected(deviceType.id);
              
              return (
                <button
                  key={deviceType.id}
                  onClick={() => toggleDeviceType(deviceType.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className="font-medium text-sm">{deviceType.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{deviceType.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.target_devices.map(device => (
              <Badge key={device} variant="secondary" className="text-xs">
                {DEVICE_TYPES.find(dt => dt.id === device)?.label || device}
              </Badge>
            ))}
          </div>
        </div>

        {/* Geographic Targeting */}
        <div>
          <Label className="text-base font-medium mb-3 block">Geographic Targeting (Optional)</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Country
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <Label>Select Country</Label>
                    <div className="grid gap-1 max-h-48 overflow-y-auto">
                      {COUNTRIES.map(country => (
                        <button
                          key={country.code}
                          onClick={() => addLocation(country.code)}
                          disabled={data.target_locations.includes(country.code)}
                          className="flex items-center gap-2 p-2 text-left hover:bg-muted rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {data.target_locations.length === 0 && (
                <span className="text-sm text-muted-foreground">Show to all countries</span>
              )}
            </div>
            
            {data.target_locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.target_locations.map(location => (
                  <Badge key={location} variant="outline" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getCountryName(location)}
                    <button
                      onClick={() => removeLocation(location)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Time-based Targeting */}
        <div>
          <Label className="text-base font-medium mb-3 block">Time-based Targeting (Optional)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="text-sm">Show From</Label>
              <Input
                id="start_time"
                type="time"
                value={data.target_time_start || ""}
                onChange={(e) => updateTargeting('target_time_start', e.target.value || null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end_time" className="text-sm">Show Until</Label>
              <Input
                id="end_time"
                type="time"
                value={data.target_time_end || ""}
                onChange={(e) => updateTargeting('target_time_end', e.target.value || null)}
                className="mt-1"
              />
            </div>
          </div>
          {(data.target_time_start || data.target_time_end) && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Clock className="h-4 w-4" />
                <span>
                  Banner will show {data.target_time_start ? `from ${data.target_time_start}` : 'all day'} 
                  {data.target_time_end ? ` until ${data.target_time_end}` : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Targeting Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Targeting Summary
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong>Audience:</strong> {
                data.target_user_types.includes('all') 
                  ? 'All users' 
                  : data.target_user_types.map(t => USER_TYPES.find(ut => ut.id === t)?.label).join(', ')
              }
            </p>
            <p>
              <strong>Devices:</strong> {
                data.target_devices.includes('all') 
                  ? 'All devices' 
                  : data.target_devices.map(d => DEVICE_TYPES.find(dt => dt.id === d)?.label).join(', ')
              }
            </p>
            <p>
              <strong>Location:</strong> {
                data.target_locations.length === 0 
                  ? 'Worldwide' 
                  : data.target_locations.map(getCountryName).join(', ')
              }
            </p>
            <p>
              <strong>Time:</strong> {
                (!data.target_time_start && !data.target_time_end) 
                  ? 'Always' 
                  : `${data.target_time_start || '00:00'} - ${data.target_time_end || '23:59'}`
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};