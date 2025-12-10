import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InvitationsList } from "@/components/group/InvitationsList";
import { InvitePharmacyDialog } from "@/components/group/InvitePharmacyDialog";
import { Button } from "@/components/ui/button";
import { Send, Mail } from "lucide-react";

const GroupInvitations = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInviteSent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout role="group">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Pharmacy Invitations
            </h1>
            <p className="text-muted-foreground mt-1">
              Invite pharmacies to join your group network
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Invite Pharmacy
          </Button>
        </div>

        {/* Invitations List */}
        <InvitationsList
          onInviteClick={() => setInviteDialogOpen(true)}
          refreshTrigger={refreshTrigger}
        />

        {/* Invite Dialog */}
        <InvitePharmacyDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInviteSent={handleInviteSent}
        />
      </div>
    </DashboardLayout>
  );
};

export default GroupInvitations;
