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

  // Check for valid Supabase session from magic-link flow OR direct signup flow
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First, let Supabase process the hash fragment
        // This is important for magic links
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("🔍 Checking authentication method:", { 
          hasSession: !!session,
          sessionUser: session?.user?.email,
          sessionError: sessionError?.message,
          urlHash: window.location.hash,
          hashLength: window.location.hash.length
        });

        if (session?.user) {
          console.log("✅ Active Supabase session detected");
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
            
            // Fallback: Try to get user data directly from profiles table
            try {
              const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single();
              
              if (profileError) throw profileError;
              
              if (profile) {
                setUserData(profile);
                setEditModalOpen(true);
                console.log("✅ Profile loaded directly from database");
              } else {
                throw new Error("Profile not found");
              }
            } catch (fallbackErr) {
              console.error("❌ Fallback profile fetch failed:", fallbackErr);
              setError("Failed to load your profile. Please try again.");
            }
          }
        } else {
          console.log("❌ No authentication method found");
          
          // Check if there's a hash but no session - might need manual token exchange
          if (window.location.hash && window.location.hash.includes('access_token')) {
            console.log("🔄 Hash detected but no session, attempting manual token exchange...");
            
            try {
              // Extract tokens from hash
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              
              if (accessToken) {
                // Set session manually
                const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                });
                
                if (setSessionError) throw setSessionError;
                
                if (sessionData.session?.user) {
                  console.log("✅ Session set manually from hash");
                  setSession(sessionData.session);
                  
                  // Try to get profile
                  const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", sessionData.session.user.id)
                    .single();
                  
                  if (profile && !profileError) {
                    setUserData(profile);
                    setEditModalOpen(true);
                    console.log("✅ Profile loaded after manual session set");
                  } else {
                    throw new Error("Profile not found");
                  }
                } else {
                  throw new Error("Failed to set session from tokens");
                }
              } else {
                throw new Error("No access token in hash");
              }
            } catch (manualErr) {
              console.error("❌ Manual token exchange failed:", manualErr);
              setError("Session expired or invalid. Please login to complete your profile.");
            }
          } else {
            setError("Session expired or invalid. Please login to complete your profile.");
          }
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
      // Sign out the user when modal closes (cancel button)
      const signOutUser = async () => {
        try {
          await supabase.auth.signOut();
          // Clear both storages
          window.localStorage.clear();
          window.sessionStorage.clear();
          console.log("✅ User signed out after canceling profile completion");
        } catch (err) {
          console.error("❌ Error signing out:", err);
        }
        navigate("/login");
      };
      signOutUser();
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            If you just signed up, please login with your credentials to complete your profile.
          </p>
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
            
            // Sign out after profile completion
            const signOutAndRedirect = async () => {
              try {
                await supabase.auth.signOut();
                // Clear localStorage after successful profile completion
                window.localStorage.clear();
                window.sessionStorage.clear();
                console.log("✅ User signed out after profile completion");
              } catch (err) {
                console.error("❌ Error signing out:", err);
              }
              
              toast({
                title: "Success",
                description: "Your profile has been completed! Please login to continue.",
              });
              
              // Navigate to login after successful profile completion
              setTimeout(() => {
                navigate("/login");
              }, 1500);
            };
            
            signOutAndRedirect();
          }}
          self={true}
          isProfileCompletion={!!session} // TRUE if magic link session exists, FALSE if logged-in user
        />
      )}
    </div>
  );
}

export default UserSelfDetails;
