
import { supabase } from "@/supabaseClient";
import { toast } from "@/hooks/use-toast";

export const deactivateUser = async (userId: string, userName: string): Promise<boolean> => {
  try {
    const { data: userToDeactivate, error: deactivateCheckError } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('id', userId)
      .single();
    
    if (deactivateCheckError) {
      console.error('Error checking user:', deactivateCheckError);
      throw new Error('Failed to verify user status');
    }

    if (!userToDeactivate) {
      throw new Error('User not found');
    }

    if (userToDeactivate.status === 'inactive') {
      throw new Error('User is already inactive');
    }

    const { error: deactivateError } = await supabase
      .from('profiles')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (deactivateError) {
      console.error('Error deactivating user:', deactivateError);
      throw new Error('Failed to deactivate user. Please try again.');
    }

    toast({
      title: "Success",
      description: `${userName} has been deactivated`,
    });
    
    return true;
  } catch (error) {
    console.error('Deactivation error:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
    return false;
  }
};
