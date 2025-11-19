import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import axios from '../../axiosconfig'

function ActivationUser() {
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get("email");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userEmail) {
        console.log(userEmail)
      fetchUserData(userEmail);
    }
  }, [userEmail]);

  const fetchUserData = async (email) => {
    try {
        const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, email, mobile_phone, type, company_name, display_name ,billing_address, email_notifaction "
        )
        .eq("email", email)
        .single(); // Fetch only one record for simplicity

      if (error) {
        console.error("Failed to fetch customer information:", error);
        throw new Error(
          "Failed to fetch customer information: " + error.message
        );
      }


      if(data.email_notifaction){
          const response = await axios.post("/active", {
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
          });
      }
        
       

      async function sendResetPasswordLink(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      
        if (error) {
          console.error('Error sending reset password email:', error.message);
        } else {
          console.log('Password reset email sent successfully!', data);
        }
      }
      // sendResetPasswordLink(email)

      if (!data ) {
        throw new Error("No customer information found.");
      }
      console.log("Data",data);

  
      setUserData(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-green-500" size={40} />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      ) : userData ? (
        <>
          <h2 className="text-2xl font-bold text-green-700 mb-4">Your Email is Confirmed ✅</h2>
          <p className="text-gray-600 mb-2">
            Welcome, <strong className="text-green-700">{userData.first_name} {userData.last_name}</strong>
          </p>
          <p className="text-gray-600 mb-6">
            Email: <strong className="text-green-700">{userData.email}</strong>
          </p>
  
          {/* Update Profile Button */}
          <Link
            to={`/update-profile?email=${userData.email}`} 
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 transition duration-300"
          >
            Update Profile
          </Link>
        </>
      ) : (
        <p className="text-red-500">Error: User data not found!</p>
      )}
    </div>
  </div>
  
  
  );
}

export default ActivationUser;
