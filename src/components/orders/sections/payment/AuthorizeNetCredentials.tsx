import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface AuthorizeNetCredentialsProps {
  apiCredentials: {
    apiLoginId: string;
    transactionKey: string;
    testMode: boolean;
  };
  onCredentialsChange: (field: 'apiLoginId' | 'transactionKey' | 'testMode', value: string | boolean) => void;
}

export function AuthorizeNetCredentials({ apiCredentials, onCredentialsChange }: AuthorizeNetCredentialsProps) {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
      <h3 className="font-medium">Authorize.Net Credentials</h3>
      <div className="space-y-2">
        <FormItem>
          <FormLabel>API Login ID</FormLabel>
          <FormControl>
            <Input
              type="password"
              value={apiCredentials.apiLoginId}
              onChange={(e) => onCredentialsChange('apiLoginId', e.target.value)}
              placeholder="Enter your Authorize.Net API Login ID"
            />
          </FormControl>
        </FormItem>
        <FormItem>
          <FormLabel>Transaction Key</FormLabel>
          <FormControl>
            <Input
              type="password"
              value={apiCredentials.transactionKey}
              onChange={(e) => onCredentialsChange('transactionKey', e.target.value)}
              placeholder="Enter your Authorize.Net Transaction Key"
            />
          </FormControl>
        </FormItem>
        <FormItem className="flex flex-row items-center justify-between space-x-2">
          <FormLabel>Test Mode</FormLabel>
          <FormControl>
            <Switch
              checked={apiCredentials.testMode}
              onCheckedChange={(checked) => onCredentialsChange('testMode', checked)}
            />
          </FormControl>
        </FormItem>
      </div>
    </div>
  );
}