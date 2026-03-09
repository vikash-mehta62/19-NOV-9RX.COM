import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import LoginHistory from "@/components/security/LoginHistory";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginHistoryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold">Login History</h1>
        <p className="text-muted-foreground mt-2">
          View your recent login activity and security information
        </p>
      </div>

      <LoginHistory />
    </div>
  );
}
