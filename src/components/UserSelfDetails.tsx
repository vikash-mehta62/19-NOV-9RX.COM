import { supabase } from "@/integrations/supabase/client";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EditUserModal } from "./users/EditUserModal";

function UserSelfDetails() {
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get("email");

  const [userData, setUserData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(true);
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userEmail) {
          console.error("❌ Validation Failed: userEmail is missing!");
          return;
        }

        console.log("🔍 Fetching profile for:", userEmail);

        const { data, error } = await supabase
          .from("profiles")
          .select()
          .eq("email", userEmail)
          .maybeSingle();

        if (error) {
          console.error("🚨 Supabase Fetch Error:", error);
          return;
        }

        if (!data) {
          console.warn("⚠️ No user found for this email.");
          return;
        }

        console.log("✅ User Data:", data);
        setUserData(data); // ✅ User data state update
      } catch (err) {
        console.error("🔥 Unexpected Error:", err);
      }
    };

    fetchUserProfile();
  }, [userEmail]);


  useEffect(() => {
    if (!editModalOpen) {
      navigate("/login");
    }
  }, [editModalOpen, navigate]);



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
          onUserUpdated={() => console.log("object")}
          self={true}
        />
      )}
    </div>
  );
}

export default UserSelfDetails;
