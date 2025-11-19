
import { supabase } from "@/supabaseClient";
import { toast } from "@/hooks/use-toast";

export const activateUser = async (userId: string, userName: string): Promise<boolean> => {
  try {
    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, status')
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
