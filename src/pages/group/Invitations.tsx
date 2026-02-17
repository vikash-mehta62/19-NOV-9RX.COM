import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InvitationsList } from "@/components/group/InvitationsList";
import { InvitePharmacyDialog } from "@/components/group/InvitePharmacyDialog";
import { Button } from "@/components/ui/button";
import { Send, Mail, UserPlus } from "lucide-react";

const GroupInvitations = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInviteSent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout role="group">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-screen-2xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pharmacy Invitations</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Invite pharmacies to join your group network
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setInviteDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
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
