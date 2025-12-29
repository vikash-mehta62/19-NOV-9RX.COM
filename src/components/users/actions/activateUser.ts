
import { supabase } from "@/supabaseClient";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL || "https://9rx.mahitechnocrafts.in";

export const activateUser = async (userId: string, userName: string): Promise<boolean> => {
  try {
    // First check if user exists and get their details
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, status, email, first_name, company_name, email_notifaction')
      .eq('id', userId)
      .single();
    
    if (checkError) {
      console.error('Error checking user:', checkError);
      throw new Error('Failed to verify user status');
    }

    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.status === 'active') {
      throw new Error('User is already active');
    }

    const { error: activateError } = await supabase
      .from('profiles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (activateError) {
      console.error('Error activating user:', activateError);
      throw new Error('Failed to activate user. Please try again.');
    }

    // Send activation email if user has email_notifaction enabled
    if (existingUser.email_notifaction && existingUser.email) {
      const userDisplayName = existingUser.first_name || existingUser.company_name || userName;
      try {
        await axios.post(`${BASE_URL}/active`, {
          name: userDisplayName,
          email: existingUser.email,
          admin: true // true means account is active
        });
      } catch (emailError) {
        console.error('Error sending activation email:', emailError);
        // Don't fail the activation if email fails
      }
    }

    toast({
      title: "Success",
      description: `${userName} has been activated`,
    });
    
    return true;
  } catch (error) {
    console.error('Activation error:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
    return false;
  }
};
