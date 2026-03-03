import { supabase } from "@/integrations/supabase/client";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditUserModal } from "./users/EditUserModal";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import axios from "../../axiosconfig";

function UserSelfDetails() {
  const { toast } = useToast();

  const [userData, setUserData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  // Check for valid Supabase session from magic-link flow.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("🔍 Checking authentication method:", { 
          hasSession: !!session,
          sessionUser: session?.user?.email,
          sessionError: sessionError?.message
        });

        if (session?.user) {
          console.log("✅ Active Supabase session detected (magic link flow)");
          setSession(session);
          
          // Verify session with backend and get user info
          try {
            const response = await axios.get("/api/profile/verify-completion-session", {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
            
            if (response.data.success) {
              setUserData(response.data.user);
              setEditModalOpen(true);
              console.log("✅ Valid session found for:", response.data.user.email);
            } else {
              throw new Error(response.data.message || "Failed to verify session");
            }
          } catch (err) {
            console.error("❌ Session verification failed:", err);
            setError("Failed to verify your session. Please try again.");
          }
        } else {
          console.log("❌ No authentication method found");
          setError("Session expired or invalid. Please use the latest link from your email.");
        }
      } catch (err) {
        console.error("❌ Error in authentication:", err);
        setError(err.response?.data?.message || err.message || "Failed to verify access");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Close modal handler
  useEffect(() => {
    if (!editModalOpen && userData) {
      navigate("/login");
    }
  }, [editModalOpen, navigate, userData]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 UserSelfDetails Render:', {
      hasSession: !!session,
      isProfileCompletion: !!session,
      userData: userData?.email
    });
  }, [session, userData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying your link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Expired or Invalid</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Success - show modal
  return (
    <div>
      {userData && (
        <EditUserModal
          user={{
            id: userData.id,
            name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || "N/A",
            email: userData.email,
            type: userData.type || "pharmacy",
            status: userData.status || "pending",
          }}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onUserUpdated={() => {
            console.log("Profile updated successfully");
            toast({
              title: "Success",
              description: "Your profile has been updated successfully!",
            });
          }}
          self={true}
          isProfileCompletion={!!session} // TRUE if magic link session exists, FALSE if logged-in user
        />
      )}
    </div>
  );
}

export default UserSelfDetails;
