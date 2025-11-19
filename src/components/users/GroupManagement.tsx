import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupMessaging } from "./communication/GroupMessaging";
import { DocumentSharing } from "./documents/DocumentSharing";
import { AdvancedPermissions } from "./permissions/AdvancedPermissions";
import { Card } from "@/components/ui/card";

interface GroupManagementProps {
  groupId: string;
}

export function GroupManagement({ groupId }: GroupManagementProps) {
  return (
    <Card className="p-6">
      <Tabs defaultValue="messaging" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="messaging">Communication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="permissions">Access Control</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messaging" className="mt-4">
          <GroupMessaging groupId={groupId} />
        </TabsContent>
        
        <TabsContent value="documents" className="mt-4">
          <DocumentSharing groupId={groupId} />
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-4">
          <AdvancedPermissions groupId={groupId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}