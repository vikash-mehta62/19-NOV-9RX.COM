import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function ActivationUser() {
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSessionEmail(data?.session?.user?.email || null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader className="animate-spin text-blue-500" size={40} />
            <p className="text-gray-600">Verifying your session...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Email Confirmation Complete</h2>
            <p className="text-gray-600 mb-2">
              {sessionEmail
                ? `Signed in as ${sessionEmail}`
                : "Your email confirmation is complete. Please continue to login."}
            </p>
            <Link
              to="/login"
              className="inline-block mt-4 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 transition duration-300"
            >
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivationUser;
