import { supabase } from "@/integrations/supabase/client";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EditUserModal } from "./users/EditUserModal";
import { useToast } from "@/hooks/use-toast";

function UserSelfDetails() {
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get("email");
  const { toast } = useToast();

  const [userData, setUserData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate(); 

  // Directly fetch profile without authentication check
  useEffect(() => {
    if (userEmail) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Email parameter is missing",
        variant: "destructive",
      });
    }
  }, [userEmail]);

  const fetchUserProfile = async () => {
    try {
      console.log("🔍 Fetching profile for:", userEmail);

      const { data, error } = await supabase
        .from("profiles")
        .select()
        .eq("email", userEmail)
        .maybeSingle();

      if (error) {
        console.error("🚨 Supabase Fetch Error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user profile",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!data) {
        console.warn("⚠️ No user found for this email.");
        toast({
          title: "User Not Found",
          description: "No user found with this email address",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log("✅ User Data:", data);
      setUserData(data);
      setEditModalOpen(true);
      setIsLoading(false);
    } catch (err) {
      console.error("🔥 Unexpected Error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!editModalOpen && userData) {
      navigate("/login");
    }
  }, [editModalOpen, navigate, userData]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error if no user data
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load profile. Please check the link and try again.</p>
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

  return (
    <div>
      {userData && (
        <EditUserModal
          user={{
            id: userData.id,
            name: userData.name || "N/A",
            email: userData.email,
            type: userData.type || "user",
            status: userData.status || "pending",
          }}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onUserUpdated={() => console.log("Profile updated successfully")}
          self={true}
        />
      )}
    </div>
  );
}

export default UserSelfDetails;
